'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { authStorage } from '@/lib/api/auth-storage'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

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
      const accessToken = authStorage.getAccessToken()
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.')
      }

      const res = await fetch('/api/tts/voices', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = (await res.json()) as VoicesResponse
      if (!res.ok) {
        throw new Error(data?.error || '목소리 목록을 불러오지 못했어요.')
      }

      const nextVoices = Array.isArray(data.voices) ? data.voices : []
      setVoices(nextVoices)
    } catch (e) {
      setVoices([])
      setError(e instanceof Error ? e.message : '목소리 목록을 불러오는 중 오류가 발생했어요.')
    } finally {
      setIsLoadingVoices(false)
    }
  }, [])

  useEffect(() => {
    loadVoices()
    return () => stop()
  }, [loadVoices, stop])


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
    <div className="space-y-4 mb-6">
      {/* 헤더 */}
      <div>
        <h3 
          className="font-bold text-[#111111] tracking-[-0.4px]"
          style={{ 
            fontSize: 'var(--font-size-20)',
            lineHeight: '28px'
          }}
        >
          {title}
        </h3>
      </div>

      {/* 선택된 목소리 표시 */}
      {voiceTemplate && (
        <div 
          className="font-medium text-[#3b6574] tracking-[-0.32px]"
          style={{ 
            fontSize: 'var(--font-size-16)',
            lineHeight: '22.4px'
          }}
        >
          선택된 목소리: {currentLabel}
        </div>
      )}

      <div className="space-y-6">
        {voices.length === 0 && !isLoadingVoices ? (
          <div className="text-sm text-text-dark">
            사용 가능한 목소리가 없어요.
          </div>
        ) : (
          <>
            {/* 여성 목소리 섹션 */}
            {groupedVoices.female.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h4 
                      className="font-bold text-text-dark text-center tracking-[-0.36px]"
                      style={{ 
                        fontSize: 'var(--font-size-18)',
                        lineHeight: '25.2px'
                      }}
                    >
                      여성 목소리
                    </h4>
                    <div className="h-0.5 bg-[#bbc9c9] mt-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {groupedVoices.female.map((v) => {
                      const isSelected = voiceTemplate === v.name
                      const isThisPlaying = isPlaying && playingVoiceName === v.name
                      const label = getShortName(v.name)
                      const isThisConfirmOpen = confirmOpen && pendingVoiceName === v.name
                      return (
                        <Popover key={v.name} open={isThisConfirmOpen} onOpenChange={(open) => {
                          if (open) {
                            openConfirm(v.name)
                          } else {
                            setConfirmOpen(false)
                          }
                        }}>
                          <PopoverTrigger asChild>
                            <div
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
                              className="flex items-center gap-4 h-[46px] transition-all hover:opacity-90"
                            >
                              <div 
                                className="w-6 h-6 flex items-center justify-center shrink-0 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (disabled) return
                                  playDemo(v.name)
                                }}
                              >
                                <Image 
                                  src="/voiceplay.svg" 
                                  alt="재생" 
                                  width={18} 
                                  height={19}
                                  className="w-[18px] h-[19px]"
                                />
                              </div>
                              <div 
                                className={`flex-1 rounded-lg border h-[46px] flex items-center cursor-pointer ${
                                isSelected
                                  ? 'bg-[#5e8790] border-[#5e8790]'
                                  : 'bg-white border-[#88a9ac]'
                              }`}
                              >
                                <div className="px-4 flex items-center">
                                  <span 
                                    className={`font-medium tracking-[-0.32px] ${
                                      isSelected ? 'text-white' : 'text-[#2c2c2c]'
                                    }`}
                                    style={{ 
                                      fontSize: 'var(--font-size-16)',
                                      lineHeight: '22.4px'
                                    }}
                                  >
                                    {label}
                                  </span>
                                </div>
                              </div>
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
                                이 목소리로 확정하시겠어요?
                              </div>
                              
                              <div className="flex gap-2 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setConfirmOpen(false)}
                                  className="flex-1 bg-white border-gray-300 text-text-dark hover:bg-gray-50"
                                >
                                  다시 선택하기
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={confirmSelection}
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
              )}

              {/* 남성 목소리 섹션 */}
              {groupedVoices.male.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h4 
                      className="font-bold text-text-dark text-center tracking-[-0.36px]"
                      style={{ 
                        fontSize: 'var(--font-size-18)',
                        lineHeight: '25.2px'
                      }}
                    >
                      남성 목소리
                    </h4>
                    <div className="h-0.5 bg-[#bbc9c9] mt-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {groupedVoices.male.map((v) => {
                      const isSelected = voiceTemplate === v.name
                      const isThisPlaying = isPlaying && playingVoiceName === v.name
                      const label = getShortName(v.name)
                      const isThisConfirmOpen = confirmOpen && pendingVoiceName === v.name
                      return (
                        <Popover key={v.name} open={isThisConfirmOpen} onOpenChange={(open) => {
                          if (open) {
                            openConfirm(v.name)
                          } else {
                            setConfirmOpen(false)
                          }
                        }}>
                          <PopoverTrigger asChild>
                            <div
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
                              className="flex items-center gap-4 h-[46px] transition-all hover:opacity-90"
                            >
                              <div 
                                className="w-6 h-6 flex items-center justify-center shrink-0 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (disabled) return
                                  playDemo(v.name)
                                }}
                              >
                                <Image 
                                  src="/voiceplay.svg" 
                                  alt="재생" 
                                  width={18} 
                                  height={19}
                                  className="w-[18px] h-[19px]"
                                />
                              </div>
                              <div 
                                className={`flex-1 rounded-lg border h-[46px] flex items-center cursor-pointer ${
                                isSelected
                                  ? 'bg-[#5e8790] border-[#5e8790]'
                                  : 'bg-white border-[#88a9ac]'
                              }`}
                              >
                                <div className="px-4 flex items-center">
                                  <span 
                                    className={`font-medium tracking-[-0.32px] ${
                                      isSelected ? 'text-white' : 'text-[#2c2c2c]'
                                    }`}
                                    style={{ 
                                      fontSize: 'var(--font-size-16)',
                                      lineHeight: '22.4px'
                                    }}
                                  >
                                    {label}
                                  </span>
                                </div>
                              </div>
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
                                이 목소리로 확정하시겠어요?
                              </div>
                              
                              <div className="flex gap-2 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setConfirmOpen(false)}
                                  className="flex-1 bg-white border-gray-300 text-text-dark hover:bg-gray-50"
                                >
                                  다시 선택하기
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={confirmSelection}
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
            )}
          </>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

    </div>
  )
}


