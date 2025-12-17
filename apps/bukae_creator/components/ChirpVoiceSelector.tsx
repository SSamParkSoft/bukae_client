'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Headphones, Pause } from 'lucide-react'

type PublicVoiceInfo = {
  name: string
  languageCodes: string[]
  ssmlGender?: string
  naturalSampleRateHertz?: number
}

type VoicesResponse = {
  languageCode: string
  voices: PublicVoiceInfo[]
  error?: string
}

type ChirpVoiceSelectorProps = {
  theme?: string
  title?: string
  disabled?: boolean
}

export default function ChirpVoiceSelector({
  theme,
  title = '목소리 선택',
  disabled = false,
}: ChirpVoiceSelectorProps) {
  const { voiceTemplate, setVoiceTemplate } = useVideoCreateStore()
  const [voices, setVoices] = useState<PublicVoiceInfo[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingVoiceName, setPlayingVoiceName] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => !voiceTemplate)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingVoiceName, setPendingVoiceName] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setPlayingVoiceName(null)
  }, [])

  const loadVoices = useCallback(async () => {
    setIsLoadingVoices(true)
    setError(null)
    try {
      const res = await fetch('/api/tts/voices', { cache: 'no-store' })
      const data = (await res.json()) as VoicesResponse
      if (!res.ok) {
        throw new Error(data?.error || '목소리 목록을 불러오지 못했습니다.')
      }

      const nextVoices = Array.isArray(data.voices) ? data.voices : []
      setVoices(nextVoices)
    } catch (e) {
      setVoices([])
      setError(e instanceof Error ? e.message : '목소리 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoadingVoices(false)
    }
  }, [])

  useEffect(() => {
    loadVoices()
    return () => stop()
  }, [loadVoices, stop])

  useEffect(() => {
    setIsExpanded(!voiceTemplate)
  }, [voiceTemplate])

  const toDemoSlug = useCallback((voiceName: string) => {
    // 예: ko-KR-Chirp3-HD-Achernar -> chirp3-hd-achernar
    const withoutLang = voiceName.replace(/^ko-KR[-_]/i, '')
    return withoutLang
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }, [])

  const buildDemoUrls = useCallback((voiceName: string) => {
    const exts = ['mp3', 'wav']
    const encodedVoiceName = encodeURIComponent(voiceName)
    const slug = toDemoSlug(voiceName)
    const encodedSlug = encodeURIComponent(slug)

    return [
      ...exts.map((ext) => `/voice-demos/${encodedVoiceName}.${ext}`),
      ...exts.map((ext) => `/voice-demos/${encodedSlug}.${ext}`),
    ]
  }, [toDemoSlug])

  const playDemo = useCallback(
    async (voiceName: string) => {
      if (disabled) return
      setError(null)

      // 같은 항목 재생 중이면 토글 정지
      if (isPlaying && playingVoiceName === voiceName) {
        stop()
        return
      }

      try {
        stop()

        const candidates = buildDemoUrls(voiceName)
        let resolvedUrl: string | null = null

        // 파일 존재 확인(없으면 즉시 안내)
        for (const url of candidates) {
          const head = await fetch(url, { method: 'HEAD', cache: 'no-store' }).catch(() => null)
          if (head?.ok) {
            resolvedUrl = url
            break
          }
        }

        if (!resolvedUrl) {
          setError('준비되지 않았어요')
          return
        }

        const audio = new Audio(resolvedUrl)
        audioRef.current = audio
        audio.onended = () => {
          setIsPlaying(false)
          setPlayingVoiceName(null)
        }
        audio.onerror = () => {
          setIsPlaying(false)
          setPlayingVoiceName(null)
          setError('준비되지 않았어요')
        }

        await audio.play()
        setPlayingVoiceName(voiceName)
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
        setPlayingVoiceName(null)
        setError('준비되지 않았어요')
      }
    },
    [buildDemoUrls, disabled, isPlaying, playingVoiceName, stop]
  )

  const openConfirm = useCallback(
    (voiceName: string) => {
      if (disabled) return
      setPendingVoiceName(voiceName)
      setConfirmOpen(true)
    },
    [disabled]
  )

  const confirmSelection = useCallback(() => {
    if (!pendingVoiceName) return
    setVoiceTemplate(pendingVoiceName)
    setConfirmOpen(false)
  }, [pendingVoiceName, setVoiceTemplate])

  const isDark = theme === 'dark'
  const currentLabel = useMemo(() => {
    if (!voiceTemplate) return '선택된 목소리 없음'
    return voiceTemplate
  }, [voiceTemplate])

  return (
    <div
      className="rounded-lg border p-3 space-y-3"
      style={{
        borderColor: isDark ? '#374151' : '#e5e7eb',
        backgroundColor: isDark ? '#111827' : '#ffffff',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="text-xl font-semibold"
          style={{ color: isDark ? '#ffffff' : '#111827' }}
        >
          {title}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded((v) => !v)}
            disabled={disabled}
            className="gap-1"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isExpanded ? '접기' : '펼치기'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadVoices}
            disabled={disabled || isLoadingVoices}
          >
            {isLoadingVoices ? '불러오는 중...' : '목록 새로고침'}
          </Button>
        </div>
      </div>

      <div className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
        현재 선택: <span className="font-medium">{currentLabel}</span>
      </div>

      {isExpanded && (
        <div className="space-y-2">
          {voices.length === 0 && !isLoadingVoices ? (
            <div className="text-sm" style={{ color: isDark ? '#d1d5db' : '#374151' }}>
              사용 가능한 목소리가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {voices.map((v) => {
                const isSelected = voiceTemplate === v.name
                const isThisPlaying = isPlaying && playingVoiceName === v.name
                return (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => openConfirm(v.name)}
                    disabled={disabled}
                    className="text-left rounded-md border p-3 transition-colors"
                    style={{
                      borderColor: isSelected ? '#a855f7' : isDark ? '#374151' : '#d1d5db',
                      backgroundColor: isSelected ? (isDark ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.10)') : isDark ? '#0b1220' : '#ffffff',
                      color: isDark ? '#ffffff' : '#111827',
                      opacity: disabled ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{v.name}</div>
                        <div className="mt-1 text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                          {v.languageCodes?.join(', ') || 'ko-KR'}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            playDemo(v.name)
                          }}
                          disabled={disabled}
                          aria-label="미리듣기"
                          title="미리듣기"
                        >
                          {isThisPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Headphones className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-xs" style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}>
          {error}
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className={isDark ? 'bg-gray-800' : 'bg-white'}>
          <DialogHeader>
            <DialogTitle>이 목소리로 확정하시겠어요?</DialogTitle>
            <DialogDescription>다음 단계에서 수정도 가능해요!</DialogDescription>
          </DialogHeader>

          {pendingVoiceName && (
            <div className="rounded-md border p-3 text-sm" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
              {pendingVoiceName}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              다시 선택하기
            </Button>
            <Button
              type="button"
              onClick={confirmSelection}
              disabled={!pendingVoiceName}
            >
              확정하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


