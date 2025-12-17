'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'

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
  previewText: string
  title?: string
  disabled?: boolean
}

export default function ChirpVoiceSelector({
  theme,
  previewText,
  title = 'TTS 미리듣기 (ko-KR)',
  disabled = false,
}: ChirpVoiceSelectorProps) {
  const { voiceTemplate, setVoiceTemplate } = useVideoCreateStore()
  const [voices, setVoices] = useState<PublicVoiceInfo[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  const hasText = useMemo(() => previewText.trim().length > 0, [previewText])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setIsPlaying(false)
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

      // 아직 선택이 없으면 첫 번째 목소리를 기본 선택
      if (!voiceTemplate && nextVoices[0]?.name) {
        setVoiceTemplate(nextVoices[0].name)
      }
    } catch (e) {
      setVoices([])
      setError(e instanceof Error ? e.message : '목소리 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoadingVoices(false)
    }
  }, [setVoiceTemplate, voiceTemplate])

  useEffect(() => {
    loadVoices()
    return () => stop()
  }, [loadVoices, stop])

  const synthesizeAndPlay = useCallback(async () => {
    if (disabled) return
    setError(null)

    const text = previewText.trim()
    if (!text) {
      setError('미리듣기할 대본이 없습니다.')
      return
    }
    if (!voiceTemplate) {
      setError('목소리를 먼저 선택해주세요.')
      return
    }

    try {
      stop()
      setIsSynthesizing(true)

      const res = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: voiceTemplate,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data?.error || 'TTS 합성에 실패했습니다.')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      audioUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setIsPlaying(false)
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current)
          audioUrlRef.current = null
        }
      }
      audio.onerror = () => {
        setIsPlaying(false)
        setError('오디오 재생 중 오류가 발생했습니다.')
      }

      await audio.play()
      setIsPlaying(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '미리듣기 중 오류가 발생했습니다.')
      setIsPlaying(false)
    } finally {
      setIsSynthesizing(false)
    }
  }, [disabled, previewText, stop, voiceTemplate])

  const onTogglePlay = useCallback(() => {
    if (isPlaying) {
      stop()
      return
    }
    synthesizeAndPlay()
  }, [isPlaying, stop, synthesizeAndPlay])

  return (
    <div
      className="rounded-lg border p-3 space-y-2"
      style={{
        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
        backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div
          className="text-sm font-semibold"
          style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}
        >
          {title}
        </div>
        <button
          type="button"
          onClick={loadVoices}
          disabled={disabled || isLoadingVoices}
          className="text-xs px-2 py-1 rounded border"
          style={{
            borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
            color: theme === 'dark' ? '#d1d5db' : '#374151',
          }}
        >
          {isLoadingVoices ? '불러오는 중...' : '목록 새로고침'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={voiceTemplate ?? ''}
          onChange={(e) => setVoiceTemplate(e.target.value || null)}
          disabled={disabled || isLoadingVoices || voices.length === 0}
          className="flex-1 px-2 py-2 rounded border text-sm"
          style={{
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
            color: theme === 'dark' ? '#ffffff' : '#111827',
          }}
        >
          {voices.length === 0 ? (
            <option value="">사용 가능한 목소리가 없습니다</option>
          ) : (
            voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))
          )}
        </select>

        <button
          type="button"
          onClick={onTogglePlay}
          disabled={disabled || isSynthesizing || isLoadingVoices || !hasText || !voiceTemplate}
          className="px-3 py-2 rounded text-sm border"
          style={{
            borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
            color: theme === 'dark' ? '#ffffff' : '#111827',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {isSynthesizing ? '합성 중...' : isPlaying ? '정지' : '미리듣기'}
        </button>
      </div>

      {!hasText && (
        <div className="text-xs" style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
          대본이 있어야 미리듣기가 가능합니다.
        </div>
      )}

      {error && (
        <div className="text-xs" style={{ color: theme === 'dark' ? '#fca5a5' : '#b91c1c' }}>
          {error}
        </div>
      )}
    </div>
  )
}


