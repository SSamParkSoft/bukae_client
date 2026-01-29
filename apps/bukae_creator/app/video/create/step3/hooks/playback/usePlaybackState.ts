'use client'

import { useCallback } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSceneStartTime } from '@/utils/timeline'
import type { MakeTtsKeyFunction } from '@/lib/utils/tts'
import type { TtsTrack } from '@/hooks/video/audio/TtsTrack'

interface UsePlaybackStateParams {
  // Timeline and TTS
  timeline: TimelineData | null
  voiceTemplate: string | null
  buildSceneMarkupWithTimeline: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey: MakeTtsKeyFunction
  ensureSceneTts: (sceneIndex: number) => Promise<void>
  
  // Transport and TTS Track
  transport: ReturnType<typeof import('@/hooks/video/transport/useTransport').useTransport>
  ttsTrack: ReturnType<typeof import('@/hooks/video/audio/useTtsTrack').useTtsTrack>
  audioContext: AudioContext | undefined
  
  // Cache refs
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  ttsCacheRefShared: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  renderAtRef: React.MutableRefObject<((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined>
  
  // Playback state
  playingSceneIndex: number | null
  playingGroupSceneId: number | null
  setPlayingSceneIndex: (index: number | null) => void
  setPlayingGroupSceneId: (id: number | null) => void
  setPlaybackEndTime: (time: number | null) => void
  
  // BGM
  confirmedBgmTemplate: string | null
  playbackSpeed: number
  bgmAudioRef: React.MutableRefObject<HTMLAudioElement | null>
  startBgmAudio: (templateId: string, speed: number, loop: boolean, startTime: number) => Promise<void>
  pauseBgmAudio: () => void
  resumeBgmAudio: () => Promise<void>
  
  // Refs
  sceneGroupPlayStartTimeRef: React.MutableRefObject<number | null>
  sceneGroupPlayStartAudioCtxTimeRef: React.MutableRefObject<number | null>
  ttsTrackRef: React.MutableRefObject<{ getTtsTrack: () => TtsTrack | null }>
  
  // UI state
  setIsPreparing: (preparing: boolean) => void
}

export function usePlaybackState({
  timeline,
  voiceTemplate,
  buildSceneMarkupWithTimeline,
  makeTtsKey,
  ensureSceneTts,
  transport,
  ttsTrack,
  audioContext,
  ttsCacheRef,
  ttsCacheRefShared,
  renderAtRef,
  playingSceneIndex,
  playingGroupSceneId,
  setPlayingSceneIndex,
  setPlayingGroupSceneId,
  setPlaybackEndTime,
  confirmedBgmTemplate,
  playbackSpeed,
  bgmAudioRef,
  startBgmAudio,
  pauseBgmAudio,
  resumeBgmAudio,
  sceneGroupPlayStartTimeRef,
  sceneGroupPlayStartAudioCtxTimeRef,
  ttsTrackRef,
  setIsPreparing,
}: UsePlaybackStateParams) {
  const setIsPlaying = useCallback(async (
    playing: boolean,
    options?: { sceneIndex?: number | null; groupSceneId?: number | null; startFromSceneIndex?: number }
  ) => { 
    if (playing) {
      // 재생 시작 전에 필요한 씬의 TTS 파일이 있는지 확인하고 없으면 생성
      if (timeline && voiceTemplate) {
        const scenesToLoad: number[] = []
        
        // 씬/그룹 재생 중일 때는 해당 씬/그룹만 확인
        let targetSceneIndices: number[] = []
        if (options?.sceneIndex !== null && options?.sceneIndex !== undefined) {
          // 씬 재생: 해당 씬만
          targetSceneIndices = [options.sceneIndex]
        } else if (options?.groupSceneId !== null && options?.groupSceneId !== undefined) {
          // 그룹 재생: 해당 그룹의 모든 씬
          targetSceneIndices = timeline.scenes
            .map((scene, idx) => scene.sceneId === options.groupSceneId ? idx : -1)
            .filter(idx => idx >= 0)
        } else {
          // 전체 재생: 모든 씬
          targetSceneIndices = timeline.scenes.map((_, idx) => idx)
        }
        
        for (const sceneIndex of targetSceneIndices) {
          const scene = timeline.scenes[sceneIndex]
          if (!scene) continue
          
          const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
          if (!sceneVoiceTemplate) continue
          
          const markups = buildSceneMarkupWithTimeline(timeline, sceneIndex)
          let needsTts = false
          
          for (const markup of markups) {
            if (!markup) continue
            const key = makeTtsKey(sceneVoiceTemplate, markup)
            if (!ttsCacheRefShared.current.has(key)) {
              needsTts = true
              break
            }
          }
          
          if (needsTts) {
            scenesToLoad.push(sceneIndex)
          }
        }
        
          // 필요한 씬들의 TTS 생성 (병렬로 처리하되 동시 요청 수 제한)
          // 각 씬 내부의 part들은 이미 병렬 처리되므로, 씬 간 병렬 처리로 전체 시간 단축
          // 전체 재생, 씬 재생, 그룹 재생 모두 TTS 생성 중 로딩 스피너 표시
          if (scenesToLoad.length > 0) {
            setIsPreparing(true)
            
            // 첫 번째 씬을 우선 처리하여 재생 시작 시간 단축
            const firstSceneIndex = scenesToLoad[0]
            const remainingScenes = scenesToLoad.slice(1)
            
            // 첫 번째 씬과 나머지 씬들을 동시에 시작 (첫 번째 씬이 먼저 완료되도록)
            const firstScenePromise = firstSceneIndex !== undefined
              ? ensureSceneTts(firstSceneIndex).then(() => {
                  // 첫 번째 씬의 TTS 생성 완료 후 즉시 캐시 동기화
                  if (ttsCacheRef && ttsCacheRefShared) {
                    const scene = timeline.scenes[firstSceneIndex]
                    if (scene) {
                      const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
                      const markups = buildSceneMarkupWithTimeline(timeline, firstSceneIndex)
                      markups.forEach((markup) => {
                        if (!markup) return
                        const key = makeTtsKey(sceneVoiceTemplate, markup)
                        const cached = ttsCacheRef.current.get(key)
                        if (cached) {
                          ttsCacheRefShared.current.set(key, cached)
                        }
                      })
                    }
                  }
                }).catch(() => {
                  // TTS 생성 실패 (로그 제거)
                })
              : Promise.resolve()
            
            // 나머지 씬들은 모두 동시에 시작 (진짜 병렬 처리)
            if (remainingScenes.length > 0) {
              // 모든 씬을 한 번에 시작하여 진짜 병렬 처리
              const remainingPromises = remainingScenes.map(async (sceneIndex) => {
                try {
                  await ensureSceneTts(sceneIndex)
                  // 각 씬의 TTS 생성 완료 후 즉시 캐시 동기화
                  if (ttsCacheRef && ttsCacheRefShared) {
                    // 해당 씬의 모든 키를 찾아서 동기화
                    const scene = timeline.scenes[sceneIndex]
                    if (scene) {
                      const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
                      const markups = buildSceneMarkupWithTimeline(timeline, sceneIndex)
                      markups.forEach((markup) => {
                        if (!markup) return
                        const key = makeTtsKey(sceneVoiceTemplate, markup)
                        const cached = ttsCacheRef.current.get(key)
                        if (cached) {
                          ttsCacheRefShared.current.set(key, cached)
                        }
                      })
                    }
                  }
                } catch (error) {
                  console.error('[setIsPlaying] 씬 TTS 생성 실패:', error)
                  alert('TTS 생성에 실패했습니다. 개발자에게 문의해주세요.')
                }
              })
              
              // 첫 번째 씬과 나머지 씬들을 모두 동시에 처리 (진짜 병렬 처리)
              await Promise.all([firstScenePromise, ...remainingPromises])
            } else {
              // 첫 번째 씬만 있으면 첫 번째 씬만 처리
              await firstScenePromise
            }
            
            // TTS 파일 생성 완료 후 전체 캐시 동기화 (중요!)
            // useTtsManager의 ttsCacheRef를 ttsCacheRefShared에 동기화
            if (ttsCacheRef && ttsCacheRefShared) {
              ttsCacheRefShared.current.clear()
              ttsCacheRef.current.forEach((value, key) => {
                ttsCacheRefShared.current.set(key, value)
              })
            }
          
          // TTS 파일 생성 완료 후 세그먼트 강제 업데이트 (폴링 방식 제거)
          // refreshSegments를 호출하여 segments를 재계산하고 preload 실행
          // refreshSegments가 Promise를 반환하므로 segments 업데이트 및 preload 완료를 기다림
          if (typeof window !== 'undefined' && ttsTrack.refreshSegments) {
            await ttsTrack.refreshSegments()
          }
          
          // TTS 생성 완료 후 로딩 스피너 숨김
          setIsPreparing(false)
        }
      }
      
      // 씬/그룹 재생 시작 시 해당 씬의 시작 시간으로 이동
      let startTime: number | undefined = undefined
      let forceSceneIndex: number | undefined = undefined
      
      if (options?.sceneIndex !== null && options?.sceneIndex !== undefined && timeline) {
        // 씬 재생: 해당 씬의 시작 시간으로 이동
        startTime = getSceneStartTime(timeline, options.sceneIndex)
        forceSceneIndex = options.sceneIndex
      } else if (options?.groupSceneId !== null && options?.groupSceneId !== undefined && timeline) {
        // 그룹 재생: 그룹의 첫 번째 씬의 시작 시간으로 이동
        const groupSceneIndices = timeline.scenes
          .map((scene, idx) => scene.sceneId === options.groupSceneId ? idx : -1)
          .filter(idx => idx >= 0)
        if (groupSceneIndices.length > 0) {
          const firstSceneIndex = groupSceneIndices[0]
          if (firstSceneIndex !== undefined) {
            startTime = getSceneStartTime(timeline, firstSceneIndex)
            forceSceneIndex = firstSceneIndex
          }
        }
      } else if (
        options?.startFromSceneIndex != null &&
        options.startFromSceneIndex >= 0 &&
        timeline &&
        options.startFromSceneIndex < timeline.scenes.length
      ) {
        // 전체 재생이지만 선택된 씬이 있으면: 해당 씬의 세그먼트 시작 시점부터 재생
        startTime = getSceneStartTime(timeline, options.startFromSceneIndex)
      }
      
      // 씬/그룹/시작씬 지정이면 시작 시간으로 이동, 아니면 현재 시간 사용
      let currentT: number
      if (startTime !== undefined) {
        // 씬/그룹 재생: 항상 시작 시간으로 이동 (처음부터 시작)
        transport.seek(startTime)
        // seek 후 Transport 시간이 확실히 설정되도록 getTime() 사용
        currentT = transport.getTime()
        // seek가 완료되지 않았을 수 있으므로 startTime과 비교하여 보정
        if (Math.abs(currentT - startTime) > 0.01) {
          currentT = startTime
          transport.seek(startTime)
        }
      } else {
        // 전체 재생: Transport의 현재 시간을 정확히 사용
        // 클릭 후 시간이 설정되었을 수 있으므로 getTime() 사용
        currentT = transport.getTime()
        
        // 재생 시작 전에 Transport 시간이 정확히 설정되었는지 확인
        // 클릭 후 약간의 지연이 있을 수 있으므로 한 번 더 확인
        const verifyTime = transport.getTime()
        if (Math.abs(verifyTime - currentT) > 0.001) {
          // 시간이 변경되었으면 최신 값 사용
          currentT = verifyTime
        }
        
        // 재생 시작 시점의 시간을 정확히 설정 (seek로 동기화)
        if (Math.abs(transport.getTime() - currentT) > 0.001) {
          transport.seek(currentT)
          currentT = transport.getTime()
        }
      }
      
      transport.play()
      
      // BGM 재생 시작 (확정된 BGM이 있는 경우)
      // 타임라인 시간에 맞춰 BGM 재생 위치 설정
      if (confirmedBgmTemplate && typeof window !== 'undefined') {
        const bgmAudio = bgmAudioRef.current
        if (bgmAudio && bgmAudio.paused === false) {
          // 이미 재생 중이면 재개만 하면 됨
          resumeBgmAudio().catch(() => {
            // 재개 실패 시 다시 시작
            startBgmAudio(confirmedBgmTemplate, playbackSpeed, true, currentT).catch(() => {
              // BGM 재생 실패 시 무시
            })
          })
        } else {
          // 재생 중이 아니면 새로 시작
          startBgmAudio(confirmedBgmTemplate, playbackSpeed, true, currentT).catch(() => {
            // BGM 재생 실패 시 무시 (에러 로그만 출력하지 않음)
          })
        }
      }
      
      // 재생 시작 직후 시간을 다시 확인하여 정확도 보장
      // play() 호출 후 약간의 지연이 있을 수 있으므로 requestAnimationFrame 사용
      requestAnimationFrame(() => {
        const actualTime = transport.getTime()
        if (Math.abs(actualTime - currentT) > 0.01) {
          // 10ms 이상 차이나면 seek로 보정
          transport.seek(currentT)
        }
      })
      
      // 씬/그룹 재생 시작 시 ref 초기화 (재시작 시에도 처음부터 시작하도록)
      // useEffect에서 Transport 시간 고정 및 TTS 재생을 처리하므로 여기서는 ref만 초기화
      if (options?.sceneIndex !== null && options?.sceneIndex !== undefined || 
          options?.groupSceneId !== null && options?.groupSceneId !== undefined) {
        sceneGroupPlayStartTimeRef.current = null
        sceneGroupPlayStartAudioCtxTimeRef.current = null
        // TTS 재생은 useEffect에서 처리 (Transport 시간 고정 후)
      } else {
        // 전체 재생: TtsTrack 재생 시작 (클라이언트에서만)
        // preload가 완료된 후에 호출되므로 버퍼가 로드되어 있음
        if (typeof window !== 'undefined' && transport.transport && audioContext) {
          const audioCtxTime = audioContext.currentTime
          ttsTrack.playFrom(currentT, audioCtxTime)
        }
      }
      
      // 시각적 렌더링 업데이트 (현재 위치에서 재생 시작)
      // 씬/그룹 재생 시에는 해당 씬만 렌더링 (마지막 씬이 렌더링되지 않도록)
      if (renderAtRef.current) {
        if (forceSceneIndex !== undefined) {
          // 씬/그룹 재생: 해당 씬에 고정하여 렌더링
          renderAtRef.current(currentT, { skipAnimation: false, forceSceneIndex })
        } else {
          // 전체 재생: 일반 렌더링
          renderAtRef.current(currentT, { skipAnimation: false })
        }
      }
      
      // 전체 재생 시작 시 씬/그룹 재생 상태 초기화 (종료 시간 없음)
      if (playingSceneIndex === null && playingGroupSceneId === null) {
        setPlaybackEndTime(null)
      }
        } else {
          // 일시정지 전에 현재 시간을 먼저 가져옴 (pause()가 timelineOffsetSec를 업데이트하기 전)
          const currentT = transport.getTime()
          
          // 씬/그룹 재생 중일 때 정지하면 현재 씬에 머물도록 처리
          let finalSceneIndex: number | undefined = undefined
          let finalTime = currentT
          
          if (playingSceneIndex !== null) {
            // 씬 재생 중 정지: 현재 씬에 머물도록
            finalSceneIndex = playingSceneIndex
            // 현재 씬의 범위 내에서 시간 조정
            if (timeline) {
              const sceneStartTime = getSceneStartTime(timeline, playingSceneIndex)
              const scene = timeline.scenes[playingSceneIndex]
              if (scene) {
                const sceneEndTime = sceneStartTime + scene.duration
                // 현재 시간이 씬 범위를 벗어나면 씬 내부로 조정
                finalTime = Math.max(sceneStartTime, Math.min(currentT, sceneEndTime - 0.01))
              }
            }
          } else if (playingGroupSceneId !== null && timeline) {
            // 그룹 재생 중 정지: 현재 활성 세그먼트의 씬에 머물도록
            const segments = ttsTrack.segments
            const groupSceneIndices = timeline.scenes
              .map((scene, idx) => scene.sceneId === playingGroupSceneId ? idx : -1)
              .filter(idx => idx >= 0)
            const allowedSegments = segments.filter(seg => 
              seg.sceneIndex !== undefined && groupSceneIndices.includes(seg.sceneIndex)
            )
            
            if (allowedSegments.length > 0) {
              // 현재 시간에 해당하는 세그먼트 찾기
              let activeSegment = allowedSegments.find(seg => 
                currentT >= seg.startSec && currentT < seg.startSec + (seg.durationSec ?? 0)
              )
              
              // 현재 시간에 해당하는 세그먼트가 없으면 마지막 세그먼트 사용
              if (!activeSegment) {
                // 현재 시간보다 이전의 마지막 세그먼트 찾기
                const previousSegments = allowedSegments.filter(seg => seg.startSec <= currentT)
                if (previousSegments.length > 0) {
                  activeSegment = previousSegments[previousSegments.length - 1]
                } else {
                  // 현재 시간보다 이전 세그먼트가 없으면 첫 번째 세그먼트 사용
                  activeSegment = allowedSegments[0]
                }
              }
              
              if (activeSegment && activeSegment.sceneIndex !== undefined) {
                finalSceneIndex = activeSegment.sceneIndex
                // 그룹의 마지막 세그먼트 종료 시간 계산
                const lastSegment = allowedSegments[allowedSegments.length - 1]
                const segmentEndTime = lastSegment.startSec + (lastSegment.durationSec ?? 0)
                // 현재 시간이 그룹 범위를 벗어나면 그룹 내부로 조정
                const firstSegment = allowedSegments[0]
                finalTime = Math.max(
                  firstSegment.startSec, 
                  Math.min(currentT, segmentEndTime - 0.01)
                )
              }
            }
          }
          
          transport.pause()
          ttsTrack.stopAll()
          
          // BGM 일시정지 (재생 상태 유지)
          if (typeof window !== 'undefined' && confirmedBgmTemplate) {
            pauseBgmAudio()
          }
          
          // 씬/그룹 재생 중 정지 시 Transport 시간 조정 (렌더링은 하지 않음)
          if (finalSceneIndex !== undefined && finalTime !== currentT) {
            transport.seek(finalTime)
          }
          
          // 씬/그룹 재생 관련 ref 초기화
          sceneGroupPlayStartTimeRef.current = null
          sceneGroupPlayStartAudioCtxTimeRef.current = null
          
          // 재생 중지 시 씬/그룹 재생 상태 초기화
          setPlayingSceneIndex(null)
          setPlayingGroupSceneId(null)
          
          // 허용된 씬 인덱스 제거
          const currentTtsTrack = ttsTrackRef.current.getTtsTrack()
          if (currentTtsTrack) {
            currentTtsTrack.setAllowedSceneIndices(null)
          }
          
          // 씬/그룹 재생 중 정지 시에는 렌더링하지 않음 (현재 상태 유지, 마지막 씬이 렌더링되지 않도록)
          // 전체 재생 중 정지 시에만 렌더링
          if (renderAtRef.current && finalSceneIndex === undefined) {
            // 전체 재생 중 정지: 일반 렌더링
            renderAtRef.current(finalTime, { skipAnimation: true })
          }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, voiceTemplate, buildSceneMarkupWithTimeline, ensureSceneTts, transport, ttsTrack, audioContext, playingSceneIndex, playingGroupSceneId, setPlaybackEndTime, setPlayingSceneIndex, setPlayingGroupSceneId])
    // ttsCacheRef, ttsCacheRefShared, renderAtRef는 ref이므로 의존성 배열에서 제외

  return {
    setIsPlaying,
  }
}
