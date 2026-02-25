'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { bgmTemplates, getBgmTemplateUrlSync, type BgmTemplate } from '@/lib/data/templates'

interface BgmSelectorProps {
  bgmTemplate: string | null
  theme: string
  setBgmTemplate: (template: string | null) => void
  confirmedBgmTemplate: string | null
  onBgmConfirm: (templateId: string | null) => void
}

export function BgmSelector({ bgmTemplate, theme: _theme, setBgmTemplate, confirmedBgmTemplate, onBgmConfirm }: BgmSelectorProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingTemplateId, setPlayingTemplateId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)

  const handlePreview = async (template: BgmTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    const isCurrentlyPlaying = playingTemplateId === template.id

    // 현재 재생 중인 오디오 정지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    if (isCurrentlyPlaying) {
      setPlayingTemplateId(null)
      return
    }

    // 새 오디오 재생
    try {
      const url = getBgmTemplateUrlSync(template)
      
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
          alert(`BGM 파일을 불러올 수 없어요.\n상태: ${response.status} ${response.statusText}\n파일이 Supabase Storage에 업로드되어 있는지 확인해주세요.`)
          return
        }
      } catch (_fetchError) {
        alert(`BGM 파일에 접근할 수 없어요.\n파일이 Supabase Storage에 업로드되어 있는지 확인해주세요.`)
        return
      }

      const audio = new Audio(url)
      audioRef.current = audio
      setPlayingTemplateId(template.id)

      audio.addEventListener('ended', () => {
        setPlayingTemplateId(null)
        audioRef.current = null
      })

      audio.addEventListener('error', () => {
        setPlayingTemplateId(null)
        audioRef.current = null
      })

      await audio.play()
    } catch (_error) {
      setPlayingTemplateId(null)
    }
  }

  const handleCardClick = (templateId: string | null) => {
    if (templateId === 'none' || templateId === null) {
      // 데모 오디오 정지
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current = null
      }
      setPlayingTemplateId(null)
      
      // 배경음악 없음은 바로 적용
      onBgmConfirm(null)
      setBgmTemplate(null)
      return
    }
    setPendingTemplateId(templateId)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    // 데모 오디오 정지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setPlayingTemplateId(null)
    
    if (pendingTemplateId !== null) {
      onBgmConfirm(pendingTemplateId)
      setBgmTemplate(pendingTemplateId)
    }
    setConfirmOpen(false)
    setPendingTemplateId(null)
  }

  const handleCancel = () => {
    setConfirmOpen(false)
    setPendingTemplateId(null)
  }

  return (
    <div className="flex flex-col h-full">
      <h3 
        className="font-bold text-text-dark mb-4 tracking-[-0.4px] shrink-0"
        style={{ 
          fontSize: 'var(--font-size-20)',
          lineHeight: '28px'
        }}
      >
        BGM 선택
      </h3>
      <div className="h-0.5 bg-[#bbc9c9] mb-6 shrink-0" />
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {/* 배경음악 없음 옵션 */}
        <div
          onClick={() => handleCardClick('none')}
          className="flex items-center gap-2 sm:gap-4 h-[59px] cursor-pointer transition-all hover:opacity-90 min-w-0"
        >
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <Image src="/mute.svg" alt="mute" width={24} height={24} />
          </div>
          <div className={`flex-1 rounded-lg border h-[59px] flex items-center min-w-0 ${
            bgmTemplate === null
              ? 'bg-[#5e8790] border-[#5e8790]'
              : 'bg-[#e3e3e3] border-[#88a9ac]'
          }`}>
            <div className="px-3 sm:px-6 flex flex-col justify-center min-w-0 flex-1">
              <span 
                className={`font-bold tracking-[-0.32px] truncate ${
                  bgmTemplate === null ? 'text-white' : 'text-[#2c2c2c]'
                }`}
                style={{ 
                  fontSize: 'var(--font-size-16)',
                  lineHeight: '22.4px'
                }}
              >
                배경음악 없음
              </span>
              <span 
                className={`font-medium truncate ${
                  bgmTemplate === null ? 'text-white' : 'text-[#2c2c2c]'
                }`}
                style={{ 
                  fontSize: '12px',
                  lineHeight: '16.8px'
                }}
              >
                배경음악을 설정하지 않습니다
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              // 배경음악 없음은 재생할 수 없음
            }}
            className="w-[65px] h-8 rounded-lg flex items-center justify-center gap-1 shrink-0 opacity-0 pointer-events-none"
          >
            <Image src="/play.svg" alt="play" width={12} height={14} />
            <span className="font-semibold tracking-[-0.14px] text-black" style={{ fontSize: '14px', lineHeight: '19.6px' }}>듣기</span>
          </button>
        </div>

        {/* 배경음악 템플릿 목록 */}
        {bgmTemplates.map((template) => {
          const isSelected = bgmTemplate === template.id
          const isPlaying = playingTemplateId === template.id
          const _isConfirmed = confirmedBgmTemplate === template.id
          const isThisConfirmOpen = confirmOpen && pendingTemplateId === template.id

          return (
            <Popover key={template.id} open={isThisConfirmOpen} onOpenChange={(open) => {
              if (open) {
                handleCardClick(template.id)
              } else {
                setConfirmOpen(false)
              }
            }}>
              <PopoverTrigger asChild>
                <div
                  onClick={() => handleCardClick(template.id)}
                  className="flex items-center gap-2 sm:gap-4 h-[59px] cursor-pointer transition-all hover:opacity-90 min-w-0"
                >
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <Image src="/sound.svg" alt="sound" width={24} height={24} />
                  </div>
                  <div className={`flex-1 rounded-lg border h-[59px] flex items-center min-w-0 ${
                    isSelected
                      ? 'bg-[#5e8790] border-[#5e8790]'
                      : 'bg-white border-[#88a9ac]'
                  }`}>
                    <div className="px-3 sm:px-6 flex flex-col justify-center min-w-0 flex-1">
                      <span 
                        className={`font-bold tracking-[-0.32px] truncate ${
                          isSelected ? 'text-white' : 'text-[#2c2c2c]'
                        }`}
                        style={{ 
                          fontSize: 'var(--font-size-16)',
                          lineHeight: '22.4px'
                        }}
                      >
                        {template.name}
                      </span>
                      <span 
                        className={`font-medium truncate ${
                          isSelected ? 'text-white' : 'text-[#2c2c2c]'
                        }`}
                        style={{ 
                          fontSize: '12px',
                          lineHeight: '16.8px'
                        }}
                      >
                        {template.description}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handlePreview(template, e)}
                    className="w-[55px] sm:w-[65px] h-8 rounded-lg flex items-center justify-center gap-1 shrink-0 hover:bg-gray-100 transition-all"
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
                    배경음악을 확정하시겠어요?
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
