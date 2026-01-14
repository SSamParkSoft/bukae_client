'use client'

import { useState, useRef } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSoundEffectStorageUrl } from '@/lib/utils/supabase-storage'
import { useSoundEffects, type SoundEffectFile } from '@/hooks/video/useSoundEffects'

interface SoundEffectSelectorProps {
  soundEffect: string | null
  theme: string
  setSoundEffect: (effectId: string | null) => void
  onSoundEffectConfirm: (effectId: string | null) => void
  timeline: TimelineData | null
  currentSceneIndex: number
  setTimeline: (value: TimelineData) => void
}

export function SoundEffectSelector({ 
  soundEffect, 
  theme, 
  setSoundEffect, 
  onSoundEffectConfirm,
  timeline,
  currentSceneIndex,
  setTimeline,
}: SoundEffectSelectorProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingEffectPath, setPlayingEffectPath] = useState<string | null>(null)
  const { data, loading, error } = useSoundEffects()

  const getSoundEffectUrl = (filePath: string): string => {
    // Supabase Storage URL 가져오기
    const storageUrl = getSoundEffectStorageUrl(filePath)
    if (storageUrl) return storageUrl
    return `/sound-effects/${filePath}`
  }

  const handlePreview = async (effect: SoundEffectFile, e: React.MouseEvent) => {
    e.stopPropagation()
    const isCurrentlyPlaying = playingEffectPath === effect.path

    // 현재 재생 중인 오디오 정지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    if (isCurrentlyPlaying) {
      setPlayingEffectPath(null)
      return
    }

    // 새 오디오 재생
    try {
      const url = getSoundEffectUrl(effect.path)
      
      if (!url) {
        return
      }

      // URL이 유효한지 확인
      if (!url.startsWith('http') && !url.startsWith('/')) {
        return
      }

      const audio = new Audio(url)
      audio.volume = 0.5 // 미리보기 볼륨 상향
      audioRef.current = audio
      setPlayingEffectPath(effect.path)

      audio.addEventListener('ended', () => {
        setPlayingEffectPath(null)
        audioRef.current = null
      })

      audio.addEventListener('error', () => {
        setPlayingEffectPath(null)
        audioRef.current = null
      })

      await audio.play()
    } catch {
      setPlayingEffectPath(null)
    }
  }

  const handleEffectClick = (effectPath: string) => {
    if (timeline && currentSceneIndex >= 0) {
      const updatedScenes = [...timeline.scenes]
      updatedScenes[currentSceneIndex] = {
        ...updatedScenes[currentSceneIndex],
        soundEffect: effectPath,
      }
      setTimeline({ ...timeline, scenes: updatedScenes })
      setSoundEffect(effectPath)
      onSoundEffectConfirm(effectPath)
    }
  }

  const handleNoneClick = () => {
    if (timeline && currentSceneIndex >= 0) {
      const updatedScenes = [...timeline.scenes]
      updatedScenes[currentSceneIndex] = {
        ...updatedScenes[currentSceneIndex],
        soundEffect: null,
      }
      setTimeline({ ...timeline, scenes: updatedScenes })
      setSoundEffect(null)
      onSoundEffectConfirm(null)
    }
  }

  // 효과음 표시명 가져오기 (label 우선, 없으면 파일명)
  const getDisplayName = (effect: SoundEffectFile): string => {
    return effect.label || effect.name.replace(/\.[^/.]+$/, '')
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full" data-theme={theme}>
        <h3 
          className="font-bold text-text-dark mb-4 tracking-[-0.4px] shrink-0"
          style={{ 
            fontSize: 'var(--font-size-20)',
            lineHeight: '28px'
          }}
        >
          효과음 선택
        </h3>
        <div className="h-0.5 bg-[#bbc9c9] mb-6 shrink-0" />
        <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
          <div className="text-text-dark">효과음을 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-full" data-theme={theme}>
        <h3 
          className="font-bold text-text-dark mb-4 tracking-[-0.4px] shrink-0"
          style={{ 
            fontSize: 'var(--font-size-20)',
            lineHeight: '28px'
          }}
        >
          효과음 선택
        </h3>
        <div className="h-0.5 bg-[#bbc9c9] mb-6 shrink-0" />
        <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
          <div className="text-text-dark">효과음을 불러올 수 없습니다.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" data-theme={theme}>
      <h3 
        className="font-bold text-text-dark mb-4 tracking-[-0.4px] shrink-0"
        style={{ 
          fontSize: 'var(--font-size-20)',
          lineHeight: '28px'
        }}
      >
        효과음 선택
      </h3>
      <div className="h-0.5 bg-[#bbc9c9] mb-6 shrink-0" />
      <div className="flex-1 overflow-y-auto space-y-6 min-h-0 pb-6">
        {/* 효과음 없음 옵션 */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={handleNoneClick}
              className={`h-[38px] rounded-lg border transition-all font-bold tracking-[-0.14px] ${
                soundEffect === null
                  ? 'bg-[#5e8790] text-white border-[#5e8790]'
                  : 'bg-white text-[#2c2c2c] border-[#88a9ac] hover:bg-gray-50'
              }`}
              style={{ 
                fontSize: 'var(--font-size-14)',
                lineHeight: '22.4px'
              }}
            >
              없음
            </button>
          </div>
        </div>

        {/* 폴더별 효과음 섹션 */}
        {data.folders.map((folder) => {
          const effects = data.soundEffects[folder] || []
          if (effects.length === 0) return null

          return (
            <div key={folder}>
              <h4 
                className="font-bold text-text-dark mb-4 tracking-[-0.4px]"
                style={{ 
                  fontSize: 'var(--font-size-20)',
                  lineHeight: '28px'
                }}
              >
                {folder === '기타' ? '기타' : folder}
              </h4>
              <div className="h-0.5 bg-[#bbc9c9] mb-6" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {effects.map((effect) => {
                  const isSelected = soundEffect === effect.path
                  const isPlaying = playingEffectPath === effect.path
                  const displayName = getDisplayName(effect)

                  return (
                    <div key={effect.path} className="relative group">
                      <button
                        onClick={() => handleEffectClick(effect.path)}
                        className={`w-full h-[38px] rounded-lg border transition-all font-bold tracking-[-0.14px] relative ${
                          isSelected
                            ? 'bg-[#5e8790] text-white border-[#5e8790]'
                            : 'bg-white text-[#2c2c2c] border-[#88a9ac] hover:bg-gray-50'
                        }`}
                        style={{ 
                          fontSize: 'var(--font-size-14)',
                          lineHeight: '22.4px'
                        }}
                      >
                        <span className="truncate block px-2">{displayName}</span>
                      </button>
                      {/* 재생 버튼 (호버 시 표시) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreview(effect, e)
                        }}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center transition-opacity ${
                          isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        } ${isSelected ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                        {isPlaying ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <rect x="2" y="2" width="3" height="8" rx="0.5" />
                            <rect x="7" y="2" width="3" height="8" rx="0.5" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M2 2l8 4-8 4V2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
