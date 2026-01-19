import { useState, useEffect, useCallback } from 'react'

export interface SoundEffectFile {
  path: string
  name: string
  folder: string
  label: string
  category: {
    en: string
    ko: string
  }
}

export interface SoundEffectsData {
  folders: string[]
  soundEffects: Record<string, SoundEffectFile[]>
}

const INITIAL_CATEGORIES_COUNT = 4 // 처음에 로드할 카테고리 개수

export function useSoundEffects() {
  const [data, setData] = useState<SoundEffectsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleCategoriesCount, setVisibleCategoriesCount] = useState(INITIAL_CATEGORIES_COUNT)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalFoldersCount, setTotalFoldersCount] = useState<number | null>(null) // 전체 카테고리 개수

  useEffect(() => {
    async function fetchSoundEffects() {
      try {
        setLoading(true)
        setError(null)
        
        // 처음에는 처음 4개 카테고리만 빠르게 가져오기
        const response = await fetch(`/api/sound-effects/list?limit=${INITIAL_CATEGORIES_COUNT}&offset=0`)
        
        if (!response.ok) {
          throw new Error('효과음 목록을 가져오지 못했습니다.')
        }

        const result = await response.json()
        
        if (result.success) {
          setData({
            folders: result.folders || [],
            soundEffects: result.soundEffects || {},
          })
          // 전체 카테고리 개수 저장
          if (result.totalFolders !== undefined) {
            setTotalFoldersCount(result.totalFolders)
          }
        } else {
          throw new Error(result.error || '효과음 목록을 가져오지 못했습니다.')
        }
      } catch (err) {
        console.error('[useSoundEffects] 오류:', err)
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSoundEffects()
  }, [])

  const loadMoreCategories = useCallback(async () => {
    if (!data || isLoadingMore) return
    
    setIsLoadingMore(true)
    
    try {
      // 다음 카테고리들을 API에서 가져오기
      const response = await fetch(`/api/sound-effects/list?limit=${INITIAL_CATEGORIES_COUNT}&offset=${visibleCategoriesCount}`)
      
      if (!response.ok) {
        throw new Error('추가 효과음을 가져오지 못했습니다.')
      }

      const result = await response.json()
      
      if (result.success && result.folders.length > 0) {
        // 기존 데이터에 추가
        setData(prev => {
          if (!prev) return null
          return {
            folders: [...prev.folders, ...result.folders],
            soundEffects: {
              ...prev.soundEffects,
              ...result.soundEffects,
            },
          }
        })
        setVisibleCategoriesCount(prev => prev + result.folders.length)
      }
    } catch (err) {
      console.error('[useSoundEffects] 추가 로딩 오류:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [data, visibleCategoriesCount, isLoadingMore])

  const visibleFolders = data?.folders.slice(0, visibleCategoriesCount) || []
  // hasMore는 전체 카테고리 개수와 현재 로드된 개수를 비교하여 판단
  const hasMore = totalFoldersCount !== null 
    ? visibleCategoriesCount < totalFoldersCount 
    : data 
      ? visibleCategoriesCount < data.folders.length 
      : false

  return { 
    data: data ? {
      folders: visibleFolders,
      soundEffects: data.soundEffects,
      allFolders: data.folders, // 전체 폴더 목록도 유지
    } : null, 
    loading, 
    error,
    loadMoreCategories,
    hasMore,
    isLoadingMore,
  }
}
