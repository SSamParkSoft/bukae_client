import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import {
  soundEffectsMetadata,
  getSoundEffectsByCategory,
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
 * public/soundeffects/ 폴더에서 파일 목록을 읽어 JSON 메타데이터와 매칭합니다.
 *
 * 쿼리 파라미터:
 * - limit: 반환할 카테고리 개수 (선택사항, 기본값: 모든 카테고리)
 * - offset: 시작 카테고리 인덱스 (선택사항, 기본값: 0)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get('limit')
  const offsetParam = searchParams.get('offset')
  const limit = limitParam ? parseInt(limitParam, 10) : undefined
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  try {
    const soundeffectsDir = path.join(process.cwd(), 'public', 'soundeffects')

    const metadataByCategory = getSoundEffectsByCategory()
    const allCategories = Object.keys(metadataByCategory).sort((a, b) => a.localeCompare(b, 'ko'))

    let targetCategories: string[] = allCategories
    if (limit !== undefined) {
      const endIndex = Math.min(offset + limit, allCategories.length)
      targetCategories = allCategories.slice(offset, endIndex)
    }

    // 실제 파일 정보 저장: {categoryEn}/{key(확장자 제거)} -> { path, name }
    const actualFilesMap = new Map<string, { path: string; name: string }>()

    const categoriesToScan = new Set<string>()
    targetCategories.forEach((categoryKo) => {
      const metadataList = metadataByCategory[categoryKo]
      if (metadataList && metadataList.length > 0) {
        categoriesToScan.add(metadataList[0].category.en)
      }
    })

    for (const categoryEn of categoriesToScan) {
      const categoryDir = path.join(soundeffectsDir, categoryEn)
      try {
        const files = fs.readdirSync(categoryDir)
        for (const filename of files) {
          const key = filename.replace(/\.(mp3|wav|m4a|ogg)$/i, '')
          actualFilesMap.set(`${categoryEn}/${key}`, {
            path: `${categoryEn}/${filename}`,
            name: filename,
          })
        }
      } catch {
        console.warn(`[sound-effects list] 폴더 없음: ${categoryDir}`)
      }
    }

    const matchedEffects: SoundEffectFile[] = []
    const targetCategorySet = new Set(targetCategories)

    soundEffectsMetadata.forEach((meta) => {
      if (!targetCategorySet.has(meta.category.ko)) return

      const mapKey = `${meta.category.en}/${meta.key}`
      const actualFile = actualFilesMap.get(mapKey)

      if (actualFile) {
        matchedEffects.push({
          path: actualFile.path,
          name: actualFile.name,
          folder: meta.category.ko,
          label: meta.label,
          category: meta.category,
        })
      } else {
        console.warn(`[sound-effects list] 파일이 존재하지 않음: ${mapKey}`)
      }
    })

    const groupedByFolder: Record<string, SoundEffectFile[]> = {}
    matchedEffects.forEach((effect) => {
      if (!groupedByFolder[effect.folder]) groupedByFolder[effect.folder] = []
      groupedByFolder[effect.folder].push(effect)
    })

    const finalFolders = targetCategories.filter(
      (folder) => groupedByFolder[folder] && groupedByFolder[folder].length > 0,
    )
    const finalSoundEffects: Record<string, SoundEffectFile[]> = {}
    finalFolders.forEach((folder) => {
      if (groupedByFolder[folder]) finalSoundEffects[folder] = groupedByFolder[folder]
    })

    return NextResponse.json({
      success: true,
      folders: finalFolders,
      soundEffects: finalSoundEffects,
      totalFolders: allCategories.length,
      hasMore: limit !== undefined ? offset + finalFolders.length < allCategories.length : false,
    })
  } catch (error) {
    console.error('[sound-effects list] 처리 중 오류:', error)
    return NextResponse.json(
      { error: '효과음 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
