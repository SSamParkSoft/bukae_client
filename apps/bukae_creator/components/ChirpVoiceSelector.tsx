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
import { CheckCircle2, ChevronDown, ChevronUp, Headphones, Pause } from 'lucide-react'

type GenderGroup = 'MALE' | 'FEMALE' | 'OTHER'

// 사용자 제공 매핑(이름 기준)
const GENDER_BY_SHORT_NAME: Record<string, GenderGroup> = {
  achernar: 'FEMALE',
  achird: 'MALE',
  algenib: 'MALE',
  algieba: 'MALE',
  alnilam: 'MALE',
  aoede: 'FEMALE',
  autonoe: 'FEMALE',
  callirrhoe: 'FEMALE',
  charon: 'MALE',
  despina: 'FEMALE',
  enceladus: 'MALE',
  erinome: 'FEMALE',
  fenrir: 'MALE',
  gacrux: 'FEMALE',
  iapetus: 'MALE',
  kore: 'FEMALE',
  laomedeia: 'FEMALE',
  leda: 'FEMALE',
  orus: 'MALE',
  pulcherrima: 'FEMALE',
  puck: 'MALE',
  rasalgethi: 'MALE',
  sadachbia: 'MALE',
  sadaltager: 'MALE',
  schedar: 'MALE',
  sulafat: 'FEMALE',
  umbriel: 'MALE',
  vindemiatrix: 'FEMALE',
  zephyr: 'FEMALE',
  zubenelgenubi: 'MALE',
}

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
  layout?: 'page' | 'panel'
}

export default function ChirpVoiceSelector({
  theme,
  title = '목소리 선택',
  disabled = false,
  layout = 'page',
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
    // 실제 public/voice-demos는 slug 기반 wav가 우선 존재하는 경우가 많아
    // 불필요한 404(특히 HEAD) 노이즈를 줄이기 위해 slug + wav를 최우선으로 둔다.
    const exts = ['wav', 'mp3']
    const encodedVoiceName = encodeURIComponent(voiceName)
    const slug = toDemoSlug(voiceName)
    const encodedSlug = encodeURIComponent(slug)

    return [
      ...exts.map((ext) => `/voice-demos/${encodedSlug}.${ext}`),
      ...exts.map((ext) => `/voice-demos/${encodedVoiceName}.${ext}`),
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
        // HEAD로 존재 확인을 하면(특히 dev 서버/브라우저 조합) 404 노이즈가 발생하거나
        // 오히려 재생 타이밍이 늦어질 수 있어, <source>를 여러 개 붙여 브라우저가 자동 선택/폴백하도록 한다.
        const audio = document.createElement('audio')
        audio.preload = 'auto'
        for (const url of candidates) {
          const source = document.createElement('source')
          source.src = url
          source.type = url.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'
          audio.appendChild(source)
        }
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

        audio.load()
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
  const isPanel = layout === 'panel'
  const getShortName = useCallback((voiceName: string) => {
    // 예: ko-KR-Chirp3-HD-Achernar -> Achernar
    const cleaned = voiceName.replace(/^ko-KR[-_]/i, '')
    const parts = cleaned.split(/[-_]/g).filter(Boolean)
    return parts.length > 0 ? parts[parts.length - 1] : voiceName
  }, [])

  const getGenderGroup = useCallback(
    (v: PublicVoiceInfo): GenderGroup => {
      const short = getShortName(v.name).toLowerCase()
      const mapped = GENDER_BY_SHORT_NAME[short]
      if (mapped) return mapped

      const g = (v.ssmlGender ?? '').toUpperCase()
      if (g === 'MALE') return 'MALE'
      if (g === 'FEMALE') return 'FEMALE'
      return 'OTHER'
    },
    [getShortName]
  )

  const groupedVoices = useMemo(() => {
    const female: PublicVoiceInfo[] = []
    const male: PublicVoiceInfo[] = []
    const other: PublicVoiceInfo[] = []

    for (const v of voices) {
      const group = getGenderGroup(v)
      if (group === 'FEMALE') female.push(v)
      else if (group === 'MALE') male.push(v)
      else other.push(v)
    }

    const byShortName = (a: PublicVoiceInfo, b: PublicVoiceInfo) =>
      getShortName(a.name).localeCompare(getShortName(b.name))

    female.sort(byShortName)
    male.sort(byShortName)
    other.sort(byShortName)

    return { female, male, other }
  }, [getGenderGroup, getShortName, voices])

  const currentLabel = useMemo(() => {
    if (!voiceTemplate) return '선택된 목소리 없음'
    return getShortName(voiceTemplate)
  }, [getShortName, voiceTemplate])

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
            <div
              className={
                isPanel
                  ? 'grid grid-cols-2 gap-4'
                  : 'grid grid-cols-1 lg:grid-cols-2 gap-4'
              }
            >
              <div className="space-y-2 p-2 ">
                <div className="text-lg font-semibold" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                  여자 목소리
                </div>
                <div className={isPanel ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}>
                  {groupedVoices.female.map((v) => {
                    const isSelected = voiceTemplate === v.name
                    const isThisPlaying = isPlaying && playingVoiceName === v.name
                    const label = getShortName(v.name)
                    return (
                      <div
                        key={v.name}
                        role="button"
                        tabIndex={disabled ? -1 : 0}
                        aria-disabled={disabled}
                        onClick={() => {
                          if (disabled) return
                          openConfirm(v.name)
                        }}
                        onKeyDown={(e) => {
                          if (disabled) return
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openConfirm(v.name)
                          }
                        }}
                        className={[
                          'group relative text-left rounded-lg border p-4 transition-all',
                          'shadow-sm hover:shadow-md hover:-translate-y-0.5',
                          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
                          isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white',
                        ].join(' ')}
                        style={{
                          borderColor: isSelected
                            ? '#a855f7'
                            : isThisPlaying
                              ? isDark
                                ? '#4b5563'
                                : '#9ca3af'
                              : isDark
                                ? '#374151'
                                : '#d1d5db',
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(168,85,247,0.12)'
                              : 'rgba(168,85,247,0.08)'
                            : isThisPlaying
                              ? isDark
                                ? '#111827'
                                : '#f3f4f6'
                              : isDark
                                ? '#0b1220'
                                : '#ffffff',
                          color: isDark ? '#ffffff' : '#111827',
                          opacity: disabled ? 0.6 : 1,
                        }}
                      >
                        {isSelected && (
                          <div className="absolute right-3 top-3 flex items-center gap-1 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-purple-400" />
                            <span className={isDark ? 'text-purple-200' : 'text-purple-700'}>선택됨</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate whitespace-nowrap">{label}</div>
                          </div>

                          <div className="shrink-0 flex items-center">
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
                              className="opacity-80 group-hover:opacity-100 h-8 w-8 sm:h-9 sm:w-9"
                            >
                              {isThisPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Headphones className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2 p-2">
                <div className="text-lg font-semibold" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                  남자 목소리
                </div>
                <div className={isPanel ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}>
                  {groupedVoices.male.map((v) => {
                    const isSelected = voiceTemplate === v.name
                    const isThisPlaying = isPlaying && playingVoiceName === v.name
                    const label = getShortName(v.name)
                    return (
                      <div
                        key={v.name}
                        role="button"
                        tabIndex={disabled ? -1 : 0}
                        aria-disabled={disabled}
                        onClick={() => {
                          if (disabled) return
                          openConfirm(v.name)
                        }}
                        onKeyDown={(e) => {
                          if (disabled) return
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openConfirm(v.name)
                          }
                        }}
                        className={[
                          'group relative text-left rounded-lg border p-4 transition-all',
                          'shadow-sm hover:shadow-md hover:-translate-y-0.5',
                          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
                          isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white',
                        ].join(' ')}
                        style={{
                          borderColor: isSelected
                            ? '#a855f7'
                            : isThisPlaying
                              ? isDark
                                ? '#4b5563'
                                : '#9ca3af'
                              : isDark
                                ? '#374151'
                                : '#d1d5db',
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(168,85,247,0.12)'
                              : 'rgba(168,85,247,0.08)'
                            : isThisPlaying
                              ? isDark
                                ? '#111827'
                                : '#f3f4f6'
                              : isDark
                                ? '#0b1220'
                                : '#ffffff',
                          color: isDark ? '#ffffff' : '#111827',
                          opacity: disabled ? 0.6 : 1,
                        }}
                      >
                        {isSelected && (
                          <div className="absolute right-3 top-3 flex items-center gap-1 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-purple-400" />
                            <span className={isDark ? 'text-purple-200' : 'text-purple-700'}>선택됨</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate whitespace-nowrap">{label}</div>
                          </div>

                          <div className="shrink-0 flex items-center">
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
                              className="opacity-80 group-hover:opacity-100 h-8 w-8 sm:h-9 sm:w-9"
                            >
                              {isThisPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Headphones className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {groupedVoices.other.length > 0 && (
                <div className={isPanel ? 'space-y-2 col-span-2' : 'space-y-2 lg:col-span-2'}>
                  <div className="text-sm font-semibold" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                    기타
                  </div>
                  <div className={isPanel ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3'}>
                    {groupedVoices.other.map((v) => {
                      const isSelected = voiceTemplate === v.name
                      const isThisPlaying = isPlaying && playingVoiceName === v.name
                      const label = getShortName(v.name)
                      return (
                        <div
                          key={v.name}
                          role="button"
                          tabIndex={disabled ? -1 : 0}
                          aria-disabled={disabled}
                          onClick={() => {
                            if (disabled) return
                            openConfirm(v.name)
                          }}
                          onKeyDown={(e) => {
                            if (disabled) return
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              openConfirm(v.name)
                            }
                          }}
                          className={[
                            'group relative text-left rounded-lg border p-4 transition-all',
                            'shadow-sm hover:shadow-md hover:-translate-y-0.5',
                            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
                            isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white',
                          ].join(' ')}
                          style={{
                            borderColor: isSelected
                              ? '#a855f7'
                              : isThisPlaying
                                ? isDark
                                  ? '#4b5563'
                                  : '#9ca3af'
                                : isDark
                                  ? '#374151'
                                  : '#d1d5db',
                            backgroundColor: isSelected
                              ? isDark
                                ? 'rgba(168,85,247,0.12)'
                                : 'rgba(168,85,247,0.08)'
                              : isThisPlaying
                                ? isDark
                                  ? '#111827'
                                  : '#f3f4f6'
                                : isDark
                                  ? '#0b1220'
                                  : '#ffffff',
                            color: isDark ? '#ffffff' : '#111827',
                            opacity: disabled ? 0.6 : 1,
                          }}
                        >
                          {isSelected && (
                            <div className="absolute right-3 top-3 flex items-center gap-1 text-xs font-semibold">
                              <CheckCircle2 className="w-4 h-4 text-purple-400" />
                              <span className={isDark ? 'text-purple-200' : 'text-purple-700'}>선택됨</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate whitespace-nowrap">{label}</div>
                            </div>

                            <div className="shrink-0 flex items-center">
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
                                className="opacity-80 group-hover:opacity-100 h-8 w-8 sm:h-9 sm:w-9"
                              >
                                {isThisPlaying ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Headphones className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
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
              {getShortName(pendingVoiceName)}
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


