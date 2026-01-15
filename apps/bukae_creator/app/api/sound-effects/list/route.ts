import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/api/supabase-server'
import {
  soundEffectsMetadata,
  getSoundEffectPath,
} from '@/lib/data/sound-effects'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000
const BUCKET = 'soundeffect'

interface SoundEffectFile {
  path: string
  name: string
  folder: string
  label: string
  category: {
    en: string
    ko: string
  }
}

/**
 * 실제 Supabase Storage에서 파일 목록을 가져와서 JSON 메타데이터와 매칭합니다.
 * 실제 존재하는 파일만 반환합니다.
 */
export async function GET() {
  try {
    const supabase = getSupabaseServiceClient()
    // 실제 파일 정보 저장: {categoryEn}/{key} -> { path: 실제경로, name: 파일명 }
    const actualFilesMap = new Map<string, { path: string; name: string }>()
    const queue: string[] = [''] // 빈 문자열은 루트 폴더를 의미

    // BFS 방식으로 모든 폴더와 파일 탐색
    while (queue.length > 0) {
      const currentPrefix = queue.shift()!

      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await supabase.storage.from(BUCKET).list(currentPrefix, {
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        })

        if (error) {
          console.error('[sound-effects list] 목록 조회 실패:', error)
          // 에러가 발생해도 계속 진행 (일부 폴더만 실패할 수 있음)
          break
        }

        if (!data || data.length === 0) break

        for (const item of data) {
          const itemPath = currentPrefix ? `${currentPrefix}/${item.name}` : item.name
          
          // 폴더인 경우 (metadata가 null)
          if (item.metadata === null) {
            queue.push(itemPath)
          } else {
            // 파일인 경우 - 확장자 제거한 key로 매핑
            const parts = itemPath.split('/')
            if (parts.length === 2) {
              const [categoryEn, filename] = parts
              const key = filename.replace(/\.(mp3|wav|m4a|ogg)$/i, '') // 확장자 제거
              const mapKey = `${categoryEn}/${key}`
              actualFilesMap.set(mapKey, {
                path: itemPath,
                name: filename,
              })
            }
          }
        }

        if (data.length < PAGE_SIZE) break
      }
    }

    // JSON 메타데이터와 실제 파일을 매칭
    const matchedEffects: SoundEffectFile[] = []
    
    soundEffectsMetadata.forEach((meta) => {
      const mapKey = `${meta.category.en}/${meta.key}`
      const actualFile = actualFilesMap.get(mapKey)
      
      // 실제 파일이 존재하는지 확인
      if (actualFile) {
        matchedEffects.push({
          path: actualFile.path, // 실제 파일 경로 사용 (확장자 포함)
          name: actualFile.name, // 실제 파일명 사용
          folder: meta.category.ko,
          label: meta.label,
          category: meta.category,
        })
      } else {
        // 파일이 없으면 로그만 남기고 건너뜀
        console.warn(`[sound-effects list] 파일이 존재하지 않음: ${mapKey}`)
      }
    })

    // 카테고리별로 그룹화
    const groupedByFolder: Record<string, SoundEffectFile[]> = {}
    
    matchedEffects.forEach((effect) => {
      const folder = effect.folder
      if (!groupedByFolder[folder]) {
        groupedByFolder[folder] = []
      }
      groupedByFolder[folder].push(effect)
    })

    // 폴더 이름으로 정렬
    const sortedFolders = Object.keys(groupedByFolder).sort((a, b) => {
      return a.localeCompare(b, 'ko')
    })

    return NextResponse.json({
      success: true,
      folders: sortedFolders,
      soundEffects: groupedByFolder,
    })
  } catch (error) {
    console.error('[sound-effects list] 처리 중 오류:', error)
    return NextResponse.json(
      { error: '효과음 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
