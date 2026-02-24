'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVideoCreateStore, voiceTemplateHelpers } from '@/store/useVideoCreateStore'
import { authStorage } from '@/lib/api/auth-storage'
import type { PublicVoiceInfo } from '@/lib/types/tts'
import { publicVoiceInfoToVoiceInfo } from '@/lib/types/tts'
import { fetchAndCachePublicVoices, getCachedPublicVoices } from '@/lib/tts/public-voices-cache'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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

interface VoiceSelectorProps {
  theme?: string
  title?: string
  disabled?: boolean
  layout?: 'page' | 'panel'
  sceneVoiceTemplate?: string | null // 씬별 voiceTemplate (있으면 이걸 사용, 없으면 전역 voiceTemplate 사용)
  onSceneVoiceTemplateChange?: (voiceTemplate: string | null) => void // 씬별 voiceTemplate 변경 핸들러
}

export default function VoiceSelector({
  theme: _theme,
  title = '목소리 선택',
  disabled = false,
  layout: _layout = 'page',
  sceneVoiceTemplate,
  onSceneVoiceTemplateChange,
}: VoiceSelectorProps) {
  // 향후 사용을 위해 prop 유지
  void _theme
  void _layout
  const { voiceTemplate: globalVoiceTemplate, setVoiceTemplate, timeline, setTimeline } = useVideoCreateStore()
  const cachedVoices = getCachedPublicVoices() ?? []
  
  // 씬별 voiceTemplate이 있으면 사용, 없으면 전역 voiceTemplate 사용
  const voiceTemplate = sceneVoiceTemplate !== undefined ? sceneVoiceTemplate : globalVoiceTemplate
  const [voices, setVoices] = useState<PublicVoiceInfo[]>(cachedVoices)
  const [isLoadingVoices, setIsLoadingVoices] = useState(cachedVoices.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingVoiceName, setPendingVoiceName] = useState<string | null>(null)
  const [playingVoiceName, setPlayingVoiceName] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loadingPreviewVoiceName, setLoadingPreviewVoiceName] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previewRequestIdRef = useRef(0)
  
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
      const cached = getCachedPublicVoices() ?? []
      if (cached.length > 0 && !cancelled) {
        setVoices(cached)
      }
      setIsLoadingVoices(cached.length === 0)
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

        const voicesList = await fetchAndCachePublicVoices(token)
        if (!cancelled) {
          setVoices(voicesList)
          // 디버깅: Provider별 목소리 확인
          const _googleVoices = voicesList.filter((v: PublicVoiceInfo) => v.provider === 'google' || !v.provider)
          const _elevenlabsVoices = voicesList.filter((v: PublicVoiceInfo) => v.provider === 'elevenlabs')
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
    
    // 데모 오디오 정지
    previewRequestIdRef.current += 1
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setLoadingPreviewVoiceName(null)
    setIsPlaying(false)
    setPlayingVoiceName(null)
    
    // VoiceInfo로 변환하여 직렬화
    const voice = voices.find(v => v.name === pendingVoiceName)
    let serialized: string | null = null
    
    if (voice) {
      // PublicVoiceInfo를 VoiceInfo로 변환
      const voiceInfo = publicVoiceInfoToVoiceInfo(voice)
      
      if (voiceInfo) {
        serialized = voiceTemplateHelpers.setVoiceInfo(voiceInfo)
      } else {
        // 변환 실패 시 기존 방식 유지 (하위 호환성)
        serialized = pendingVoiceName
      }
    } else {
      // voice를 찾지 못한 경우 기존 방식 유지
      serialized = pendingVoiceName
    }
    
    // 씬별 voiceTemplate 변경 핸들러가 있으면 사용, 없으면 전역 voiceTemplate 업데이트
    if (onSceneVoiceTemplateChange) {
      // "이 씬만": 특정 씬의 voiceTemplate만 설정 (전역 voiceTemplate은 변경하지 않음)
      onSceneVoiceTemplateChange(serialized)
    } else {
      // 씬별 핸들러가 없으면 전역 voiceTemplate 업데이트
      setVoiceTemplate(serialized)
    }
    
    setConfirmOpen(false)
  }, [pendingVoiceName, setVoiceTemplate, voices, onSceneVoiceTemplateChange])

  // 전체에 적용하기: 전역 voiceTemplate 설정 + 모든 씬에 기본값으로 반영
  const applyToAllScenes = useCallback(() => {
    if (!pendingVoiceName) return
    
    // 데모 오디오 정지
    previewRequestIdRef.current += 1
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setLoadingPreviewVoiceName(null)
    setIsPlaying(false)
    setPlayingVoiceName(null)
    
    // VoiceInfo로 변환하여 직렬화 (confirmSelection과 동일한 로직 재사용)
    const voice = voices.find(v => v.name === pendingVoiceName)
    let serialized: string | null = null
    
    if (voice) {
      const voiceInfo = publicVoiceInfoToVoiceInfo(voice)
      if (voiceInfo) {
        serialized = voiceTemplateHelpers.setVoiceInfo(voiceInfo)
      } else {
        serialized = pendingVoiceName
      }
    } else {
      serialized = pendingVoiceName
    }

    // 전역 voiceTemplate 업데이트
    setVoiceTemplate(serialized)

    // 씬별 voiceTemplate을 모두 덮어쓰기
    if (timeline && serialized) {
      const updatedScenes = timeline.scenes.map((scene) => ({
        ...scene,
        voiceTemplate: serialized,
      }))

      setTimeline({
        ...timeline,
        scenes: updatedScenes,
      })
    }

    setConfirmOpen(false)
  }, [pendingVoiceName, setVoiceTemplate, timeline, setTimeline, voices])

  const getShortName = useCallback((voiceName: string, voice?: PublicVoiceInfo) => {
    // 일레븐랩스인 경우 - 실제 이름 사용
    if (voice?.provider === 'elevenlabs' && voice.displayName) {
      return voice.displayName
    }
    // Google TTS인 경우 - 마지막 부분만 추출
    const parts = voiceName.split('-')
    return parts[parts.length - 1] || voiceName
  }, [])

  const playDemo = useCallback(async (voiceName: string) => {
    const requestId = previewRequestIdRef.current + 1
    previewRequestIdRef.current = requestId

    if (isPlaying && playingVoiceName === voiceName) {
      // 같은 목소리면 정지
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setLoadingPreviewVoiceName(null)
      setIsPlaying(false)
      setPlayingVoiceName(null)
      return
    }

    // 다른 목소리면 재생
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setLoadingPreviewVoiceName(voiceName)

    try {
      const voice = voices.find(v => v.name === voiceName)
      
      // Premium 목소리 (ElevenLabs)인 경우 정적 파일 재생
      if (voice?.provider === 'elevenlabs') {
        const displayName = voice.displayName || voice.voiceId || voiceName.replace(/^elevenlabs:/, '')
        // 카멜케이스 변환 함수 (첫 글자만 소문자)
        const toCamelCase = (str: string) => {
          if (!str) return str
          return str.charAt(0).toLowerCase() + str.slice(1)
        }
        // 파일명 후보: 원본, 카멜케이스, 소문자 버전 모두 시도
        const fileNameCandidates = [
          `${displayName}_test.wav`,  // 원본 (예: MichaelMouse_test.wav)
          `${toCamelCase(displayName)}_test.wav`,  // 카멜케이스 (예: michaelMouse_test.wav)
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
            if (previewRequestIdRef.current !== requestId) return
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
              if (previewRequestIdRef.current === requestId) {
                setLoadingPreviewVoiceName(null)
              }
              return // 정적 파일 재생 성공
            }
          } catch {
            // 파일이 없으면 다음 후보 시도
            continue
          }
        }
        // 모든 후보를 시도했지만 파일을 찾지 못한 경우
        if (previewRequestIdRef.current === requestId) {
          setLoadingPreviewVoiceName(null)
        }
        return
      }
      
      // Google TTS인 경우 정적 파일 재생
      // voice가 없거나 provider가 'elevenlabs'가 아닌 경우 Google TTS로 간주
      const isGoogleVoice = !voice || voice.provider === 'google' || !voice.provider
      if (isGoogleVoice) {
        // Premium처럼 파싱: voiceName에서 마지막 부분 추출 (예: ko-KR-Chirp3-HD-Achernar → Achernar)
        const shortName = getShortName(voiceName, voice)
        // 카멜케이스 변환 함수 (첫 글자만 대문자)
        const toPascalCase = (str: string) => {
          if (!str) return str
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
        }
        // 파일명 후보: PascalCase, 원본, 소문자 버전 모두 시도
        const fileNameCandidates = [
          `${toPascalCase(shortName)}_test.wav`,  // PascalCase (예: Achernar_test.wav)
          `${shortName}_test.wav`,  // 원본 (예: Achernar_test.wav)
          `${shortName.toLowerCase()}_test.wav`,  // 소문자 (예: achernar_test.wav)
        ]
        
        // 각 파일명 후보를 순차적으로 시도
        for (const fileName of fileNameCandidates) {
          const demoPath = `/voice-demos/standard/${fileName}`
          
          try {
            const response = await fetch(demoPath, { 
              method: 'HEAD',
              cache: 'no-cache' 
            })
            if (previewRequestIdRef.current !== requestId) return
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
              if (previewRequestIdRef.current === requestId) {
                setLoadingPreviewVoiceName(null)
              }
              return // 정적 파일 재생 성공
            }
          } catch {
            // 파일이 없으면 다음 후보 시도
            continue
          }
        }
        // 모든 후보를 시도했지만 파일을 찾지 못한 경우
        if (previewRequestIdRef.current === requestId) {
          setLoadingPreviewVoiceName(null)
        }
        return
      }

      // 정적 파일이 없으면 재생 실패 (조용히 처리)
      if (previewRequestIdRef.current === requestId) {
        setLoadingPreviewVoiceName(null)
      }
      return
    } catch (err) {
      console.error('음성 재생 실패:', err)
      if (previewRequestIdRef.current === requestId) {
        setLoadingPreviewVoiceName(null)
        setIsPlaying(false)
        setPlayingVoiceName(null)
      }
    }
  }, [isPlaying, playingVoiceName, voices, getShortName])

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
    const isPreviewLoading = loadingPreviewVoiceName === v.name
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
            className="flex items-center gap-2 sm:gap-4 h-[46px] transition-all hover:opacity-90 min-w-0"
          >
            <div 
              className="w-6 h-6 flex items-center justify-center shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                if (disabled || isPreviewLoading) return
                playDemo(v.name)
              }}
            >
              {isPreviewLoading ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin text-[#5e8790]" />
              ) : (
                <Image 
                  src="/voiceplay.svg" 
                  alt="재생" 
                  width={18} 
                  height={19}
                  className="w-[18px] h-[19px]"
                />
              )}
            </div>
            <div 
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
                onClick={() => setConfirmOpen(false)}
                className="flex-1 bg-white border-gray-300 text-text-dark hover:bg-gray-50"
              >
                다시 선택
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmSelection}
                className="flex-1 bg-brand-teal hover:bg-brand-teal-dark text-white"
              >
                이 씬만
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={applyToAllScenes}
                className="flex-1 bg-[#344e57] hover:bg-[#2a3f46] text-white"
              >
                전체
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
  }, [voiceTemplate, isPlaying, playingVoiceName, loadingPreviewVoiceName, confirmOpen, pendingVoiceName, disabled, getShortName, openConfirm, playDemo, confirmSelection, applyToAllScenes])

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          {uniqueVoices.map(renderVoiceItem)}
        </div>
      </div>
    )
  }, [renderVoiceItem])

  const renderLoadingCards = useCallback(() => (
    <div className="space-y-4">
      <div className="text-sm text-[#5d5d5d]">목소리 목록을 불러오는 중이에요.</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={`voice-loading-${index}`} className="flex items-center gap-2 sm:gap-4 h-[46px] min-w-0">
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <Loader2 className="w-[18px] h-[18px] animate-spin text-[#5e8790]" />
            </div>
            <div className="flex-1 rounded-lg border border-[#d3dbdc] bg-white/70 h-[46px] flex items-center px-3 sm:px-4">
              <div className="h-4 w-24 rounded bg-[#dfe6e7] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ), [])

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
        {isLoadingVoices && voices.length === 0 ? (
          renderLoadingCards()
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
