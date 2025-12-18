'use client'

import { useState, useRef } from 'react'
import { Volume2, Play, Pause } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { bgmTemplates, getBgmTemplateUrlSync, type BgmTemplate } from '@/lib/data/templates'

interface BgmSelectorProps {
  bgmTemplate: string | null
  theme: string
  setBgmTemplate: (template: string | null) => void
}

export function BgmSelector({ bgmTemplate, theme, setBgmTemplate }: BgmSelectorProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingTemplateId, setPlayingTemplateId] = useState<string | null>(null)

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
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {bgmTemplates.map((template) => {
          const isSelected = bgmTemplate === template.id
          const isPlaying = playingTemplateId === template.id

          return (
            <div
              key={template.id}
              onClick={() => setBgmTemplate(template.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500'
                  : theme === 'dark'
                    ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              style={{
                borderColor: isSelected
                  ? '#8b5cf6'
                  : theme === 'dark'
                    ? '#374151'
                    : '#e5e7eb',
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
