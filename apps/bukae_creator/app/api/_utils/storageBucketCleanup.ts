import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/api/supabase-server'

const PAGE_SIZE = 1000

type StorageItem = {
  name: string
  id?: string | null
  updated_at?: string
  created_at?: string
  last_accessed_at?: string
  metadata?: Record<string, unknown> | null
}

const isFolder = (item: StorageItem) => item.metadata === null

const getTimestamp = (item: StorageItem) => {
  const candidate = item.created_at || item.updated_at || item.last_accessed_at
  return candidate ? new Date(candidate).getTime() : Date.now()
}

async function listAllFiles(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  bucket: string,
  prefix: string,
) {
  const files: { path: string; createdAtMs: number }[] = []
  const queue: string[] = [prefix]

  while (queue.length > 0) {
    const currentPrefix = queue.pop()!

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.storage.from(bucket).list(currentPrefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'created_at', order: 'asc' },
      })

      if (error) {
        return { error }
      }

      if (!data || data.length === 0) break

      for (const item of data as StorageItem[]) {
        if (isFolder(item)) {
          const nextPrefix = currentPrefix ? `${currentPrefix}/${item.name}` : item.name
          queue.push(nextPrefix)
        } else {
          const path = currentPrefix ? `${currentPrefix}/${item.name}` : item.name
          files.push({
            path,
            createdAtMs: getTimestamp(item),
          })
        }
      }

      if (data.length < PAGE_SIZE) break
    }
  }

  return { files }
}

function chunk<T>(arr: T[], size: number) {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

interface StorageBucketCleanupOptions {
  request: Request
  bucket: string
  rootPrefix: string
  retentionHours: number
  cleanupSecret: string | undefined
  cleanupSecretEnvKey: string
  logPrefix: string
}

export async function handleStorageBucketCleanup({
  request,
  bucket,
  rootPrefix,
  retentionHours,
  cleanupSecret,
  cleanupSecretEnvKey,
  logPrefix,
}: StorageBucketCleanupOptions) {
  try {
    if (!cleanupSecret) {
      console.error(`[${logPrefix}] ${cleanupSecretEnvKey} is not set`)
      return NextResponse.json({ error: 'cleanup secret not configured' }, { status: 500 })
    }

    const incomingSecret = request.headers.get('x-admin-secret')
    if (incomingSecret !== cleanupSecret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseServiceClient()
    const { files, error } = await listAllFiles(supabase, bucket, rootPrefix)

    if (error) {
      console.error(`[${logPrefix}] list error:`, error)
      return NextResponse.json({ error: '파일 목록 조회 실패' }, { status: 500 })
    }

    const now = Date.now()
    const retentionMs = retentionHours * 60 * 60 * 1000
    const expired = (files || []).filter((file) => now - file.createdAtMs >= retentionMs)

    if (expired.length === 0) {
      return NextResponse.json({ success: true, scanned: files?.length ?? 0, deleted: 0 })
    }

    let deleted = 0
    for (const batch of chunk(expired, 100)) {
      const paths = batch.map((f) => f.path)
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths)
      if (removeError) {
        console.error(`[${logPrefix}] remove error:`, removeError, 'paths:', paths)
        return NextResponse.json({ error: '파일 삭제 중 오류가 발생했습니다.' }, { status: 500 })
      }
      deleted += batch.length
    }

    return NextResponse.json({
      success: true,
      scanned: files?.length ?? 0,
      deleted,
      retentionHours: retentionHours,
    })
  } catch (error) {
    console.error(`[${logPrefix}] unexpected error:`, error)
    return NextResponse.json({ error: '정리 작업 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

