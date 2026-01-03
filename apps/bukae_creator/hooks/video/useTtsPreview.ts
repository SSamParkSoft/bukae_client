'use client'

import { useRef, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData } from '@/store/useVideoCreateStore'

// 상수 정의
const PREVIEW_DELAY_MS = 50 // 텍스트 표시를 위한 지연 시간
const PREVIEW_CHECK_INTERVAL_MS = 100 // 미리듣기 중지 확인을 위한 인터벌
const TIMELINE_SYNC_DELAY_MS = 10 // timeline 동기화를 위한 지연 시간

interface UseTtsPreviewParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  ensureSceneTts: (sceneIndex: number, signal?: AbortSignal, forceRegenerate?: boolean) => Promise<{
    sceneIndex: number
    parts: Array<{
      blob: Blob
      durationSec: number
      url: string | null
      partIndex: number
      markup: string
    }>
  }>
  stopScenePreviewAudio: () => void
  setTimeline: (timeline: TimelineData) => void
  updateCurrentScene: (explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void, isPlaying?: boolean, partIndex?: number | null, sceneIndex?: number, overrideTransitionDuration?: number) => void
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  renderSceneContent?: (
    sceneIndex: number,
    partIndex?: number | null,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      updateTimeline?: boolean
      prepareOnly?: boolean
      isPlaying?: boolean
    }
  ) => void
  changedScenesRef: React.MutableRefObject<Set<number>>
}

/**
 * TTS 미리보기 관리 hook
 * 씬의 TTS를 미리듣기하는 기능을 제공합니다.
 */
export function useTtsPreview({
  timeline,
  voiceTemplate,
  ensureSceneTts,
  stopScenePreviewAudio,
  setTimeline,
  updateCurrentScene,
  textsRef,
  renderSceneContent,
  changedScenesRef,
}: UseTtsPreviewParams) {
  const scenePreviewAudioRef = useRef<HTMLAudioElement | null>(null)
  const scenePreviewAudioUrlRef = useRef<string | null>(null)
  const previewingSceneIndexRef = useRef<number | null>(null)
  const previewingPartIndexRef = useRef<number | null>(null)
  const isPreviewingRef = useRef<boolean>(false)

  /**
   * 씬 미리보기 오디오 정지
   */
  const stopPreviewAudio = useCallback(() => {
    console.log('[useTtsPreview] 미리보기 오디오 정지')
    const a = scenePreviewAudioRef.current
    if (a) {
      try {
        a.pause()
        a.currentTime = 0
      } catch {
        // ignore
      }
    }
    scenePreviewAudioRef.current = null
    if (scenePreviewAudioUrlRef.current) {
      URL.revokeObjectURL(scenePreviewAudioUrlRef.current)
      scenePreviewAudioUrlRef.current = null
    }
    previewingSceneIndexRef.current = null
    previewingPartIndexRef.current = null
    isPreviewingRef.current = false
  }, [])

  /**
   * 특정 구간의 자막을 업데이트하고 표시
   */
  const updateSubtitleForPreview = useCallback(
    (sceneIndex: number, currentPartIndex: number, currentPartText: string, totalParts: number) => {
      console.log(`[useTtsPreview] 자막 업데이트 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}/${totalParts}, text: "${currentPartText.substring(0, 30)}..."`)

      if (renderSceneContent) {
        renderSceneContent(sceneIndex, currentPartIndex, {
          skipAnimation: true,
          updateTimeline: true,
          previousIndex: null,
        })
      } else {
        // fallback: 기존 방식 (renderSceneContent가 없는 경우)
        if (timeline && timeline.scenes[sceneIndex]) {
          const updatedTimeline = {
            ...timeline,
            scenes: timeline.scenes.map((s, i) =>
              i === sceneIndex
                ? {
                    ...s,
                    text: {
                      ...s.text,
                      content: currentPartText,
                    },
                  }
                : s
            ),
          }
          setTimeline(updatedTimeline)
        }

        // 텍스트 객체 직접 업데이트 (즉시 반영)
        const currentText = textsRef.current.get(sceneIndex)
        if (currentText) {
          currentText.text = currentPartText
          currentText.visible = true
          currentText.alpha = 1
        } else {
          console.warn(`[useTtsPreview] 씬 ${sceneIndex} 텍스트 객체를 찾을 수 없음`)
        }

        // 약간의 지연 후 updateCurrentScene 호출하여 timeline과 동기화
        setTimeout(() => {
          console.log(`[useTtsPreview] timeline 동기화 | sceneIndex: ${sceneIndex}`)
          // skipAnimation 파라미터 제거: forceTransition === 'none'으로 처리
          updateCurrentScene(null, 'none')
        }, TIMELINE_SYNC_DELAY_MS)
      }
    },
    [timeline, setTimeline, updateCurrentScene, textsRef, renderSceneContent]
  )

  /**
   * 오디오 재생 및 duration 대기
   */
  const playAudioPart = useCallback(
    async (
      sceneIndex: number,
      currentPartIndex: number,
      part: {
        blob: Blob
        durationSec: number
        url: string | null
        partIndex: number
        markup: string
      }
    ): Promise<void> => {
      console.log(`[useTtsPreview] 오디오 재생 시작 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}, duration: ${part.durationSec}초`)

      // 저장소 URL 우선 사용, 없으면 blob에서 URL 생성
      let audioUrl: string | null = null
      if (part.url) {
        audioUrl = part.url
        console.log(`[useTtsPreview] 저장소 URL 사용 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}, url: ${part.url.substring(0, 50)}...`)
      } else if (part.blob) {
        audioUrl = URL.createObjectURL(part.blob)
        console.log(`[useTtsPreview] blob URL 생성 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}`)
      }

      // 텍스트가 표시될 시간을 주기 위해 약간의 지연
      await new Promise((resolve) => {
        console.log(`[useTtsPreview] 텍스트 표시 대기 | delay: ${PREVIEW_DELAY_MS}ms`)
        setTimeout(resolve, PREVIEW_DELAY_MS)
      })

      // TTS duration만큼 정확히 표시
      const targetDuration = part.durationSec * 1000

      if (audioUrl) {
        scenePreviewAudioUrlRef.current = audioUrl
        const audio = new Audio(audioUrl)
        scenePreviewAudioRef.current = audio

        await new Promise<void>((resolve) => {
          const startTime = Date.now()
          let resolved = false
          let timeoutId: NodeJS.Timeout | null = null
          let checkInterval: NodeJS.Timeout | null = null

          const finish = () => {
            if (resolved) return
            resolved = true
            if (timeoutId) clearTimeout(timeoutId)
            if (checkInterval) clearInterval(checkInterval)
            console.log(`[useTtsPreview] 오디오 재생 완료 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}`)
            resolve()
          }

          audio.onended = () => {
            console.log(`[useTtsPreview] 오디오 종료 이벤트 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}`)
            finish()
          }

          audio.onerror = () => {
            console.error(`[useTtsPreview] 오디오 재생 실패 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}`)
            // 에러 발생 시 duration만큼 대기
            const elapsed = Date.now() - startTime
            const remaining = Math.max(0, targetDuration - elapsed)
            setTimeout(() => finish(), remaining)
          }

          audio.play().catch((error) => {
            console.error(`[useTtsPreview] 오디오 재생 시작 실패 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}, error:`, error)
            // 재생 실패 시 duration만큼 대기
            setTimeout(() => finish(), targetDuration)
          })

          // duration이 지나면 자동으로 다음 구간으로 (오디오가 끝나지 않아도)
          timeoutId = setTimeout(() => {
            if (!resolved && audio && !audio.ended) {
              console.log(`[useTtsPreview] duration 타임아웃 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}`)
              audio.pause()
              finish()
            }
          }, targetDuration)

          // 미리듣기 중지 확인을 위한 인터벌
          checkInterval = setInterval(() => {
            if (!isPreviewingRef.current || previewingSceneIndexRef.current !== sceneIndex) {
              console.log(`[useTtsPreview] 미리듣기 중지 감지 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}`)
              if (audio && !audio.ended) {
                audio.pause()
              }
              finish()
            }
          }, PREVIEW_CHECK_INTERVAL_MS)
        })
      } else {
        // 오디오가 없어도 duration만큼 대기
        console.warn(`[useTtsPreview] 재생할 오디오 없음, duration만큼 대기 | sceneIndex: ${sceneIndex}, partIndex: ${currentPartIndex + 1}, duration: ${part.durationSec}초`)
        await new Promise((resolve) => setTimeout(resolve, targetDuration))
      }
    },
    []
  )

  /**
   * 특정 구간 재생
   */
  const playPart = useCallback(
    async (
      sceneIndex: number,
      currentPartIndex: number,
      result: {
        sceneIndex: number
        parts: Array<{
          blob: Blob
          durationSec: number
          url: string | null
          partIndex: number
          markup: string
        }>
      },
      originalText: string,
      partIndex?: number
    ): Promise<void> => {
      console.log(`[useTtsPreview] 구간 재생 시작 | sceneIndex: ${sceneIndex}, currentPartIndex: ${currentPartIndex + 1}/${result.parts.length}`)

      // 미리듣기가 중지되었는지 확인
      if (!isPreviewingRef.current || previewingSceneIndexRef.current !== sceneIndex) {
        console.log(`[useTtsPreview] 미리듣기 중지됨 | sceneIndex: ${sceneIndex}`)
        stopPreviewAudio()
        return
      }

      if (currentPartIndex >= result.parts.length) {
        // 모든 구간 재생 완료
        console.log(`[useTtsPreview] 모든 구간 재생 완료 | sceneIndex: ${sceneIndex}`)
        stopPreviewAudio()
        return
      }

      const part = result.parts[currentPartIndex]

      // ||| 기준으로 텍스트 배열로 나누기 (원본 텍스트 사용)
      const scriptParts = originalText.split(/\s*\|\|\|\s*/).map((p) => p.trim()).filter((p) => p.length > 0)
      const currentPartText = scriptParts[currentPartIndex]?.trim() || ''

      // 자막 즉시 표시
      if (currentPartText) {
        updateSubtitleForPreview(sceneIndex, currentPartIndex, currentPartText, result.parts.length)
      }

      // 오디오 재생
      await playAudioPart(sceneIndex, currentPartIndex, part)

      // 특정 구간만 재생하는 경우 여기서 종료
      if (partIndex !== undefined) {
        console.log(`[useTtsPreview] 특정 구간 재생 완료 | sceneIndex: ${sceneIndex}, partIndex: ${partIndex}`)
        stopPreviewAudio()
        return
      }

      // 다음 구간 재생 (전체 재생 모드)
      await playPart(sceneIndex, currentPartIndex + 1, result, originalText, partIndex)
    },
    [stopPreviewAudio, updateSubtitleForPreview, playAudioPart]
  )

  /**
   * 씬 TTS 미리보기 핸들러
   */
  const handleSceneTtsPreview = useCallback(
    async (sceneIndex: number, partIndex?: number) => {
      console.log(`[useTtsPreview] 씬 미리보기 시작 | sceneIndex: ${sceneIndex}, partIndex: ${partIndex ?? '전체'}`)

      if (!timeline) {
        console.warn('[useTtsPreview] timeline이 없습니다.')
        return
      }

      if (!voiceTemplate) {
        console.warn('[useTtsPreview] 목소리를 선택해주세요.')
        alert('목소리를 선택해주세요.')
        return
      }

      // 이미 같은 씬/구간을 미리듣기 중이면 정지
      if (isPreviewingRef.current && previewingSceneIndexRef.current === sceneIndex && previewingPartIndexRef.current === (partIndex ?? null)) {
        console.log(`[useTtsPreview] 이미 미리듣기 중인 씬/구간 정지 | sceneIndex: ${sceneIndex}, partIndex: ${partIndex ?? null}`)
        stopPreviewAudio()
        return
      }

      try {
        // 기존 미리듣기 오디오 정지
        stopPreviewAudio()

        // 미리듣기 상태 설정
        previewingSceneIndexRef.current = sceneIndex
        previewingPartIndexRef.current = partIndex ?? null
        isPreviewingRef.current = true

        const scene = timeline.scenes[sceneIndex]
        // 원본 텍스트 저장
        const originalText = scene?.text?.content || ''

        // TTS 합성 (변경된 씬이면 강제 재생성)
        const forceRegenerate = changedScenesRef.current.has(sceneIndex)
        console.log(`[useTtsPreview] TTS 합성 시작 | sceneIndex: ${sceneIndex}, forceRegenerate: ${forceRegenerate}`)
        const result = await ensureSceneTts(sceneIndex, undefined, forceRegenerate)

        if (result.parts.length === 0) {
          throw new Error('TTS 구간이 없습니다.')
        }

        console.log(`[useTtsPreview] TTS 합성 완료 | sceneIndex: ${sceneIndex}, parts: ${result.parts.length}`)

        // 특정 구간만 재생하거나 첫 번째 구간부터 재생 시작
        const startIndex = partIndex !== undefined ? partIndex : 0
        await playPart(sceneIndex, startIndex, result, originalText, partIndex)
      } catch (error) {
        console.error(`[useTtsPreview] 씬 미리보기 실패 | sceneIndex: ${sceneIndex}, error:`, error)
        stopPreviewAudio()
        alert(error instanceof Error ? error.message : 'TTS 미리듣기 실패')
      }
    },
    [timeline, voiceTemplate, ensureSceneTts, stopPreviewAudio, playPart, changedScenesRef]
  )

  return {
    handleSceneTtsPreview,
    stopPreviewAudio,
  }
}

