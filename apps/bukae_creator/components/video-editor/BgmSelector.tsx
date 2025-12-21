'use client'

import { useState, useRef } from 'react'
import { Volume2, Play, Pause } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

export function BgmSelector({ bgmTemplate, theme, setBgmTemplate, confirmedBgmTemplate, onBgmConfirm }: BgmSelectorProps) {
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
          alert(`BGM 파일을 불러올 수 없습니다.\n상태: ${response.status} ${response.statusText}\n파일이 Supabase Storage에 업로드되어 있는지 확인해주세요.`)
          return
        }
      } catch (fetchError) {
        alert(`BGM 파일에 접근할 수 없습니다.\n파일이 Supabase Storage에 업로드되어 있는지 확인해주세요.`)
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
    } catch (error) {
      setPlayingTemplateId(null)
    }
  }

  const handleCardClick = (templateId: string) => {
    setPendingTemplateId(templateId)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
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
    <div>
      <h3
        className="text-sm font-semibold mb-3"
        style={{
          color: theme === 'dark' ? '#ffffff' : '#111827',
        }}
      >
        배경음악 선택
      </h3>
      <div 
        className="space-y-2 max-h-[60vh] overflow-y-auto border rounded-lg p-2"
        style={{
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          boxShadow: theme === 'dark' 
            ? 'inset 0 2px 4px rgba(0, 0, 0, 0.3)' 
            : 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
        }}
      >
        {bgmTemplates.map((template) => {
          const isSelected = bgmTemplate === template.id
          const isPlaying = playingTemplateId === template.id
          const isConfirmed = confirmedBgmTemplate === template.id
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
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-105 ${
                    isSelected
                      ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500'
                      : isPlaying
                        ? theme === 'dark'
                          ? 'bg-gray-800 border-gray-600'
                          : 'bg-gray-300 border-gray-400'
                        : theme === 'dark'
                          ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  style={{
                    borderColor: isSelected
                      ? '#8b5cf6'
                      : isPlaying
                        ? theme === 'dark'
                          ? '#4b5563'
                          : '#9ca3af'
                        : theme === 'dark'
                          ? '#374151'
                          : '#e5e7eb',
                    backgroundColor: isPlaying
                      ? theme === 'dark'
                        ? '#1f2937'
                        : '#d1d5db'
                      : undefined,
                    transform: 'scale(1)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Volume2 className="w-4 h-4 flex-shrink-0" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }} />
                        <span
                          className={`font-semibold text-sm truncate ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {template.name}
                        </span>
                        <Badge
                          variant={template.tier === 'LIGHT' ? 'default' : 'secondary'}
                          className="text-xs flex-shrink-0"
                        >
                          {template.tier}
                        </Badge>
                      </div>
                      <p
                        className={`text-xs mb-2 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}
                      >
                        {template.description}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 h-8 px-2"
                      onClick={(e) => handlePreview(template, e)}
                      style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151',
                      }}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3 h-3 mr-1" />
                          <span className="text-xs">정지</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" />
                          <span className="text-xs">듣기</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </PopoverTrigger>
              
              {/* 말풍선 Popover */}
              <PopoverContent
                side="top"
                align="center"
                sideOffset={12}
                className={`w-80 p-4 relative ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              >
                <div className="space-y-3">
                  <div>
                    <div className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      배경음악 확정
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      배경음악을 확정하시겠어요?
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      className={theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
                    >
                      아니요
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleConfirm}
                      style={{
                        backgroundColor: '#8b5cf6',
                        color: '#ffffff',
                      }}
                    >
                      확정
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
                    borderTop: `8px solid ${theme === 'dark' ? '#1f2937' : '#ffffff'}`,
                  }}
                />
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    bottom: '-9px',
                    borderLeft: '9px solid transparent',
                    borderRight: '9px solid transparent',
                    borderTop: `9px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                  }}
                />
              </PopoverContent>
            </Popover>
          )
        })}
        <button
          onClick={() => setBgmTemplate(null)}
          className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${
            bgmTemplate === null
              ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600'
              : 'hover:bg-gray-50 dark:hover:bg-gray-900/20'
          }`}
          style={{
            borderColor: bgmTemplate === null
              ? theme === 'dark' ? '#6b7280' : '#9ca3af'
              : theme === 'dark' ? '#374151' : '#e5e7eb',
            color: theme === 'dark' ? '#d1d5db' : '#374151',
          }}
        >
          배경음악 없음
        </button>
      </div>
    </div>
  )
}
