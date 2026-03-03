import { NextResponse } from 'next/server'
import { handleStorageBucketCleanup } from '@/app/api/_utils/storageBucketCleanup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CLEANUP_SECRET = process.env.ADMIN_PRO_UPLOAD_CLEANUP_SECRET
const BUCKET = 'pro_upload'
const ROOT_PREFIX = ''
const RETENTION_HOURS = 1

export async function POST(request: Request) {
  return handleStorageBucketCleanup({
    request,
    bucket: BUCKET,
    rootPrefix: ROOT_PREFIX,
    retentionHours: RETENTION_HOURS,
    cleanupSecret: CLEANUP_SECRET,
    cleanupSecretEnvKey: 'ADMIN_PRO_UPLOAD_CLEANUP_SECRET',
    logPrefix: 'pro_upload cleanup',
  })
}

