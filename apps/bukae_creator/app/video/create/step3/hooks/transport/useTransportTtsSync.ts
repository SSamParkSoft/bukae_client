'use client'

import { useRef, useEffect } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { useTransport } from '@/hooks/video/transport/useTransport'
import type { useTtsTrack } from '@/hooks/video/audio/useTtsTrack'
import type { TtsSegment } from '@/hooks/video/audio/types'
import type { TtsTrack } from '@/hooks/video/audio/TtsTrack'

type UseTransportReturnType = ReturnType<typeof useTransport>
type UseTtsTrackReturnType = ReturnType<typeof useTtsTrack>

interface UseTransportTtsSyncParams {
  transport: UseTransportReturnType
  ttsTrack: UseTtsTrackReturnType
  audioContext: AudioContext | undefined
  timeline: TimelineData | null
  isPlaying: boolean
  playingSceneIndex: number | null
  playingGroupSceneId: number | null
  playbackEndTime: number | null
  setIsPlaying: ((playing: boolean) => void) | undefined
  setPlaybackEndTime: (time: number | null) => void
  setPlayingSceneIndex: (index: number | null) => void
  setPlayingGroupSceneId: (sceneId: number | null) => void
  renderAtRef: React.MutableRefObject<((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined>
  onSegmentStartRef: React.MutableRefObject<((segmentStartTime: number, sceneIndex: number) => void) | null>
  onSegmentEndRef: React.MutableRefObject<((segmentEndTime: number, sceneIndex: number) => void) | null>
  transportRendererRef: React.MutableRefObject<{ renderAt: (tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void } | null>
  sceneGroupPlayStartTimeRef: React.MutableRefObject<number | null>
  sceneGroupPlayStartAudioCtxTimeRef: React.MutableRefObject<number | null>
  ttsTrackRef: React.MutableRefObject<{ getTtsTrack: () => TtsTrack | null }>
  lastTtsUpdateTimeRef: React.MutableRefObject<number>
}

/**
 * Transport와 TTS 동기화를 관리하는 훅
 * - renderAt 래핑 및 세그먼트 콜백 설정
 * - Transport 시간 변경 시 TTS 재생 업데이트
 * - 씬/그룹 재생 시 Transport 시간 고정
 */
export function useTransportTtsSync({
  transport,
  ttsTrack,
  audioContext,
  timeline,
  isPlaying,
  playingSceneIndex,
  playingGroupSceneId,
  playbackEndTime,
  setIsPlaying,
  setPlaybackEndTime,
  setPlayingSceneIndex,
  setPlayingGroupSceneId,
  renderAtRef,
  onSegmentStartRef,
  onSegmentEndRef,
  transportRendererRef,
  sceneGroupPlayStartTimeRef,
  sceneGroupPlayStartAudioCtxTimeRef,
  ttsTrackRef,
  lastTtsUpdateTimeRef,
}: UseTransportTtsSyncParams) {
  // renderAt이 설정된 후 세그먼트 시작 콜백 업데이트 (TTS와 씬 전환 동기화)
  useEffect(() => {
    // renderAt이 이미 usePlaybackDurationTracker에서 래핑되었으므로, 여기서는 세그먼트 콜백만 설정
    onSegmentStartRef.current = (segmentStartTime: number, sceneIndex: number) => {
      if (renderAtRef.current) {
        // 세그먼트 시작 시간과 씬 인덱스를 직접 사용하여 정확한 동기화 보장
        // forceSceneIndex를 사용하여 calculateSceneFromTime의 계산 오류 방지
        renderAtRef.current(segmentStartTime, { skipAnimation: false, forceSceneIndex: sceneIndex })
      }
    }
    // renderAt이 설정된 후 세그먼트 종료 콜백은 setIsPlaying 선언 이후에 설정됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // renderAt이 설정된 후 세그먼트 종료 콜백 업데이트 (setIsPlaying 선언 이후에 설정)
  // TTS 세그먼트 종료 시 정확한 씬 전환 보장
  useEffect(() => {
    if (!setIsPlaying) return
    
    onSegmentEndRef.current = (segmentEndTime: number, sceneIndex: number) => {
      if (!renderAtRef.current || !timeline) {
        return
      }
      
      // 씬 재생 또는 그룹 재생 중일 때 마지막 세그먼트 종료 시 정지
      const currentPlayingSceneIndex = playingSceneIndex
      const currentPlayingGroupSceneId = playingGroupSceneId
      const currentSegments = ttsTrack.segments
      
      if (currentPlayingSceneIndex !== null || currentPlayingGroupSceneId !== null) {
        // 해당 씬/그룹의 마지막 세그먼트 찾기
        let lastSegment: { segmentEndTime: number; sceneIndex: number } | null = null
        
        if (currentPlayingSceneIndex !== null) {
          // 씬 재생: 해당 씬의 마지막 세그먼트 찾기
          const sceneSegments = currentSegments.filter((seg: TtsSegment) => seg.sceneIndex === currentPlayingSceneIndex)
          if (sceneSegments.length > 0) {
            const lastSceneSegment = sceneSegments[sceneSegments.length - 1]
            if (lastSceneSegment.sceneIndex !== undefined) {
              const durationSec = lastSceneSegment.durationSec ?? 0
              lastSegment = {
                segmentEndTime: lastSceneSegment.startSec + durationSec,
                sceneIndex: lastSceneSegment.sceneIndex,
              }
            }
          }
        } else if (currentPlayingGroupSceneId !== null) {
          // 그룹 재생: 해당 그룹의 마지막 씬의 마지막 세그먼트 찾기
          const groupScenes = timeline.scenes.filter(scene => scene.sceneId === currentPlayingGroupSceneId)
          if (groupScenes.length > 0) {
            // 그룹의 마지막 씬 인덱스 찾기
            let lastGroupSceneIndex = -1
            for (let i = timeline.scenes.length - 1; i >= 0; i--) {
              if (timeline.scenes[i]?.sceneId === currentPlayingGroupSceneId) {
                lastGroupSceneIndex = i
                break
              }
            }
            
            if (lastGroupSceneIndex >= 0) {
              const groupSegments = currentSegments.filter((seg: TtsSegment) => seg.sceneIndex === lastGroupSceneIndex)
              if (groupSegments.length > 0) {
                const lastGroupSegment = groupSegments[groupSegments.length - 1]
                if (lastGroupSegment.sceneIndex !== undefined) {
                  const durationSec = lastGroupSegment.durationSec ?? 0
                  lastSegment = {
                    segmentEndTime: lastGroupSegment.startSec + durationSec,
                    sceneIndex: lastGroupSegment.sceneIndex,
                  }
                }
              }
            }
          }
        }
        
        // 현재 종료된 세그먼트가 마지막 세그먼트인지 확인 (0.01초 오차 허용)
        if (lastSegment && Math.abs(segmentEndTime - lastSegment.segmentEndTime) < 0.01) {
          // 마지막 세그먼트가 끝났으므로 정지
          // Transport 시간을 마지막 세그먼트 종료 시간 이전으로 설정 (현재 씬에 머물도록)
          const finalSceneIndex = lastSegment.sceneIndex
          if (finalSceneIndex !== undefined) {
            const finalTime = Math.max(0, segmentEndTime - 0.01)
            transport.seek(finalTime)
          }
          
          if (setIsPlaying) {
            setIsPlaying(false)
          }
          setPlaybackEndTime(null)
          setPlayingSceneIndex(null)
          setPlayingGroupSceneId(null)
          // 허용된 씬 인덱스 제거
          const currentTtsTrack = ttsTrackRef.current.getTtsTrack()
          if (currentTtsTrack && 'setAllowedSceneIndices' in currentTtsTrack) {
            (currentTtsTrack as { setAllowedSceneIndices: (indices: number[] | null) => void }).setAllowedSceneIndices(null)
          }
          // 씬/그룹 재생 중일 때는 다음 씬으로 전환하지 않고 현재 씬에 머물기
          // 렌더링은 하지 않음 (현재 상태 유지)
          return
        }
        
        // 씬/그룹 재생 중일 때는 마지막 세그먼트가 아니어도 다음 씬으로 전환하지 않음
        // 현재 씬 내에서만 재생되도록 함
        return
      }
      
      // 전체 재생 중일 때만 세그먼트 종료 시 다음 씬으로 전환
      // 세그먼트 종료 시점에 정확한 씬 전환 보장
      // segmentEndTime은 현재 씬의 종료 시간이므로, 다음 씬으로 전환해야 함
      const nextSceneIndex = sceneIndex + 1 < timeline.scenes.length ? sceneIndex + 1 : sceneIndex
      
      // segmentEndTime을 기반으로 정확한 씬을 렌더링
      // forceSceneIndex를 사용하여 calculateSceneFromTime의 계산 오류 방지
      renderAtRef.current(segmentEndTime, { skipAnimation: false, forceSceneIndex: nextSceneIndex })
    }
    // onSegmentEndRef, renderAtRef는 ref이므로 의존성 배열에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, setIsPlaying, playingSceneIndex, playingGroupSceneId, ttsTrack.segments, setPlaybackEndTime, setPlayingSceneIndex, setPlayingGroupSceneId, transport, ttsTrackRef])

  // Transport 시간이 변경될 때 자동으로 TtsTrack 재생 업데이트 (재생 중일 때만)
  useEffect(() => {
    if (!isPlaying || !audioContext || !transport.transport) {
      return
    }
    
    // 씬/그룹 재생 중일 때는 Transport 시간을 고정하고 TTS만 AudioContext 기준으로 재생
    if (playingSceneIndex !== null || playingGroupSceneId !== null) {
      const segments = ttsTrack.segments
      let allowedSegments: typeof segments = []
      let segmentStartTime = 0
      
      if (playingSceneIndex !== null) {
        // 씬 재생: 해당 씬의 세그먼트만 필터링
        allowedSegments = segments.filter((seg: TtsSegment) => seg.sceneIndex === playingSceneIndex)
      } else if (playingGroupSceneId !== null && timeline) {
        // 그룹 재생: 해당 그룹의 모든 씬의 세그먼트 필터링
        const groupSceneIndices = timeline.scenes
          .map((scene, idx) => scene.sceneId === playingGroupSceneId ? idx : -1)
          .filter(idx => idx >= 0)
        allowedSegments = segments.filter((seg: TtsSegment) => 
          seg.sceneIndex !== undefined && groupSceneIndices.includes(seg.sceneIndex)
        )
      }
      
      if (allowedSegments.length > 0) {
        const firstSegment = allowedSegments[0]
        segmentStartTime = firstSegment.startSec
        const lastSegment = allowedSegments[allowedSegments.length - 1]
        const segmentEndTime = lastSegment.startSec + (lastSegment.durationSec ?? 0)
        
        // 재생 시작 시 Transport 시간을 고정하고 AudioContext 시간 기록
        if (sceneGroupPlayStartTimeRef.current === null) {
          sceneGroupPlayStartTimeRef.current = segmentStartTime
          sceneGroupPlayStartAudioCtxTimeRef.current = audioContext.currentTime
          // Transport 시간을 시작 시간으로 고정 (씬/그룹 재생 시 Transport 시간 고정)
          transport.seek(segmentStartTime)
          // TTS 재생 시작 (처음부터 시작)
          const audioCtxTime = audioContext.currentTime
          ttsTrack.playFrom(segmentStartTime, audioCtxTime)
          lastTtsUpdateTimeRef.current = segmentStartTime
        }
        
        // AudioContext 기준 상대 시간 계산 (0부터 시작)
        const audioCtxNow = audioContext.currentTime
        const relativeTime = sceneGroupPlayStartAudioCtxTimeRef.current !== null
          ? audioCtxNow - sceneGroupPlayStartAudioCtxTimeRef.current
          : 0
        
        // 상대 시간을 타임라인 시간으로 변환
        const timelineTime = segmentStartTime + relativeTime
        
        // 범위를 벗어나면 정지
        if (timelineTime >= segmentEndTime) {
          // Transport 시간을 마지막 세그먼트 종료 시간 이전으로 설정 (현재 씬에 머물도록)
          const finalTime = Math.max(segmentStartTime, segmentEndTime - 0.01)
          transport.seek(finalTime)
          
          if (setIsPlaying) {
            setIsPlaying(false)
          }
          setPlaybackEndTime(null)
          setPlayingSceneIndex(null)
          setPlayingGroupSceneId(null)
          sceneGroupPlayStartTimeRef.current = null
          sceneGroupPlayStartAudioCtxTimeRef.current = null
          // 허용된 씬 인덱스 제거
          const currentTtsTrack = ttsTrackRef.current.getTtsTrack()
          if (currentTtsTrack && 'setAllowedSceneIndices' in currentTtsTrack) {
            (currentTtsTrack as { setAllowedSceneIndices: (indices: number[] | null) => void }).setAllowedSceneIndices(null)
          }
          // 렌더링은 하지 않음 (현재 상태 유지, 마지막 씬이 렌더링되지 않도록)
          return
        }
        
        // TTS 재생 업데이트 (상대 시간 기준)
        const timeDiff = Math.abs(timelineTime - lastTtsUpdateTimeRef.current)
        if (timeDiff >= 0.1 || lastTtsUpdateTimeRef.current < 0) {
          ttsTrack.playFrom(timelineTime, audioCtxNow)
          lastTtsUpdateTimeRef.current = timelineTime
        }
        
        // 애니메이션을 위해 renderAt에 실제 재생 시간 전달
        // 단, 씬/그룹 재생 중에는 해당 범위를 벗어나지 않도록 제한 (다음 씬 렌더링 방지)
        if (renderAtRef.current) {
          // 마지막 세그먼트 종료 시간까지만 렌더링 (다음 씬으로 넘어가지 않도록)
          const renderTime = Math.min(timelineTime, segmentEndTime - 0.01) // 0.01초 여유를 두어 경계에서 멈춤
          
          // 씬/그룹 재생 중에는 현재 활성 세그먼트의 씬 인덱스 사용 (forceSceneIndex)
          let forceSceneIndex: number | undefined = undefined
          if (playingSceneIndex !== null) {
            // 씬 재생: 해당 씬 인덱스 고정
            forceSceneIndex = playingSceneIndex
          } else if (playingGroupSceneId !== null) {
            // 그룹 재생: 현재 활성 세그먼트의 씬 인덱스 사용
            const activeSegment = ttsTrack.getActiveSegment(renderTime)
            if (activeSegment && activeSegment.segment.sceneIndex !== undefined) {
              // 활성 세그먼트가 그룹에 속하는지 확인
              if (timeline) {
                const scene = timeline.scenes[activeSegment.segment.sceneIndex]
                if (scene && scene.sceneId === playingGroupSceneId) {
                  forceSceneIndex = activeSegment.segment.sceneIndex
                }
              }
            }
          }
          
          renderAtRef.current(renderTime, { 
            skipAnimation: false,
            forceSceneIndex 
          })
        }
        
        // Transport 시간은 고정 유지 (업데이트하지 않음)
        return
      }
    } else {
      // 전체 재생 중일 때는 기존 로직 사용
      sceneGroupPlayStartTimeRef.current = null
      sceneGroupPlayStartAudioCtxTimeRef.current = null
    }
    
    // 전체 재생 중일 때만 Transport 시간 기반으로 TTS 재생 업데이트
    const currentT = transport.currentTime
    
    // 씬/그룹 재생 종료 시간 체크 (백업 - 전체 재생용)
    if (playbackEndTime !== null && currentT >= playbackEndTime) {
      // 재생 종료 시간에 도달하면 자동 정지
      if (setIsPlaying) {
        setIsPlaying(false)
      }
      setPlaybackEndTime(null)
      setPlayingSceneIndex(null)
      setPlayingGroupSceneId(null)
      // 허용된 씬 인덱스 제거
      const currentTtsTrack = ttsTrackRef.current.getTtsTrack()
      if (currentTtsTrack && 'setAllowedSceneIndices' in currentTtsTrack) {
        (currentTtsTrack as { setAllowedSceneIndices: (indices: number[] | null) => void }).setAllowedSceneIndices(null)
      }
      return
    }
    
    // 이전 시간과 비교하여 씬이 변경되었거나 충분히 시간이 지났을 때만 업데이트
    const timeDiff = Math.abs(currentT - lastTtsUpdateTimeRef.current)
    
    // 씬이 변경되었거나 0.1초 이상 지났을 때만 업데이트 (과도한 호출 방지)
    if (timeDiff >= 0.1 || lastTtsUpdateTimeRef.current < 0) {
      const audioCtxTime = audioContext.currentTime
      ttsTrack.playFrom(currentT, audioCtxTime)
      lastTtsUpdateTimeRef.current = currentT
    }
    // renderAtRef, transport는 ref이거나 안정적인 참조이므로 의존성 배열에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport.currentTime, isPlaying, audioContext, ttsTrack, playbackEndTime, setIsPlaying, playingSceneIndex, playingGroupSceneId, timeline])
}
