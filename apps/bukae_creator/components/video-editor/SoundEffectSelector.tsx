'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSoundEffectStorageUrl } from '@/lib/utils/supabase-storage'

// 효과음 데이터 정의
export interface SoundEffect {
  id: string
  name: string
  filename: string
}

export const soundEffects: SoundEffect[] = [
  {
    id: 'pop',
    name: '팝!',
    filename: 'pop.mp3',
  },
  {
    id: 'whoosh',
    name: '휙!',
    filename: 'whoosh.mp3',
  },
  {
    id: 'riser',
    name: '슉!',
    filename: 'riserSwoosh.mp3',
  },
  {
    id: 'notification',
    name: '띠링!',
    filename: 'notification.mp3',
  },
  {
    id: 'explosion',
    name: '펑!',
    filename: 'loudExplosion.mp3',
  },
]

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
  const [playingEffectId, setPlayingEffectId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingEffectId, setPendingEffectId] = useState<string | null>(null)

  const getSoundEffectUrl = (effect: SoundEffect): string => {
    // Supabase Storage 우선, 실패 시 로컬 경로 fallback
    const storageUrl = getSoundEffectStorageUrl(effect.filename)
    if (storageUrl) return storageUrl
    return `/sound-effects/${effect.filename}`
  }

  const handlePreview = async (effect: SoundEffect, e: React.MouseEvent) => {
    e.stopPropagation()
    const isCurrentlyPlaying = playingEffectId === effect.id

    // 현재 재생 중인 오디오 정지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    if (isCurrentlyPlaying) {
      setPlayingEffectId(null)
      return
    }

    // 새 오디오 재생
    try {
      const url = getSoundEffectUrl(effect)
      
      if (!url) {
        return
      }

      // URL이 유효한지 확인
      if (!url.startsWith('http') && !url.startsWith('/')) {
        return
      }

      // URL이 실제로 접근 가능한지 먼저 확인
      try {
        const response = await fetch(url, { method: 'HEAD' })
        
        if (!response.ok) {
          alert(`효과음 파일을 불러올 수 없어요.\n상태: ${response.status} ${response.statusText}\n파일이 public 폴더에 있는지 확인해주세요.`)
          return
        }
      } catch {
        alert(`효과음 파일에 접근할 수 없어요.\n파일이 public 폴더에 있는지 확인해주세요.`)
        return
      }

      const audio = new Audio(url)
      audio.volume = 0.5 // 미리보기 볼륨 상향
      audioRef.current = audio
      setPlayingEffectId(effect.id)

      audio.addEventListener('ended', () => {
        setPlayingEffectId(null)
        audioRef.current = null
      })

      audio.addEventListener('error', () => {
        setPlayingEffectId(null)
        audioRef.current = null
      })

      await audio.play()
    } catch {
      setPlayingEffectId(null)
    }
  }

  const handleCardClick = (effectId: string | null) => {
    if (effectId === 'none' || effectId === null) {
      // 효과음 없음은 바로 적용
      onSoundEffectConfirm(null)
      setSoundEffect(null)
      if (timeline && currentSceneIndex >= 0) {
        const updatedScenes = [...timeline.scenes]
        updatedScenes[currentSceneIndex] = {
          ...updatedScenes[currentSceneIndex],
          soundEffect: null,
        }
        setTimeline({ ...timeline, scenes: updatedScenes })
      }
      return
    }
    setPendingEffectId(effectId)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    if (pendingEffectId !== null) {
      onSoundEffectConfirm(pendingEffectId)
      setSoundEffect(pendingEffectId)
      if (timeline && currentSceneIndex >= 0) {
        const updatedScenes = [...timeline.scenes]
        updatedScenes[currentSceneIndex] = {
          ...updatedScenes[currentSceneIndex],
          soundEffect: pendingEffectId,
        }
        setTimeline({ ...timeline, scenes: updatedScenes })
      }
    }
    setConfirmOpen(false)
    setPendingEffectId(null)
  }

  const handleCancel = () => {
    setConfirmOpen(false)
    setPendingEffectId(null)
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
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {/* 효과음 없음 옵션 */}
        <div
          onClick={() => handleCardClick('none')}
          className="flex items-center gap-4 h-[59px] cursor-pointer transition-all hover:opacity-90"
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <Image src="/mute.svg" alt="mute" width={24} height={24} />
          </div>
          <div className={`flex-1 rounded-lg border h-[59px] flex items-center ${
            soundEffect === null
              ? 'bg-[#5e8790] border-[#5e8790]'
              : 'bg-[#e3e3e3] border-[#88a9ac]'
          }`}>
            <div className="px-6 flex flex-col justify-center">
              <span 
                className={`font-bold tracking-[-0.32px] ${
                  soundEffect === null ? 'text-white' : 'text-[#2c2c2c]'
                }`}
                style={{ 
                  fontSize: 'var(--font-size-16)',
                  lineHeight: '22.4px'
                }}
              >
                효과음 없음
              </span>
              <span 
                className={`font-medium ${
                  soundEffect === null ? 'text-white' : 'text-[#2c2c2c]'
                }`}
                style={{ 
                  fontSize: '12px',
                  lineHeight: '16.8px'
                }}
              >
                효과음을 설정하지 않습니다
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              // 효과음 없음은 재생할 수 없음
            }}
            className="w-[65px] h-8 rounded-lg flex items-center justify-center gap-1 shrink-0 opacity-0 pointer-events-none"
          >
            <Image src="/play.svg" alt="play" width={12} height={14} />
            <span className="font-semibold tracking-[-0.14px] text-black" style={{ fontSize: '14px', lineHeight: '19.6px' }}>듣기</span>
          </button>
        </div>

        {/* 효과음 목록 */}
        {soundEffects.map((effect) => {
          const isSelected = soundEffect === effect.id
          const isPlaying = playingEffectId === effect.id
          const isThisConfirmOpen = confirmOpen && pendingEffectId === effect.id

          return (
            <Popover key={effect.id} open={isThisConfirmOpen} onOpenChange={(open) => {
              if (open) {
                handleCardClick(effect.id)
              } else {
                setConfirmOpen(false)
              }
            }}>
              <PopoverTrigger asChild>
                <div
                  onClick={() => handleCardClick(effect.id)}
                  className="flex items-center gap-4 h-[59px] cursor-pointer transition-all hover:opacity-90"
                >
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <Image src="/sound.svg" alt="sound" width={24} height={24} />
                  </div>
                  <div className={`flex-1 rounded-lg border h-[59px] flex items-center ${
                    isSelected
                      ? 'bg-[#5e8790] border-[#5e8790]'
                      : 'bg-white border-[#88a9ac]'
                  }`}>
                    <div className="px-6 flex flex-col justify-center">
                      <span 
                        className={`font-bold tracking-[-0.32px] ${
                          isSelected ? 'text-white' : 'text-[#2c2c2c]'
                        }`}
                        style={{ 
                          fontSize: 'var(--font-size-16)',
                          lineHeight: '22.4px'
                        }}
                      >
                        {effect.name}
                      </span>
                      <span 
                        className={`font-medium ${
                          isSelected ? 'text-white' : 'text-[#2c2c2c]'
                        }`}
                        style={{ 
                          fontSize: '12px',
                          lineHeight: '16.8px'
                        }}
                      >
                        효과음을 재생합니다
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handlePreview(effect, e)}
                    className="w-[65px] h-8 rounded-lg flex items-center justify-center gap-1 shrink-0 hover:bg-gray-100 transition-all"
                  >
                    {isPlaying ? (
                      <Image src="/mute.svg" alt="pause" width={15} height={18} />
                    ) : (
                      <Image src="/play.svg" alt="play" width={12} height={14} />
                    )}
                    <span className="font-semibold tracking-[-0.14px] text-black" style={{ fontSize: '14px', lineHeight: '19.6px' }}>듣기</span>
                  </button>
                </div>
              </PopoverTrigger>
              
              {/* 말풍선 Popover */}
              <PopoverContent
                side="top"
                align="center"
                sideOffset={12}
                className="w-80 p-5 relative bg-white border-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-4">
                  <div 
                    className="font-semibold text-text-dark tracking-[-0.32px]"
                    style={{ 
                      fontSize: 'var(--font-size-16)',
                      lineHeight: 'var(--line-height-16-140)'
                    }}
                  >
                    효과음을 확정하시겠어요?
                  </div>
                  
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      className="flex-1 bg-white border-gray-300 text-text-dark hover:bg-gray-50"
                    >
                      다시 선택하기
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleConfirm}
                      className="flex-1 bg-brand-teal hover:bg-brand-teal-dark text-white"
                    >
                      확정하기
                    </Button>
                  </div>
                </div>
                
                {/* 말풍선 화살표 */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    bottom: '-8px',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '8px solid #ffffff',
                  }}
                />
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    bottom: '-9px',
                    borderLeft: '9px solid transparent',
                    borderRight: '9px solid transparent',
                    borderTop: '9px solid #e5e7eb',
                  }}
                />
              </PopoverContent>
            </Popover>
          )
        })}
      </div>
    </div>
  )
}
