'use client'

import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import type { MutableRefObject } from 'react'
import * as PIXI from 'pixi.js'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UseTimelinePlayerParams {
  timeline: TimelineData | null
  updateCurrentScene: (skipAnimation?: boolean) => void
  loadAllScenes: () => Promise<void>
  appRef: MutableRefObject<PIXI.Application | null>
  containerRef: MutableRefObject<PIXI.Container | null>
  pixiReady: boolean
}

export function useTimelinePlayer({
  timeline,
  updateCurrentScene,
  loadAllScenes,
  appRef,
  containerRef,
  pixiReady,
  previousSceneIndexRef,
}: UseTimelinePlayerParams & { previousSceneIndexRef: React.MutableRefObject<number | null> }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreviewingTransition, setIsPreviewingTransition] = useState(false)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(timeline?.playbackSpeed ?? 1.0)
  const rafIdRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const isManualSceneSelectRef = useRef(false)
  const tickRef = useRef<((timestamp: number) => void) | null>(null)
  const playStartSceneIndexRef = useRef<number>(0) // 재생 시작 씬 인덱스
  const playStartTimeRef = useRef<number>(0) // 재생 시작 시간 (절대 시간)
  const currentTimeRef = useRef<number>(0) // currentTime의 최신 값을 ref로 저장
  const currentSceneIndexRef = useRef<number>(0) // currentSceneIndex의 최신 값을 ref로 저장

  const totalDuration = useMemo(() => {
    if (!timeline || timeline.scenes.length === 0) return 0
    return timeline.scenes.reduce((sum, scene) => {
      const transitionDuration = scene.transitionDuration || 0.5
      return sum + scene.duration + transitionDuration
    }, 0)
  }, [timeline])

  const stageDimensions = useMemo(() => {
    const baseSize = 1080
    const ratio = 9 / 16
    return { width: baseSize, height: baseSize / ratio }
  }, [])

  // currentTime과 currentSceneIndex를 ref에 동기화
  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

  // 재생 시작 시 currentTime ref 동기화
  useEffect(() => {
    if (isPlaying) {
      currentTimeRef.current = currentTime
      currentSceneIndexRef.current = currentSceneIndex
    }
  }, [isPlaying, currentTime, currentSceneIndex])

  // 재생 루프
  useEffect(() => {
    tickRef.current = (timestamp: number) => {
      if (!isPlaying || !timeline) return
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
        // 첫 프레임에서는 delta 계산하지 않음 (ref는 이미 동기화됨)
        rafIdRef.current = requestAnimationFrame(tickRef.current!)
        return
      }
      const deltaMs = timestamp - lastTimestampRef.current
      lastTimestampRef.current = timestamp
      // 배속 적용: 2배속이면 1초에 2초씩 증가
      const deltaSec = (deltaMs / 1000) * (playbackSpeed || 1)
      
      // ref에서 최신 currentTime 값 가져오기
      // currentTime은 배속이 적용된 시간으로 증가 (타임라인 바가 빠르게 채워지도록)
      const currentT = currentTimeRef.current
      const nextTime = currentT + deltaSec
      const clampedTime = Math.min(nextTime, totalDuration)
      
      // 시간 업데이트 (항상 업데이트하여 부드러운 애니메이션)
      setCurrentTime(clampedTime)
      currentTimeRef.current = clampedTime

      // 씬 계산은 currentTime 기준 (배속이 적용된 시간)
      const t = clampedTime
      
      // 현재 시간에 맞는 씬 찾기 (절대 시간 기준)
      let accumulated = 0
      let targetSceneIndex = timeline.scenes.length - 1 // 기본값: 마지막 씬
      
      for (let i = 0; i < timeline.scenes.length; i++) {
        const scene = timeline.scenes[i]
        const sceneDuration = scene.duration + (scene.transitionDuration || 0.5)
        const sceneStart = accumulated
        const sceneEnd = accumulated + sceneDuration
        
        // 현재 시간이 이 씬 범위 내에 있으면
        if (t >= sceneStart && t < sceneEnd) {
          targetSceneIndex = i
          break
        }
        
        // 마지막 씬이고 시간이 sceneEnd에 도달했거나 넘어갔으면
        if (i === timeline.scenes.length - 1 && t >= sceneEnd) {
          targetSceneIndex = i
          break
        }
        
        accumulated += sceneDuration
      }
      
      // currentTime이 totalDuration에 도달했는지 확인
      if (clampedTime >= totalDuration) {
        setIsPlaying(false)
        targetSceneIndex = timeline.scenes.length - 1
      }
      
      // 씬이 변경되었으면 업데이트
      const currentSceneIdx = currentSceneIndexRef.current
      if (targetSceneIndex !== currentSceneIdx) {
        // 재생 중일 때는 isPreviewingTransition을 무시하고 씬 전환
        // (재생 중에는 항상 전환 효과가 적용되어야 함)
        if (!isManualSceneSelectRef.current) {
          currentSceneIndexRef.current = targetSceneIndex
          setCurrentSceneIndex(targetSceneIndex)
        }
      }

      rafIdRef.current = requestAnimationFrame(tickRef.current!)
    }

    if (isPlaying) {
      // 재생 시작 시 lastTimestamp 리셋
      lastTimestampRef.current = null
      rafIdRef.current = requestAnimationFrame(tickRef.current!)
    } else if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
      // 일시정지 시 lastTimestamp 리셋 (재생 재개 시 올바른 delta 계산을 위해)
      lastTimestampRef.current = null
    }
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [
    isPlaying,
    isPreviewingTransition,
    playbackSpeed,
    timeline,
    totalDuration,
    updateCurrentScene,
  ])

  // timeline의 playbackSpeed와 동기화
  useEffect(() => {
    if (timeline?.playbackSpeed !== undefined && timeline.playbackSpeed !== playbackSpeed) {
      setPlaybackSpeed(timeline.playbackSpeed)
    }
  }, [timeline?.playbackSpeed, playbackSpeed])

  // 배속 변경 시 타임스탬프 리셋 (부드러운 업데이트를 위해)
  useEffect(() => {
    if (isPlaying) {
      lastTimestampRef.current = null
    }
  }, [playbackSpeed, isPlaying])

  // 씬 인덱스 변경 시 전환 처리는 step4/page.tsx의 useEffect에서 처리
  // (previousSceneIndexRef를 공유하므로 중복 제거)

  // 재생 시작 시 현재 씬 인덱스와 시간 저장
  useEffect(() => {
    if (isPlaying && lastTimestampRef.current === null) {
      // 재생이 시작될 때 현재 씬 인덱스와 시간 저장
      // currentTime은 현재 씬의 시작 시간으로 설정되어 있음
      playStartSceneIndexRef.current = currentSceneIndex
      playStartTimeRef.current = currentTime // 재생 시작 시 currentTime은 현재 씬의 시작 시간
    }
  }, [isPlaying, currentSceneIndex, currentTime])

  // 총 길이 기반 진행률
  // currentTime은 배속이 적용된 시간으로 증가 (2배속이면 1초에 2초씩 증가)
  // progressRatio = currentTime / totalDuration
  // 예: 1배속에서 10초면 currentTime=10, progressRatio=1.0
  //     2배속에서 5초면 currentTime=10, progressRatio=1.0 (타임라인 바가 2배 빠르게 채워짐)
  const progressRatio = useMemo(() => {
    if (totalDuration === 0) return 0
    return Math.min(1, currentTime / totalDuration)
  }, [totalDuration, currentTime])

  // Pixi 초기화 보조 (단순 stage size 제공용)
  const getStageDimensions = useCallback(() => stageDimensions, [stageDimensions])

  // 씬 직접 선택
  const selectScene = useCallback(
    (index: number) => {
      if (!timeline) return
      const clamped = Math.max(0, Math.min(index, timeline.scenes.length - 1))
      isManualSceneSelectRef.current = true
      previousSceneIndexRef.current = currentSceneIndex
      setCurrentSceneIndex(clamped)
      updateCurrentScene(true)
      setIsPreviewingTransition(false)
      isManualSceneSelectRef.current = false
    },
    [currentSceneIndex, timeline, updateCurrentScene, previousSceneIndexRef],
  )

  // 재생/일시정지
  const togglePlay = useCallback(() => {
    if (!timeline || timeline.scenes.length === 0) return
    setIsPlaying((prev) => !prev)
  }, [timeline])

  // 초기 로드 트리거 (Pixi 준비 시 씬 로드)
  useEffect(() => {
    if (pixiReady && appRef.current && containerRef.current && timeline) {
      loadAllScenes()
    }
  }, [pixiReady, appRef, containerRef, timeline, loadAllScenes])

  return {
    isPlaying,
    setIsPlaying,
    isPreviewingTransition,
    setIsPreviewingTransition,
    currentSceneIndex,
    setCurrentSceneIndex,
    currentTime,
    setCurrentTime,
    progressRatio,
    playbackSpeed,
    setPlaybackSpeed,
    totalDuration,
    selectScene,
    togglePlay,
    getStageDimensions,
    isManualSceneSelectRef,
  }
}

