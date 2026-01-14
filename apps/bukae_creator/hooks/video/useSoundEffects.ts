import { useState, useEffect } from 'react'

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

export function useSoundEffects() {
  const [data, setData] = useState<SoundEffectsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSoundEffects() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/sound-effects/list')
        
        if (!response.ok) {
          throw new Error('효과음 목록을 가져오지 못했습니다.')
        }

        const result = await response.json()
        
        if (result.success) {
          setData({
            folders: result.folders || [],
            soundEffects: result.soundEffects || {},
          })
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

  return { data, loading, error }
}
