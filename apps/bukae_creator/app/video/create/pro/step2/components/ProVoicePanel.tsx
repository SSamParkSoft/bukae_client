'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { voiceTemplateHelpers } from '@/store/useVideoCreateStore'
import { authStorage } from '@/lib/api/auth-storage'
import type { PublicVoiceInfo } from '@/lib/types/tts'
import { publicVoiceInfoToVoiceInfo } from '@/lib/types/tts'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Loader2, Info } from 'lucide-react'

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

export interface ProVoicePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVoiceTemplate?: string | null
  onVoiceSelect: (voiceTemplate: string | null, voiceLabel: string) => void
  onVoiceSelectForAll?: (voiceTemplate: string | null, voiceLabel: string) => void
}

export function ProVoicePanel({
  open,
  onOpenChange, 
  currentVoiceTemplate,
  onVoiceSelect,
  onVoiceSelectForAll,
}: ProVoicePanelProps) {
  const [voices, setVoices] = useState<PublicVoiceInfo[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingVoiceName, setPlayingVoiceName] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [pendingVoiceName, setPendingVoiceName] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // 현재 선택된 목소리에 따라 초기 탭 설정
  const initialTab = useMemo(() => {
    if (!currentVoiceTemplate) return 'standard'
    const voiceInfo = voiceTemplateHelpers.getVoiceInfo(currentVoiceTemplate)
    return voiceInfo?.provider === 'elevenlabs' ? 'premium' : 'standard'
  }, [currentVoiceTemplate])

  const [voiceTab, setVoiceTab] = useState<'standard' | 'premium'>(initialTab)

  // voiceTemplate이 변경되면 탭도 업데이트
  useEffect(() => {
    const voiceInfo = voiceTemplateHelpers.getVoiceInfo(currentVoiceTemplate ?? null)
    if (voiceInfo) {
      setVoiceTab(voiceInfo.provider === 'elevenlabs' ? 'premium' : 'standard')
    }
  }, [currentVoiceTemplate])

  // 보이스 목록 로드
  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function loadVoices() {
      setIsLoadingVoices(true)
      setError(null)

      try {
        const token = authStorage.getAccessToken()
        if (!token) {
          if (!cancelled) {
            setError('인증이 필요합니다.')
            setIsLoadingVoices(false)
          }
          return
        }

        const res = await fetch('/api/tts/voices', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          throw new Error('목소리 목록을 불러오는데 실패했습니다.')
        }

        const data = await res.json()
        if (!cancelled) {
          const voicesList = data.voices || []
          setVoices(voicesList)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingVoices(false)
        }
      }
    }

    loadVoices()

    return () => {
      cancelled = true
    }
  }, [open])

  // 패널 외부 클릭 감지
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onOpenChange])

  const getShortName = useCallback((voiceName: string, voice?: PublicVoiceInfo) => {
    if (voice?.provider === 'elevenlabs' && voice.displayName) {
      return voice.displayName
    }
    const parts = voiceName.split('-')
    return parts[parts.length - 1] || voiceName
  }, [])

  const getGenderGroup = useCallback((v: PublicVoiceInfo): GenderGroup => {
    if (v.provider === 'elevenlabs') {
      const g = (v.ssmlGender ?? '').toUpperCase()
      if (g === 'MALE') return 'MALE'
      if (g === 'FEMALE') return 'FEMALE'
      return 'OTHER'
    }

    const short = getShortName(v.name, v).toLowerCase()
    const mapped = GENDER_BY_SHORT_NAME[short]
    if (mapped) return mapped

    const g = (v.ssmlGender ?? '').toUpperCase()
    if (g === 'MALE') return 'MALE'
    if (g === 'FEMALE') return 'FEMALE'
    return 'OTHER'
  }, [getShortName])

  // Provider별로 그룹화
  const groupedByProvider = useMemo(() => {
    const google: PublicVoiceInfo[] = []
    const elevenlabs: PublicVoiceInfo[] = []

    for (const v of voices) {
      if (v.provider === 'elevenlabs') {
        elevenlabs.push(v)
      } else {
        google.push(v)
      }
    }

    const byShortName = (a: PublicVoiceInfo, b: PublicVoiceInfo) =>
      getShortName(a.name, a).localeCompare(getShortName(b.name, b))

    google.sort(byShortName)
    elevenlabs.sort(byShortName)

    return { google, elevenlabs }
  }, [getShortName, voices])

  // 각 Provider 내에서 성별로 그룹화
  const groupByGender = useCallback((voices: PublicVoiceInfo[]) => {
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
      getShortName(a.name, a).localeCompare(getShortName(b.name, b))

    female.sort(byShortName)
    male.sort(byShortName)
    other.sort(byShortName)

    return { female, male, other }
  }, [getGenderGroup, getShortName])

  const playDemo = useCallback(async (voiceName: string) => {
    if (isPlaying && playingVoiceName === voiceName) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setIsPlaying(false)
      setPlayingVoiceName(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    try {
      const voice = voices.find(v => v.name === voiceName)

      if (voice?.provider === 'elevenlabs') {
        const displayName = voice.displayName || voice.voiceId || voiceName.replace(/^elevenlabs:/, '')
        const toCamelCase = (str: string) => {
          if (!str) return str
          return str.charAt(0).toLowerCase() + str.slice(1)
        }
        const fileNameCandidates = [
          `${displayName}_test.wav`,
          `${toCamelCase(displayName)}_test.wav`,
          `${displayName.toLowerCase()}_test.wav`,
        ]

        for (const fileName of fileNameCandidates) {
          const demoPath = `/voice-demos/premium/${fileName}`
          try {
            const response = await fetch(demoPath, { method: 'HEAD', cache: 'no-cache' })
            if (response.ok) {
              const audio = new Audio(demoPath)
              audioRef.current = audio
              audio.onended = () => {
                setIsPlaying(false)
                setPlayingVoiceName(null)
              }
              audio.onerror = () => {
                setIsPlaying(false)
                setPlayingVoiceName(null)
              }
              setPlayingVoiceName(voiceName)
              setIsPlaying(true)
              await audio.play()
              return
            }
          } catch {
            continue
          }
        }
        return
      }

      const isGoogleVoice = !voice || voice.provider === 'google' || !voice.provider
      if (isGoogleVoice) {
        const shortName = getShortName(voiceName, voice)
        const toPascalCase = (str: string) => {
          if (!str) return str
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
        }
        const fileNameCandidates = [
          `${toPascalCase(shortName)}_test.wav`,
          `${shortName}_test.wav`,
          `${shortName.toLowerCase()}_test.wav`,
        ]

        for (const fileName of fileNameCandidates) {
          const demoPath = `/voice-demos/standard/${fileName}`
          try {
            const response = await fetch(demoPath, { method: 'HEAD', cache: 'no-cache' })
            if (response.ok) {
              const audio = new Audio(demoPath)
              audioRef.current = audio
              audio.onended = () => {
                setIsPlaying(false)
                setPlayingVoiceName(null)
              }
              audio.onerror = () => {
                setIsPlaying(false)
                setPlayingVoiceName(null)
              }
              setPlayingVoiceName(voiceName)
              setIsPlaying(true)
              await audio.play()
              return
            }
          } catch {
            continue
          }
        }
        return
      }
    } catch {
      setIsPlaying(false)
      setPlayingVoiceName(null)
    }
  }, [isPlaying, playingVoiceName, voices, getShortName])

  const openConfirm = useCallback((voiceName: string) => {
    // voices 배열에서 해당 voiceName을 가진 보이스를 찾아서 정확한 name 사용
    const voice = voices.find(v => v.name === voiceName)
    if (!voice) {
      // 정확히 일치하는 보이스를 찾지 못한 경우, 부분 일치로 찾기
      const partialMatch = voices.find(v => 
        v.name.includes(voiceName) || voiceName.includes(v.name) ||
        (v.provider === 'google' && v.name.endsWith(voiceName.split('-').pop() || '')) ||
        (v.displayName && v.displayName === voiceName)
      )
      if (partialMatch) {
        setPendingVoiceName(partialMatch.name)
        setConfirmOpen(true)
        return
      }
    }
    const actualVoiceName = voice ? voice.name : voiceName
    setPendingVoiceName(actualVoiceName)
    setConfirmOpen(true)
  }, [voices])

  const confirmSelection = useCallback(() => {
    if (!pendingVoiceName) return
    
    // 데모 오디오 정지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setIsPlaying(false)
    setPlayingVoiceName(null)
    
    // VoiceInfo로 변환하여 직렬화
    const voice = voices.find(v => v.name === pendingVoiceName)
    let serialized: string | null = null
    let voiceLabel = ''
    
    if (voice) {
      const voiceInfo = publicVoiceInfoToVoiceInfo(voice)
      if (voiceInfo) {
        serialized = voiceTemplateHelpers.setVoiceInfo(voiceInfo)
        voiceLabel = voiceInfo.displayName || getShortName(voice.name, voice)
      } else {
        serialized = pendingVoiceName
        voiceLabel = getShortName(voice.name, voice)
      }
    } else {
      serialized = pendingVoiceName
      voiceLabel = getShortName(pendingVoiceName, undefined)
    }
    
    // 이 씬만 적용
    onVoiceSelect(serialized, voiceLabel)
    setConfirmOpen(false)
    setPendingVoiceName(null)
    onOpenChange(false)
  }, [pendingVoiceName, voices, onVoiceSelect, onOpenChange, getShortName])

  const applyToAllScenes = useCallback(() => {
    if (!pendingVoiceName || !onVoiceSelectForAll) {
      return
    }
    
    // 데모 오디오 정지
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setIsPlaying(false)
    setPlayingVoiceName(null)
    
    // VoiceInfo로 변환하여 직렬화
    const voice = voices.find(v => v.name === pendingVoiceName)
    let serialized: string | null = null
    let voiceLabel = ''
    
    if (voice) {
      const voiceInfo = publicVoiceInfoToVoiceInfo(voice)
      if (voiceInfo) {
        serialized = voiceTemplateHelpers.setVoiceInfo(voiceInfo)
        voiceLabel = voiceInfo.displayName || getShortName(voice.name, voice)
      } else {
        serialized = pendingVoiceName
        voiceLabel = getShortName(voice.name, voice)
      }
    } else {
      serialized = pendingVoiceName
      voiceLabel = getShortName(pendingVoiceName, undefined)
    }
    
    // 전체 씬에 적용
    onVoiceSelectForAll(serialized, voiceLabel)
    setConfirmOpen(false)
    setPendingVoiceName(null)
    onOpenChange(false)
  }, [pendingVoiceName, voices, onVoiceSelectForAll, onOpenChange, getShortName])

  const renderVoiceItem = useCallback((v: PublicVoiceInfo) => {
    const currentVoiceInfo = voiceTemplateHelpers.getVoiceInfo(currentVoiceTemplate ?? null)
    const isSelected = currentVoiceInfo
      ? (currentVoiceInfo.provider === (v.provider || 'google') &&
        (v.provider === 'elevenlabs'
          ? currentVoiceInfo.voiceId === v.voiceId
          : currentVoiceInfo.voiceId === v.name))
      : currentVoiceTemplate === v.name
    const label = getShortName(v.name, v)

    const isPopoverOpen = confirmOpen && pendingVoiceName === v.name

    return (
      <Popover
        key={`${v.provider || 'google'}:${v.voiceId || v.name}`}
        open={isPopoverOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false)
            setPendingVoiceName(null)
          }
        }}
      >
        <PopoverTrigger asChild>
          <div className="flex items-center gap-2 h-[46px] transition-all hover:opacity-90 min-w-0">
            <div
              className="w-6 h-6 flex items-center justify-center shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
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
              onClick={(e) => {
                e.stopPropagation()
                openConfirm(v.name)
              }}
              className={`flex-1 rounded-lg border h-[46px] flex items-center cursor-pointer min-w-0 ${
                isSelected
                  ? 'bg-[#5e8790] border-[#5e8790]'
                  : 'bg-white border-[#88a9ac]'
              }`}
            >
              <div className="px-3 sm:px-4 flex items-center w-full min-w-0">
                <span
                  className={`font-medium tracking-[-0.32px] truncate ${
                    isSelected ? 'text-white' : 'text-[#2c2c2c]'
                  }`}
                  style={{
                    fontSize: 'var(--font-size-16)',
                    lineHeight: '22.4px',
                  }}
                >
                  {label}
                </span>
              </div>
            </div>
          </div>
        </PopoverTrigger>
        
        {/* 확인 팝오버 */}
        <PopoverContent
          side="top"
          align="center"
          sideOffset={12}
          className="w-80 p-5 relative bg-white border-gray-200 z-60"
          onOpenAutoFocus={() => {
            // Popover opened
          }}
          onInteractOutside={(e) => {
            // 버튼 클릭은 허용
            if ((e.target as HTMLElement).closest('button')) {
              e.preventDefault()
            }
          }}
          onClick={(e) => {
            // 버튼 클릭은 허용하되, 외부 클릭으로 팝오버가 닫히지 않도록
            if ((e.target as HTMLElement).closest('button')) {
              e.stopPropagation()
            }
          }}
        >
          <div className="space-y-4">
            <div 
              className="font-semibold text-text-dark tracking-[-0.32px]"
              style={{ 
                fontSize: 'var(--font-size-16)',
                lineHeight: 'var(--line-height-16-140)'
              }}
            >
              이 목소리의 적용범위를 알려주세요!
            </div>
            
            {/* 안내 메시지 */}
            <div className="flex items-start gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <span 
                className="text-gray-400 tracking-[-0.28px]"
                style={{ 
                  fontSize: 'var(--font-size-12)',
                  lineHeight: 'var(--line-height-12-140)'
                }}
              >
                씬마다 목소리를 다르게 설정할 수도 있어요!
              </span>
            </div>
            
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  setConfirmOpen(false)
                  setPendingVoiceName(null)
                }}
                className="flex-1 bg-white border-gray-300 text-text-dark hover:bg-gray-50"
              >
                다시 선택하기
              </Button>
              <Button
                type="button"
                size="sm"
                onMouseDown={(e) => {
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (!pendingVoiceName) return
                  if (!onVoiceSelect) return
                  confirmSelection()
                }}
                className="flex-1 bg-brand-teal hover:bg-brand-teal-dark text-white cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                이 씬만
              </Button>
              {onVoiceSelectForAll ? (
                <Button
                  type="button"
                  size="sm"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    if (!pendingVoiceName) return
                    if (!onVoiceSelectForAll) return
                    applyToAllScenes()
                  }}
                  className="flex-1 bg-[#344e57] hover:bg-[#2a3f46] text-white cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  전체
                </Button>
              ) : (
                <div className="flex-1 text-center text-red-500 text-xs">
                  onVoiceSelectForAll 없음
                </div>
              )}
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
  }, [currentVoiceTemplate, getShortName, playDemo, confirmOpen, pendingVoiceName, openConfirm, confirmSelection, applyToAllScenes, onVoiceSelectForAll, onVoiceSelect])

  const renderGenderColumn = useCallback((voices: PublicVoiceInfo[], genderLabel: string) => {
    if (voices.length === 0) return null

    const uniqueVoices = voices.filter((v, index, self) => {
      const key = `${v.provider || 'google'}:${v.voiceId || v.name}`
      return index === self.findIndex(vo => `${vo.provider || 'google'}:${vo.voiceId || vo.name}` === key)
    })

    return (
      <div className="flex-1 space-y-2">
        <div>
          <h5
            className="font-bold text-text-dark text-center tracking-[-0.36px]"
            style={{
              fontSize: 'var(--font-size-16)',
              lineHeight: '22.4px',
            }}
          >
            {genderLabel}
          </h5>
          <div className="h-0.5 bg-[#bbc9c9] mt-2" />
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {uniqueVoices.map(renderVoiceItem)}
        </div>
      </div>
    )
  }, [renderVoiceItem])

  if (!open) return null

  return (
    <motion.div
      ref={panelRef}
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[min(calc(100vw-2rem),560px)] min-w-[360px] sm:w-[640px] sm:min-w-0 max-h-[85vh] flex flex-col bg-white/40 border border-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6"
      style={{ boxShadow: 'var(--shadow-container)' }}
    >
      <div className="mb-4 shrink-0 min-w-0">
        <h3
          className="font-bold text-text-dark tracking-[-0.4px] truncate whitespace-nowrap"
          style={{
            fontSize: 'var(--font-size-20)',
            lineHeight: '28px',
          }}
        >
          보이스 선택
        </h3>
      </div>

      {isLoadingVoices ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#5e8790]" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 py-4">{error}</div>
      ) : voices.length === 0 ? (
        <div className="text-sm text-text-dark py-4">사용 가능한 목소리가 없어요.</div>
      ) : (
        <Tabs value={voiceTab} onValueChange={(v) => setVoiceTab(v as 'standard' | 'premium')} className="w-full min-h-0 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="standard" className="text-sm font-medium">
              Standard
            </TabsTrigger>
            <TabsTrigger value="premium" className="text-sm font-medium">
              Premium
            </TabsTrigger>
          </TabsList>

          {/* Standard 탭 */}
          <TabsContent value="standard" className="space-y-4 mt-0 min-h-0 overflow-y-auto flex-1">
            {groupedByProvider.google.length > 0 ? (() => {
              const googleByGender = groupByGender(groupedByProvider.google)
              return (
                <div className="grid grid-cols-2 gap-4">
                  {renderGenderColumn(googleByGender.female, '보이스 | 여성')}
                  {renderGenderColumn(googleByGender.male, '보이스 | 남성')}
                </div>
              )
            })() : (
              <div className="text-sm text-text-dark text-center py-8">
                Standard 목소리가 없어요.
              </div>
            )}
          </TabsContent>

          {/* Premium 탭 */}
          <TabsContent value="premium" className="space-y-4 mt-0 min-h-0 overflow-y-auto flex-1">
            {groupedByProvider.elevenlabs.length > 0 ? (() => {
              const elevenlabsByGender = groupByGender(groupedByProvider.elevenlabs)
              return (
                <div className="grid grid-cols-2 gap-4">
                  {renderGenderColumn(elevenlabsByGender.female, '보이스 | 여성')}
                  {renderGenderColumn(elevenlabsByGender.male, '보이스 | 남성')}
                </div>
              )
            })() : (
              <div className="text-sm text-text-dark text-center py-8">
                Premium 목소리가 없어요.
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  )
}
