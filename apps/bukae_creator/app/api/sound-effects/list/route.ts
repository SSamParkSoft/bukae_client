import { NextResponse } from 'next/server'
import {
  soundEffectsMetadata,
  getSoundEffectPath,
  getSoundEffectsByCategory,
  type SoundEffectMetadata,
} from '@/lib/data/sound-effects'

export const dynamic = 'force-dynamic'

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
 * JSON 메타데이터를 기반으로 효과음 목록을 반환합니다.
 * 파일 경로 형식: {category.en}/{key}.mp3
 */
export async function GET() {
  try {
    // JSON 메타데이터를 기반으로 효과음 파일 목록 생성
    const soundEffects: SoundEffectFile[] = soundEffectsMetadata.map((meta) => {
      const path = getSoundEffectPath(meta)
      return {
        path,
        name: `${meta.key}.mp3`,
        folder: meta.category.ko, // 한글 카테고리명을 폴더로 사용 (표시용)
        label: meta.label,
        category: meta.category,
      }
    })

    // 카테고리별로 그룹화
    const groupedByCategory = getSoundEffectsByCategory()
    const groupedByFolder: Record<string, SoundEffectFile[]> = {}

    Object.keys(groupedByCategory).forEach((categoryKo) => {
      groupedByFolder[categoryKo] = groupedByCategory[categoryKo].map((meta) => {
        const path = getSoundEffectPath(meta)
        return {
          path,
          name: `${meta.key}.mp3`,
          folder: categoryKo,
          label: meta.label,
          category: meta.category,
        }
      })
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
