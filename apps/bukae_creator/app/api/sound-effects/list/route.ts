import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/api/supabase-server'
import {
  soundEffectsMetadata,
  getSoundEffectPath,
  getSoundEffectsByCategory,
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
    const supabase = getSupabaseServiceClient()
    
    // 먼저 메타데이터에서 카테고리 목록 가져오기 (빠름)
    const metadataByCategory = getSoundEffectsByCategory()
    const allCategories = Object.keys(metadataByCategory).sort((a, b) => a.localeCompare(b, 'ko'))
    
    // limit이 있으면 필요한 카테고리만 추출
    let targetCategories: string[] = allCategories
    if (limit !== undefined) {
      const endIndex = Math.min(offset + limit, allCategories.length)
      targetCategories = allCategories.slice(offset, endIndex)
    }
    
    // 실제 파일 정보 저장: {categoryEn}/{key} -> { path: 실제경로, name: 파일명 }
    const actualFilesMap = new Map<string, { path: string; name: string }>()
    
    // 필요한 카테고리의 폴더만 스캔 (최적화)
    const categoriesToScan = new Set<string>()
    targetCategories.forEach((categoryKo) => {
      const metadataList = metadataByCategory[categoryKo]
      if (metadataList && metadataList.length > 0) {
        // 첫 번째 메타데이터에서 카테고리 영어명 가져오기
        categoriesToScan.add(metadataList[0].category.en)
      }
    })
    
    // 필요한 카테고리 폴더만 병렬로 스캔
    const scanPromises = Array.from(categoriesToScan).map(async (categoryEn) => {
      try {
        const { data, error } = await supabase.storage.from(BUCKET).list(categoryEn, {
          limit: PAGE_SIZE,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        })

        if (error) {
          console.error(`[sound-effects list] 카테고리 ${categoryEn} 목록 조회 실패:`, error)
          return
        }

        if (!data) return

        for (const item of data) {
          // 파일인 경우만 처리 (폴더는 무시)
          if (item.metadata !== null) {
            const filename = item.name
            const key = filename.replace(/\.(mp3|wav|m4a|ogg)$/i, '') // 확장자 제거
            const mapKey = `${categoryEn}/${key}`
            actualFilesMap.set(mapKey, {
              path: `${categoryEn}/${filename}`,
              name: filename,
            })
          }
        }
      } catch (err) {
        console.error(`[sound-effects list] 카테고리 ${categoryEn} 스캔 오류:`, err)
      }
    })
    
    // 모든 카테고리 스캔 완료 대기
    await Promise.all(scanPromises)

    // 타겟 카테고리의 메타데이터만 필터링하여 실제 파일과 매칭
    const matchedEffects: SoundEffectFile[] = []
    const targetCategorySet = new Set(targetCategories)
    
    soundEffectsMetadata.forEach((meta) => {
      // 타겟 카테고리에 포함된 것만 처리
      if (!targetCategorySet.has(meta.category.ko)) {
        return
      }
      
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

    // 타겟 카테고리 순서 유지 (이미 정렬됨)
    const finalFolders = targetCategories.filter(folder => groupedByFolder[folder] && groupedByFolder[folder].length > 0)
    const finalSoundEffects: Record<string, SoundEffectFile[]> = {}
    
    finalFolders.forEach((folder) => {
      if (groupedByFolder[folder]) {
        finalSoundEffects[folder] = groupedByFolder[folder]
      }
    })

    return NextResponse.json({
      success: true,
      folders: finalFolders,
      soundEffects: finalSoundEffects,
      totalFolders: allCategories.length, // 전체 카테고리 개수
      hasMore: limit !== undefined ? offset + (finalFolders.length) < allCategories.length : false,
    })
  } catch (error) {
    console.error('[sound-effects list] 처리 중 오류:', error)
    return NextResponse.json(
      { error: '효과음 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
