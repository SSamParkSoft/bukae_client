'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { voiceTemplateHelpers } from '@/store/useVideoCreateStore'
import { authStorage } from '@/lib/api/auth-storage'
import type { PublicVoiceInfo } from '@/lib/types/tts'
import { publicVoiceInfoToVoiceInfo } from '@/lib/types/tts'
import { fetchAndCachePublicVoices, getCachedPublicVoices } from '@/lib/tts/public-voices-cache'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Loader2, Info } from 'lucide-react'

type GenderGroup = 'MALE' | 'FEMALE' | 'OTHER'

const GENDER_BY_SHORT_NAME: Record<string, GenderGroup> = {
  achernar: 'FEMALE', achird: 'MALE', algenib: 'MALE', algieba: 'MALE',
  alnilam: 'MALE', aoede: 'FEMALE', autonoe: 'FEMALE', callirrhoe: 'FEMALE',
  charon: 'MALE', despina: 'FEMALE', enceladus: 'MALE', erinome: 'FEMALE',
  fenrir: 'MALE', gacrux: 'FEMALE', iapetus: 'MALE', kore: 'FEMALE',
  laomedeia: 'FEMALE', leda: 'FEMALE', orus: 'MALE', pulcherrima: 'FEMALE',
  puck: 'MALE', rasalgethi: 'MALE', sadachbia: 'MALE', sadaltager: 'MALE',
  schedar: 'MALE', sulafat: 'FEMALE', umbriel: 'MALE', vindemiatrix: 'FEMALE',
  zephyr: 'FEMALE', zubenelgenubi: 'MALE',
}

export interface ProStep3VoicePanelProps {
  currentVoiceTemplate?: string | null
  synthesizingScenes?: Set<number>
  onVoiceSelect: (voiceTemplate: string | null, voiceLabel: string) => void
  onVoiceSelectForAll?: (voiceTemplate: string | null, voiceLabel: string) => void
}

export function ProStep3VoicePanel({
  currentVoiceTemplate,
  synthesizingScenes,
  onVoiceSelect,
  onVoiceSelectForAll,
}: ProStep3VoicePanelProps) {
  const cachedVoices = getCachedPublicVoices() ?? []
  const [voices, setVoices] = useState<PublicVoiceInfo[]>(cachedVoices)
  const [isLoadingVoices, setIsLoadingVoices] = useState(cachedVoices.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [playingVoiceName, setPlayingVoiceName] = useState<string | null>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [loadingPreviewVoiceName, setLoadingPreviewVoiceName] = useState<string | null>(null)
  const [pendingVoiceName, setPendingVoiceName] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isMountedRef = useRef(true)
  const previewRequestIdRef = useRef(0)

  const initialTab = useMemo(() => {
    if (!currentVoiceTemplate) return 'standard'
    const voiceInfo = voiceTemplateHelpers.getVoiceInfo(currentVoiceTemplate)
    return voiceInfo?.provider === 'elevenlabs' ? 'premium' : 'standard'
  }, [currentVoiceTemplate])

  const [voiceTab, setVoiceTab] = useState<'standard' | 'premium'>(initialTab)

  useEffect(() => {
    const voiceInfo = voiceTemplateHelpers.getVoiceInfo(currentVoiceTemplate ?? null)
    if (voiceInfo) {
      setVoiceTab(voiceInfo.provider === 'elevenlabs' ? 'premium' : 'standard')
    }
  }, [currentVoiceTemplate])

  useEffect(() => {
    let cancelled = false

    async function loadVoices() {
      const cached = getCachedPublicVoices() ?? []
      if (cached.length > 0 && !cancelled) setVoices(cached)
      setIsLoadingVoices(cached.length === 0)
      setError(null)

      try {
        const token = authStorage.getAccessToken()
        if (!token) {
          if (!cancelled) { setError('인증이 필요합니다.'); setIsLoadingVoices(false) }
          return
        }
        const voicesList = await fetchAndCachePublicVoices(token)
        if (!cancelled) setVoices(voicesList)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
      } finally {
        if (!cancelled) setIsLoadingVoices(false)
      }
    }

    loadVoices()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.onended = null
        audioRef.current.onerror = null
        audioRef.current = null
      }
      previewRequestIdRef.current += 1
    }
  }, [])

  const getShortName = useCallback((voiceName: string, voice?: PublicVoiceInfo) => {
    if (voice?.provider === 'elevenlabs' && voice.displayName) return voice.displayName
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

  const groupedByProvider = useMemo(() => {
    const google: PublicVoiceInfo[] = []
    const elevenlabs: PublicVoiceInfo[] = []
    for (const v of voices) {
      if (v.provider === 'elevenlabs') elevenlabs.push(v)
      else google.push(v)
    }
    const byShortName = (a: PublicVoiceInfo, b: PublicVoiceInfo) =>
      getShortName(a.name, a).localeCompare(getShortName(b.name, b))
    google.sort(byShortName)
    elevenlabs.sort(byShortName)
    return { google, elevenlabs }
  }, [getShortName, voices])

  const groupByGender = useCallback((voiceList: PublicVoiceInfo[]) => {
    const female: PublicVoiceInfo[] = []
    const male: PublicVoiceInfo[] = []
    const other: PublicVoiceInfo[] = []
    for (const v of voiceList) {
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
    const requestId = previewRequestIdRef.current + 1
    previewRequestIdRef.current = requestId

    if (isAudioPlaying && playingVoiceName === voiceName) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setLoadingPreviewVoiceName(null)
      setIsAudioPlaying(false)
      setPlayingVoiceName(null)
      return
    }

    if (audioRef.current) audioRef.current.pause()
    setLoadingPreviewVoiceName(voiceName)

    try {
      const voice = voices.find(v => v.name === voiceName)
      const toPascalCase = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str
      const toCamelCase = (str: string) => str ? str.charAt(0).toLowerCase() + str.slice(1) : str

      let fileNameCandidates: string[]
      let baseDir: string

      if (voice?.provider === 'elevenlabs') {
        const displayName = voice.displayName || voice.voiceId || voiceName.replace(/^elevenlabs:/, '')
        fileNameCandidates = [
          `${displayName}_test.wav`,
          `${toCamelCase(displayName)}_test.wav`,
          `${displayName.toLowerCase()}_test.wav`,
        ]
        baseDir = '/voice-demos/premium'
      } else {
        const shortName = getShortName(voiceName, voice)
        fileNameCandidates = [
          `${toPascalCase(shortName)}_test.wav`,
          `${shortName}_test.wav`,
          `${shortName.toLowerCase()}_test.wav`,
        ]
        baseDir = '/voice-demos/standard'
      }

      for (const fileName of fileNameCandidates) {
        const demoPath = `${baseDir}/${fileName}`
        try {
          const response = await fetch(demoPath, { method: 'HEAD', cache: 'no-cache' })
          if (previewRequestIdRef.current !== requestId) return
          if (response.ok) {
            const audio = new Audio(demoPath)
            audioRef.current = audio
            audio.onended = () => {
              if (isMountedRef.current) { setIsAudioPlaying(false); setPlayingVoiceName(null) }
            }
            audio.onerror = () => {
              if (isMountedRef.current) { setIsAudioPlaying(false); setPlayingVoiceName(null) }
            }
            setPlayingVoiceName(voiceName)
            setIsAudioPlaying(true)
            await audio.play()
            if (previewRequestIdRef.current === requestId) setLoadingPreviewVoiceName(null)
            return
          }
        } catch { continue }
      }
      if (previewRequestIdRef.current === requestId) setLoadingPreviewVoiceName(null)
    } catch {
      if (previewRequestIdRef.current === requestId) {
        setLoadingPreviewVoiceName(null)
        setIsAudioPlaying(false)
        setPlayingVoiceName(null)
      }
    }
  }, [isAudioPlaying, playingVoiceName, voices, getShortName])

  const openConfirm = useCallback((voiceName: string) => {
    const voice = voices.find(v => v.name === voiceName)
    if (!voice) {
      const partialMatch = voices.find(v =>
        v.name.includes(voiceName) || voiceName.includes(v.name) ||
        (v.provider === 'google' && v.name.endsWith(voiceName.split('-').pop() || '')) ||
        (v.displayName && v.displayName === voiceName)
      )
      if (partialMatch) { setPendingVoiceName(partialMatch.name); setConfirmOpen(true); return }
    }
    setPendingVoiceName(voice ? voice.name : voiceName)
    setConfirmOpen(true)
  }, [voices])

  const stopPreviewAudio = useCallback(() => {
    previewRequestIdRef.current += 1
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setLoadingPreviewVoiceName(null)
    setIsAudioPlaying(false)
    setPlayingVoiceName(null)
  }, [])

  const buildSerializedVoice = useCallback((voiceName: string): { serialized: string | null; label: string } => {
    const voice = voices.find(v => v.name === voiceName)
    if (voice) {
      const voiceInfo = publicVoiceInfoToVoiceInfo(voice)
      if (voiceInfo) {
        return {
          serialized: voiceTemplateHelpers.setVoiceInfo(voiceInfo),
          label: voiceInfo.displayName || getShortName(voice.name, voice),
        }
      }
      return { serialized: voiceName, label: getShortName(voice.name, voice) }
    }
    return { serialized: voiceName, label: getShortName(voiceName, undefined) }
  }, [voices, getShortName])

  const confirmSelection = useCallback(() => {
    if (!pendingVoiceName) return
    stopPreviewAudio()
    const { serialized, label } = buildSerializedVoice(pendingVoiceName)
    onVoiceSelect(serialized, label)
    setConfirmOpen(false)
    setPendingVoiceName(null)
  }, [pendingVoiceName, stopPreviewAudio, buildSerializedVoice, onVoiceSelect])

  const applyToAllScenes = useCallback(() => {
    if (!pendingVoiceName || !onVoiceSelectForAll) return
    stopPreviewAudio()
    const { serialized, label } = buildSerializedVoice(pendingVoiceName)
    onVoiceSelectForAll(serialized, label)
    setConfirmOpen(false)
    setPendingVoiceName(null)
  }, [pendingVoiceName, onVoiceSelectForAll, stopPreviewAudio, buildSerializedVoice])

  const renderVoiceItem = useCallback((v: PublicVoiceInfo) => {
    const currentVoiceInfo = voiceTemplateHelpers.getVoiceInfo(currentVoiceTemplate ?? null)
    const isSelected = currentVoiceInfo
      ? (currentVoiceInfo.provider === (v.provider || 'google') &&
        (v.provider === 'elevenlabs'
          ? currentVoiceInfo.voiceId === v.voiceId
          : currentVoiceInfo.voiceId === v.name))
      : currentVoiceTemplate === v.name
    const label = getShortName(v.name, v)
    const isPreviewLoading = loadingPreviewVoiceName === v.name
    const isPopoverOpen = confirmOpen && pendingVoiceName === v.name

    return (
      <Popover
        key={`${v.provider || 'google'}:${v.voiceId || v.name}`}
        open={isPopoverOpen}
        onOpenChange={(open) => {
          if (!open) { setConfirmOpen(false); setPendingVoiceName(null) }
        }}
      >
        <PopoverTrigger asChild>
          <div className="flex items-center gap-2 h-[46px] transition-all hover:opacity-90 min-w-0">
            <div
              className="w-6 h-6 flex items-center justify-center shrink-0 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); if (!isPreviewLoading) playDemo(v.name) }}
            >
              {isPreviewLoading ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin text-[#5e8790]" />
              ) : (
                <Image src="/voiceplay.svg" alt="재생" width={18} height={19} className="w-[18px] h-[19px]" />
              )}
            </div>
            <div
              onClick={(e) => { e.stopPropagation(); openConfirm(v.name) }}
              className={`flex-1 rounded-lg border h-[46px] flex items-center cursor-pointer min-w-0 ${
                isSelected ? 'bg-[#5e8790] border-[#5e8790]' : 'bg-white border-[#88a9ac]'
              }`}
            >
              <div className="px-3 sm:px-4 flex items-center w-full min-w-0">
                <span
                  className={`font-medium tracking-[-0.32px] truncate ${isSelected ? 'text-white' : 'text-[#2c2c2c]'}`}
                  style={{ fontSize: 'var(--font-size-16)', lineHeight: '22.4px' }}
                >
                  {label}
                </span>
              </div>
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="center"
          sideOffset={12}
          className="w-80 p-5 relative bg-white border-gray-200 z-60"
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement).closest('button')) e.preventDefault()
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) e.stopPropagation()
          }}
        >
          <div className="space-y-4">
            <div
              className="font-semibold text-text-dark tracking-[-0.32px]"
              style={{ fontSize: 'var(--font-size-16)', lineHeight: 'var(--line-height-16-140)' }}
            >
              이 목소리의 적용범위를 알려주세요!
            </div>
            <div className="flex items-start gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <span
                className="text-gray-400 tracking-[-0.28px]"
                style={{ fontSize: 'var(--font-size-12)', lineHeight: 'var(--line-height-12-140)' }}
              >
                씬마다 목소리를 다르게 설정할 수도 있어요!
              </span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                type="button" size="sm" variant="outline"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setConfirmOpen(false); setPendingVoiceName(null) }}
                className="flex-1 bg-white border-gray-300 text-text-dark hover:bg-gray-50"
              >
                다시 선택하기
              </Button>
              <Button
                type="button" size="sm"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); confirmSelection() }}
                className="flex-1 bg-brand-teal hover:bg-brand-teal-dark text-white cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                이 씬만
              </Button>
              {onVoiceSelectForAll && (
                <Button
                  type="button" size="sm"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); applyToAllScenes() }}
                  className="flex-1 bg-[#344e57] hover:bg-[#2a3f46] text-white cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  전체
                </Button>
              )}
            </div>
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ bottom: '-8px', borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #ffffff' }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ bottom: '-9px', borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: '9px solid #e5e7eb' }}
          />
        </PopoverContent>
      </Popover>
    )
  }, [currentVoiceTemplate, getShortName, loadingPreviewVoiceName, playDemo, confirmOpen, pendingVoiceName, openConfirm, confirmSelection, applyToAllScenes, onVoiceSelectForAll])

  const renderGenderColumn = useCallback((voiceList: PublicVoiceInfo[], genderLabel: string) => {
    if (voiceList.length === 0) return null
    const uniqueVoices = voiceList.filter((v, index, self) => {
      const key = `${v.provider || 'google'}:${v.voiceId || v.name}`
      return index === self.findIndex(vo => `${vo.provider || 'google'}:${vo.voiceId || vo.name}` === key)
    })
    return (
      <div className="flex-1 space-y-2">
        <div>
          <h5 className="font-bold text-text-dark text-center tracking-[-0.36px]"
            style={{ fontSize: 'var(--font-size-16)', lineHeight: '22.4px' }}>{genderLabel}</h5>
          <div className="h-0.5 bg-[#bbc9c9] mt-2" />
        </div>
        <div className="space-y-2">
          {uniqueVoices.map(renderVoiceItem)}
        </div>
      </div>
    )
  }, [renderVoiceItem])

  const isSynthesizing = synthesizingScenes && synthesizingScenes.size > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3
          className="font-bold text-text-dark tracking-[-0.4px]"
          style={{ fontSize: 'var(--font-size-20)', lineHeight: '28px' }}
        >
          보이스
        </h3>
        {isSynthesizing ? (
          <span className="flex items-center gap-1 text-[#5e8790] tracking-[-0.14px] mt-2"
            style={{ fontSize: 'var(--font-size-12)', lineHeight: '19.2px' }}>
            <Loader2 className="w-3 h-3 animate-spin" />
            TTS 합성 중...
          </span>
        ) : (
          <span className="text-[#5d5d5d] tracking-[-0.14px] mt-2"
            style={{ fontSize: 'var(--font-size-12)', lineHeight: '19.2px' }}>
            씬에 적용할 목소리를 선택해요!
          </span>
        )}
      </div>
      <div className="h-0.5 bg-[#bbc9c9]" />

      {isLoadingVoices && voices.length === 0 ? (
        <div className="space-y-3">
          <div className="text-sm text-[#5d5d5d]">목소리 목록을 불러오는 중이에요.</div>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`voice-loading-${index}`} className="flex items-center gap-2 h-[46px] min-w-0">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <Loader2 className="w-[18px] h-[18px] animate-spin text-[#5e8790]" />
                </div>
                <div className="flex-1 rounded-lg border border-[#d3dbdc] bg-white/70 h-[46px] flex items-center px-3">
                  <div className="h-4 w-20 rounded bg-[#dfe6e7] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 py-4">{error}</div>
      ) : voices.length === 0 ? (
        <div className="text-sm text-text-dark py-4">사용 가능한 목소리가 없어요.</div>
      ) : (
        <Tabs value={voiceTab} onValueChange={(v) => setVoiceTab(v as 'standard' | 'premium')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="standard" className="text-sm font-medium">Standard</TabsTrigger>
            <TabsTrigger value="premium" className="text-sm font-medium">Premium</TabsTrigger>
          </TabsList>

          <TabsContent value="standard" className="space-y-4 mt-0">
            {groupedByProvider.google.length > 0 ? (() => {
              const byGender = groupByGender(groupedByProvider.google)
              return (
                <div className="grid grid-cols-2 gap-4">
                  {renderGenderColumn(byGender.female, '보이스 | 여성')}
                  {renderGenderColumn(byGender.male, '보이스 | 남성')}
                </div>
              )
            })() : (
              <div className="text-sm text-text-dark text-center py-8">Standard 목소리가 없어요.</div>
            )}
          </TabsContent>

          <TabsContent value="premium" className="space-y-4 mt-0">
            {groupedByProvider.elevenlabs.length > 0 ? (() => {
              const byGender = groupByGender(groupedByProvider.elevenlabs)
              return (
                <div className="grid grid-cols-2 gap-4">
                  {renderGenderColumn(byGender.female, '보이스 | 여성')}
                  {renderGenderColumn(byGender.male, '보이스 | 남성')}
                </div>
              )
            })() : (
              <div className="text-sm text-text-dark text-center py-8">Premium 목소리가 없어요.</div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
