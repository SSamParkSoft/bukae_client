'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVideoCreateStore, voiceTemplateHelpers } from '@/store/useVideoCreateStore'
import { authStorage } from '@/lib/api/auth-storage'
import type { PublicVoiceInfo } from '@/lib/types/tts'
import { publicVoiceInfoToVoiceInfo } from '@/lib/types/tts'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

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

interface VoiceSelectorProps {
  theme?: string
  title?: string
  disabled?: boolean
  layout?: 'page' | 'panel'
}

export default function VoiceSelector({
  theme: _theme,
  title = '목소리 선택',
  disabled = false,
  layout: _layout = 'page',
}: VoiceSelectorProps) {
  // 향후 사용을 위해 prop 유지
  void _theme
  void _layout
  const { voiceTemplate, setVoiceTemplate } = useVideoCreateStore()
  const [voices, setVoices] = useState<PublicVoiceInfo[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingVoiceName, setPendingVoiceName] = useState<string | null>(null)
  const [playingVoiceName, setPlayingVoiceName] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // 현재 선택된 목소리에 따라 초기 탭 설정
  const initialTab = useMemo(() => {
    if (!voiceTemplate) return 'standard'
    const voiceInfo = voiceTemplateHelpers.getVoiceInfo(voiceTemplate)
    return voiceInfo?.provider === 'elevenlabs' ? 'premium' : 'standard'
  }, [voiceTemplate])
  
  const [voiceTab, setVoiceTab] = useState<'standard' | 'premium'>(initialTab)
  
  // voiceTemplate이 변경되면 탭도 업데이트
  useEffect(() => {
    const voiceInfo = voiceTemplateHelpers.getVoiceInfo(voiceTemplate)
    if (voiceInfo) {
      setVoiceTab(voiceInfo.provider === 'elevenlabs' ? 'premium' : 'standard')
    }
  }, [voiceTemplate])

  useEffect(() => {
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

        // 모든 음성을 한 번에 가져오기
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
          // 디버깅: Provider별 목소리 확인
          const googleVoices = voicesList.filter((v: PublicVoiceInfo) => v.provider === 'google' || !v.provider)
          const elevenlabsVoices = voicesList.filter((v: PublicVoiceInfo) => v.provider === 'elevenlabs')
          console.log('[VoiceSelector] Initial voices loaded:', voicesList.length)
          console.log('[VoiceSelector] Google voices:', googleVoices.length)
          console.log('[VoiceSelector] ElevenLabs voices:', elevenlabsVoices.length)
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
  }, [])


  const openConfirm = useCallback((voiceName: string) => {
    setPendingVoiceName(voiceName)
    setConfirmOpen(true)
  }, [])

  const confirmSelection = useCallback(() => {
    if (!pendingVoiceName) return
    // VoiceInfo로 변환하여 직렬화
    const voice = voices.find(v => v.name === pendingVoiceName)
    if (voice) {
      // PublicVoiceInfo를 VoiceInfo로 변환
      const voiceInfo = publicVoiceInfoToVoiceInfo(voice)
      
      if (voiceInfo) {
        const serialized = voiceTemplateHelpers.setVoiceInfo(voiceInfo)
        setVoiceTemplate(serialized)
      } else {
        // 변환 실패 시 기존 방식 유지 (하위 호환성)
        setVoiceTemplate(pendingVoiceName)
      }
    } else {
      // voice를 찾지 못한 경우 기존 방식 유지
      setVoiceTemplate(pendingVoiceName)
    }
    setConfirmOpen(false)
  }, [pendingVoiceName, setVoiceTemplate, voices])

  const playDemo = useCallback(async (voiceName: string) => {
    if (isPlaying && playingVoiceName === voiceName) {
      // 같은 목소리면 정지
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setIsPlaying(false)
      setPlayingVoiceName(null)
      return
    }

    // 다른 목소리면 재생
    if (audioRef.current) {
      audioRef.current.pause()
    }

    try {
      const voice = voices.find(v => v.name === voiceName)
      
      // Premium 목소리 (ElevenLabs)인 경우 정적 파일 재생
      if (voice?.provider === 'elevenlabs') {
        const displayName = voice.displayName || voice.voiceId || voiceName.replace(/^elevenlabs:/, '')
        // 파일명 후보: 원본 displayName과 소문자 버전 모두 시도
        const fileNameCandidates = [
          `${displayName}_test.wav`,  // 원본 (예: MichaelMouse_test.wav)
          `${displayName.toLowerCase()}_test.wav`,  // 소문자 (예: michaelmouse_test.wav)
        ]
        
        // 각 파일명 후보를 순차적으로 시도
        for (const fileName of fileNameCandidates) {
          const demoPath = `/voice-demos/premium/${fileName}`
          
          try {
            const response = await fetch(demoPath, { 
              method: 'HEAD',
              cache: 'no-cache' 
            })
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
              return // 정적 파일 재생 성공
            }
          } catch {
            // 파일이 없으면 다음 후보 시도
            continue
          }
        }
        // 모든 후보를 시도했지만 파일을 찾지 못한 경우
        return
      }
      
      // Google TTS인 경우 정적 파일 재생
      // voice가 없거나 provider가 'elevenlabs'가 아닌 경우 Google TTS로 간주
      const isGoogleVoice = !voice || voice.provider === 'google' || !voice.provider
      if (isGoogleVoice) {
        // voiceName을 슬러그 형식으로 변환 (예: ko-KR-Chirp3-HD-Achernar → chirp3-hd-achernar)
        const slugName = voiceName
          .replace(/^ko-KR[-_]?/i, '')
          .replace(/[-_]/g, '-')
          .toLowerCase()
        
        // 데모 파일 경로 시도 (Standard 데모는 standard 폴더에)
        // 슬러그 형식 우선, 그 다음 원본 voiceName
        const demoPaths = [
          `/voice-demos/standard/${slugName}.wav`,  // 실제 파일 형식 우선
          `/voice-demos/standard/${slugName}.mp3`,
          `/voice-demos/standard/${encodeURIComponent(voiceName)}.wav`,
          `/voice-demos/standard/${encodeURIComponent(voiceName)}.mp3`,
        ]

        // 데모 파일 존재 여부 확인 (HEAD 요청으로 404 오류 최소화)
        for (const demoPath of demoPaths) {
          try {
            const response = await fetch(demoPath, { 
              method: 'HEAD',
              cache: 'no-cache' 
            })
            if (response.ok) {
              // 데모 파일이 있으면 재생
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
              return // 데모 파일 재생 성공
            }
          } catch {
            // 파일이 없으면 다음 경로 시도 (조용히 넘어감)
            continue
          }
        }
      }

      // 정적 파일이 없으면 재생 실패 (조용히 처리)
      return
    } catch (err) {
      console.error('음성 재생 실패:', err)
      setIsPlaying(false)
      setPlayingVoiceName(null)
    }
  }, [isPlaying, playingVoiceName, voices])

  const getShortName = useCallback((voiceName: string, voice?: PublicVoiceInfo) => {
    // 일레븐랩스인 경우 - 실제 이름 사용
    if (voice?.provider === 'elevenlabs' && voice.displayName) {
      return voice.displayName
    }
    // Google TTS인 경우 - 마지막 부분만 추출
    const parts = voiceName.split('-')
    return parts[parts.length - 1] || voiceName
  }, [])

  const getGenderGroup = useCallback((v: PublicVoiceInfo): GenderGroup => {
    // Premium 목소리 (ElevenLabs)인 경우 ssmlGender를 우선적으로 사용
    if (v.provider === 'elevenlabs') {
      const g = (v.ssmlGender ?? '').toUpperCase()
      if (g === 'MALE') return 'MALE'
      if (g === 'FEMALE') return 'FEMALE'
      return 'OTHER'
    }
    
    // Google TTS인 경우 기존 로직 사용
    const short = getShortName(v.name, v).toLowerCase()
    const mapped = GENDER_BY_SHORT_NAME[short]
    if (mapped) return mapped

    const g = (v.ssmlGender ?? '').toUpperCase()
    if (g === 'MALE') return 'MALE'
    if (g === 'FEMALE') return 'FEMALE'
    return 'OTHER'
  }, [getShortName])

  // Provider별로 그룹화 (Google TTS / ElevenLabs)
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
  const groupByGender = (voices: PublicVoiceInfo[]) => {
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
  }

  const currentLabel = useMemo(() => {
    if (!voiceTemplate) return '선택된 목소리 없음'
    
    // VoiceInfo로 파싱 시도
    const voiceInfo = voiceTemplateHelpers.getVoiceInfo(voiceTemplate)
    if (voiceInfo) {
      return voiceInfo.displayName
    }
    
    // 기존 형식으로 fallback
    return getShortName(voiceTemplate)
  }, [getShortName, voiceTemplate])

  // 목소리 아이템 렌더링 헬퍼
  const renderVoiceItem = useCallback((v: PublicVoiceInfo) => {
    const currentVoiceInfo = voiceTemplateHelpers.getVoiceInfo(voiceTemplate)
    const isSelected = currentVoiceInfo
      ? (currentVoiceInfo.provider === (v.provider || 'google') && 
        (v.provider === 'elevenlabs' 
          ? currentVoiceInfo.voiceId === v.voiceId
          : currentVoiceInfo.voiceId === v.name))
      : voiceTemplate === v.name
    // 향후 사용을 위해 변수 유지
    void (isPlaying && playingVoiceName === v.name)
    const label = getShortName(v.name, v)
    const isThisConfirmOpen = confirmOpen && pendingVoiceName === v.name

    // 고유한 키 생성: provider와 voiceId 조합
    const uniqueKey = `${v.provider || 'google'}:${v.voiceId || v.name}`
    
    return (
      <Popover key={uniqueKey} open={isThisConfirmOpen} onOpenChange={(open) => {
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
              <div className="px-4 flex items-center w-full">
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
  }, [voiceTemplate, isPlaying, playingVoiceName, confirmOpen, pendingVoiceName, disabled, getShortName, openConfirm, playDemo, confirmSelection])

  // 성별 그룹 렌더링 헬퍼
  const renderGenderGroup = useCallback((voices: PublicVoiceInfo[], genderLabel: string) => {
    if (voices.length === 0) return null

    // 중복 제거: 같은 키를 가진 음성 제거
    const uniqueVoices = voices.filter((v, index, self) => {
      const key = `${v.provider || 'google'}:${v.voiceId || v.name}`
      return index === self.findIndex(vo => `${vo.provider || 'google'}:${vo.voiceId || vo.name}` === key)
    })

    return (
      <div className="space-y-4">
        <div>
          <h5 
            className="font-bold text-text-dark text-center tracking-[-0.36px]"
            style={{ 
              fontSize: 'var(--font-size-16)',
              lineHeight: '22.4px'
            }}
          >
            {genderLabel}
          </h5>
          <div className="h-0.5 bg-[#bbc9c9] mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {uniqueVoices.map(renderVoiceItem)}
        </div>
      </div>
    )
  }, [renderVoiceItem])

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
        {isLoadingVoices ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#5e8790]" />
          </div>
        ) : voices.length === 0 ? (
          <div className="text-sm text-text-dark">
            사용 가능한 목소리가 없어요.
          </div>
        ) : (
          <Tabs value={voiceTab} onValueChange={(v) => setVoiceTab(v as 'standard' | 'premium')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="standard" className="text-sm font-medium">
                Standard
              </TabsTrigger>
              <TabsTrigger value="premium" className="text-sm font-medium">
                Premium
              </TabsTrigger>
            </TabsList>

            {/* Standard 탭: Google TTS */}
            <TabsContent value="standard" className="space-y-6 mt-0">
              {groupedByProvider.google.length > 0 ? (() => {
                const googleByGender = groupByGender(groupedByProvider.google)
                return (
                  <>
                    {renderGenderGroup(googleByGender.female, '여성 목소리')}
                    {renderGenderGroup(googleByGender.male, '남성 목소리')}
                    {renderGenderGroup(googleByGender.other, '기타')}
                    {/* Powered by Google TTS */}
                    <div className="text-center pt-2">
                      <span className="text-gray-400 text-xs tracking-[-0.14px]">
                        Powered by Google TTS
                      </span>
                    </div>
                  </>
                )
              })() : (
                <>
                  <div className="text-sm text-text-dark text-center py-8">
                    Standard 목소리가 없어요.
                  </div>
                  {/* Powered by Google TTS */}
                  <div className="text-center pt-2">
                    <span className="text-gray-400 text-xs tracking-[-0.14px]">
                      Powered by Google TTS
                    </span>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Premium 탭: ElevenLabs 목소리 */}
            <TabsContent value="premium" className="space-y-6 mt-0">
              {groupedByProvider.elevenlabs.length > 0 ? (() => {
                const elevenlabsByGender = groupByGender(groupedByProvider.elevenlabs)
                return (
                  <>
                    {renderGenderGroup(elevenlabsByGender.female, '여성 목소리')}
                    {renderGenderGroup(elevenlabsByGender.male, '남성 목소리')}
                    {renderGenderGroup(elevenlabsByGender.other, '기타')}
                    {/* Powered by ElevenLabs */}
                    <div className="text-center pt-2">
                      <span className="text-gray-400 text-xs tracking-[-0.14px]">
                        Powered by ElevenLabs
                      </span>
                    </div>
                  </>
                )
              })() : (
                <>
                  <div className="text-sm text-text-dark text-center py-8 space-y-2">
                    <div>Premium 목소리가 없어요.</div>
                    <div className="text-xs text-gray-500">
                      ElevenLabs API 키가 설정되어 있는지 확인해주세요.
                    </div>
                  </div>
                  {/* Powered by ElevenLabs */}
                  <div className="text-center pt-2">
                    <span className="text-gray-400 text-xs tracking-[-0.14px]">
                      Powered by ElevenLabs
                    </span>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
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
