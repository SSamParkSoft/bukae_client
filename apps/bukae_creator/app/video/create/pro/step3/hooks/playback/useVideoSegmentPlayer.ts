import { useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import * as PIXI from 'pixi.js'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/components/ProSceneListPanel'

interface UseVideoSegmentPlayerParams {
  /** 재생 중 여부 */
  isPlaying: boolean
  /** PixiJS 준비 완료 여부 */
  pixiReady: boolean
  /** 모든 씬 데이터 */
  scenes: ProStep3Scene[]
  /** 전체 재생 시간 */
  totalDurationValue: number
  /** 재생 속도 */
  playbackSpeed: number
  /** 비디오를 PixiJS Sprite로 로드하는 함수 */
  loadVideoAsSprite: (sceneIndex: number, videoUrl: string) => Promise<void>
  /** 자막 렌더링 함수 */
  renderSubtitle: (sceneIndex: number, script: string) => void
  /** TTS 재생 함수 */
  playTts: (sceneIndex: number, voiceTemplate: string | null | undefined, script: string) => Promise<void>
  /** 재생 버튼 클릭 핸들러 */
  onPlayPause: () => void
  /** 현재 씬 인덱스 설정 함수 */
  setCurrentSceneIndex: (index: number) => void
  /** 현재 재생 시간 설정 함수 */
  setCurrentTime: (time: number) => void
  /** 전체 재생 시간 설정 함수 */
  setTotalDuration: (duration: number) => void
  /** 비디오 요소 refs */
  videoElementsRef: React.MutableRefObject<Map<number, HTMLVideoElement>>
  /** 스프라이트 refs */
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  /** TTS 오디오 refs */
  ttsAudioRefsRef: React.MutableRefObject<Map<number, HTMLAudioElement>>
  /** 자막 텍스트 refs */
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
}

/**
 * Pro step3 비디오 세그먼트 재생 로직 커스텀 훅
 * 
 * 각 씬의 격자 구간(selectionStartSeconds ~ selectionEndSeconds)만 재생하고,
 * 비디오+자막+TTS를 동기화합니다.
 */
export function useVideoSegmentPlayer({
  isPlaying,
  pixiReady,
  scenes,
  totalDurationValue,
  playbackSpeed,
  loadVideoAsSprite,
  renderSubtitle,
  playTts,
  onPlayPause,
  setCurrentSceneIndex,
  setCurrentTime,
  setTotalDuration,
  videoElementsRef,
  spritesRef,
  ttsAudioRefsRef,
  textsRef,
}: UseVideoSegmentPlayerParams) {
  // 재생 관련 refs
  const currentSegmentIndexRef = useRef(0)
  const segmentStartTimeRef = useRef(0)
  const userGestureRef = useRef<{ timestamp: number } | null>(null)
  const isInitialMountRef = useRef(true)
  // 이벤트 리스너 관리: 각 비디오 요소에 대한 리스너 핸들러를 저장
  const videoEventListenersRef = useRef<Map<number, { timeupdate: () => void; ended: () => void }>>(new Map())
  // scenes를 ref로 보관해, 격자 이동 등으로 참조만 바뀔 때 재생 effect가 다시 돌지 않도록 함
  const scenesRef = useRef(scenes)
  // totalDuration도 ref로 두어 격자 이동 시 effect가 재실행되지 않도록 함
  const totalDurationRef = useRef(totalDurationValue)
  // playSegment는 아래 useCallback으로 정의; useLayoutEffect에서 동기화함
  const playSegmentRef = useRef<((segmentIndex: number, scene: ProStep3Scene, originalSceneIndex: number, previousSegmentsTime: number, onSegmentEnd: () => void) => Promise<boolean>) | null>(null)

  /**
   * 현재 재생 시간 업데이트
   * 
   * 시간 계산 공식:
   * - 전체 재생 시간 = 이전 세그먼트들의 시간 합 + 현재 세그먼트의 진행 시간
   * - 현재 세그먼트의 진행 시간 = 비디오 현재 시간 - 격자 시작 시간 (selectionStartSeconds)
   * 
   * 예시:
   * - 세그먼트 1: 0~5초 (격자: 2~7초) → 재생 시간: 0~5초
   * - 세그먼트 2: 5~10초 (격자: 1~6초) → 재생 시간: 5~10초
   * - 비디오가 격자 1~6초 구간에서 3초 지점에 있으면 → 전체 재생 시간: 5 + (3-1) = 7초
   */
  const updatePlaybackTime = useCallback((videoElement: HTMLVideoElement, scene: ProStep3Scene, previousSegmentsTime: number) => {
    if (!isPlaying) return
    
    // 현재 세그먼트의 진행 시간 = 비디오 현재 시간 - 격자 시작 시간
    const segmentProgress = videoElement.currentTime - (scene.selectionStartSeconds || 0)
    
    // 전체 재생 시간 = 이전 세그먼트들의 시간 합 + 현재 세그먼트의 진행 시간
    const currentTotalTime = previousSegmentsTime + segmentProgress
    
    // 시간 범위 제한 (0 ~ 전체 재생 시간)
    const total = totalDurationRef.current
    setCurrentTime(Math.max(0, Math.min(currentTotalTime, total)))
  }, [isPlaying, setCurrentTime])

  /**
   * 특정 세그먼트의 재생을 정지하고 이벤트 리스너 제거
   * 
   * @param sceneIndex 씬 인덱스
   * 
   * 이 함수는 다음을 수행합니다:
   * 1. 비디오 재생 일시정지
   * 2. 등록된 이벤트 리스너 제거 (timeupdate, ended)
   * 3. 리스너 참조 삭제
   */
  const stopSegment = useCallback((sceneIndex: number) => {
    const videoElement = videoElementsRef.current.get(sceneIndex)
    if (!videoElement) return
    
    // 비디오 일시정지
    videoElement.pause()
    
    // 등록된 이벤트 리스너 제거
    const listeners = videoEventListenersRef.current.get(sceneIndex)
    if (listeners) {
      videoElement.removeEventListener('timeupdate', listeners.timeupdate)
      videoElement.removeEventListener('ended', listeners.ended)
      videoEventListenersRef.current.delete(sceneIndex)
    }
  }, [videoElementsRef])

  /**
   * 다음 세그먼트로 인덱스 이동
   * 
   * 이 함수는 currentSegmentIndexRef를 증가시켜 다음 세그먼트를 가리키도록 합니다.
   * 실제 재생은 이벤트 리스너에서 onSegmentEnd 콜백을 통해 트리거됩니다.
   */
  const moveToNextSegment = useCallback(() => {
    currentSegmentIndexRef.current++
  }, [])

  /**
   * 특정 세그먼트 재생
   * 
   * 모든 세그먼트(첫 번째 포함)를 동일한 방식으로 처리합니다:
   * 1. 비디오 로드 (PixiJS Sprite로 변환)
   * 2. 이전 세그먼트 정지 및 리스너 제거
   * 3. 현재 세그먼트의 스프라이트 표시
   * 4. 자막 및 TTS 재생
   * 5. 비디오를 격자 시작 지점으로 설정
   * 6. 이벤트 리스너 등록 (timeupdate, ended)
   * 7. 비디오 재생 시작
   * 
   * 첫 번째 세그먼트에만 사용자 제스처 확인이 필요합니다 (브라우저 자동재생 정책).
   * 
   * @param segmentIndex 세그먼트 인덱스 (validScenes 배열 기준)
   * @param scene 씬 데이터
   * @param originalSceneIndex 원본 scenes 배열의 인덱스
   * @param previousSegmentsTime 이전 세그먼트들의 시간 합
   * @param onSegmentEnd 세그먼트 종료 시 호출할 콜백 (다음 세그먼트 재생)
   * @returns 재생 성공 여부
   */
  const playSegment = useCallback(async (
    segmentIndex: number,
    scene: ProStep3Scene,
    originalSceneIndex: number,
    previousSegmentsTime: number,
    onSegmentEnd: () => void
  ) => {
    if (!scene.videoUrl) {
      moveToNextSegment()
      return false
    }

    try {
      // 비디오 로드: 모든 세그먼트를 동일하게 처리
      // (이미 로드되어 있어도 다시 로드하여 깔끔하게 시작)
      await loadVideoAsSprite(originalSceneIndex, scene.videoUrl)
      
      const videoElement = videoElementsRef.current.get(originalSceneIndex)
      const sprite = spritesRef.current.get(originalSceneIndex)
      
      if (!videoElement || !sprite) {
        console.error('비디오 로드 실패')
        moveToNextSegment()
        return false
      }

      // 이전 세그먼트의 비디오 정지 및 리스너 제거
      videoElementsRef.current.forEach((video, idx) => {
        if (idx !== originalSceneIndex) {
          stopSegment(idx)
        }
      })

      // 이전 씬의 스프라이트 숨김
      spritesRef.current.forEach((spriteItem, idx) => {
        if (idx !== originalSceneIndex && spriteItem && !spriteItem.destroyed) {
          spriteItem.visible = false
          spriteItem.alpha = 0
        }
      })

      // 현재 씬 인덱스 업데이트
      setCurrentSceneIndex(originalSceneIndex)
      
      // 스프라이트 표시
      sprite.visible = true
      sprite.alpha = 1
      
      // 자막 렌더링
      renderSubtitle(originalSceneIndex, scene.script || '')
      
      // TTS 재생
      if (scene.voiceTemplate && scene.script) {
        playTts(originalSceneIndex, scene.voiceTemplate, scene.script).catch(console.error)
      }

      // 비디오 재생 설정: 격자 시작 지점으로 이동
      videoElement.currentTime = scene.selectionStartSeconds || 0
      videoElement.playbackRate = playbackSpeed

      // 기존 리스너 제거 (있다면)
      const existingListeners = videoEventListenersRef.current.get(originalSceneIndex)
      if (existingListeners) {
        videoElement.removeEventListener('timeupdate', existingListeners.timeupdate)
        videoElement.removeEventListener('ended', existingListeners.ended)
      }

      // 새로운 이벤트 리스너 생성
      const handleTimeUpdate = () => {
        if (!isPlaying) {
          stopSegment(originalSceneIndex)
          return
        }
        
        // 재생 시간 업데이트
        updatePlaybackTime(videoElement, scene, previousSegmentsTime)

        // 세그먼트 종료 체크: 비디오 시간이 격자 끝 지점에 도달했는지 확인
        if (videoElement.currentTime >= (scene.selectionEndSeconds || 0)) {
          stopSegment(originalSceneIndex)
          moveToNextSegment()
          onSegmentEnd() // 다음 세그먼트 재생
          return
        }
      }

      const handleEnded = () => {
        if (!isPlaying) {
          stopSegment(originalSceneIndex)
          return
        }
        stopSegment(originalSceneIndex)
        moveToNextSegment()
        onSegmentEnd() // 다음 세그먼트 재생
      }

      // 리스너 등록 및 저장
      videoElement.addEventListener('timeupdate', handleTimeUpdate)
      videoElement.addEventListener('ended', handleEnded)
      videoEventListenersRef.current.set(originalSceneIndex, {
        timeupdate: handleTimeUpdate,
        ended: handleEnded,
      })
      
      // 재생 시작
      // 첫 번째 세그먼트인 경우에만 사용자 제스처 확인 (브라우저 자동재생 정책)
      // 이후 세그먼트는 첫 번째 세그먼트의 재생 컨텍스트를 이어받아 자동으로 재생 가능
      if (segmentIndex === 0) {
        const gesture = userGestureRef.current
        // 비동기 로드 후 play()까지 시간이 걸리므로 3초 이내 제스처 허용
        const hasValidGesture = gesture && (Date.now() - gesture.timestamp) < 3000

        if (!hasValidGesture) {
          console.warn('사용자 제스처가 없어 비디오 재생을 건너뜁니다.')
          onPlayPause()
          return false
        }

        // 재생 성공 시 사용자 제스처 초기화 (다음 재생을 위해)
        userGestureRef.current = null
      }
      
      try {
        const playPromise = videoElement.play()
        if (playPromise !== undefined) {
          await playPromise
        }
        return true
      } catch (error) {
        // NotAllowedError: 사용자 상호작용이 필요한 경우
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          console.warn('비디오 재생이 차단되었습니다. 사용자 상호작용이 필요합니다.')
          onPlayPause()
          alert('비디오 재생을 시작하려면 재생 버튼을 다시 클릭해주세요.')
          return false
        }
        console.error('비디오 재생 오류:', error)
        moveToNextSegment()
        return false
      }
    } catch (error) {
      console.error('비디오 로드 오류:', error)
      moveToNextSegment()
      return false
    }
  }, [isPlaying, playbackSpeed, renderSubtitle, playTts, loadVideoAsSprite, updatePlaybackTime, stopSegment, moveToNextSegment, onPlayPause, videoElementsRef, spritesRef, setCurrentSceneIndex])

  // ref 동기화를 렌더 후에 수행 (concurrent mode 준수)
  useLayoutEffect(() => {
    scenesRef.current = scenes
    totalDurationRef.current = totalDurationValue
    playSegmentRef.current = playSegment
  }, [scenes, totalDurationValue, playSegment])

  /**
   * 재생 로직: 선택된 구간들을 순차적으로 재생
   * 
   * 이 effect는 isPlaying이 true일 때 실행되며, 다음을 수행합니다:
   * 1. 초기 마운트 시 자동재생 방지 (사용자 제스처 확인)
   * 2. 유효한 씬 필터링 (비디오 URL과 격자 구간이 있는 씬만)
   * 3. 재생 시작: 첫 번째 세그먼트부터 순차적으로 재생
   * 4. 각 세그먼트는 격자 구간(selectionStartSeconds ~ selectionEndSeconds)만 재생
   * 5. 세그먼트 종료 시 자동으로 다음 세그먼트 재생
   * 
   * cleanup 시:
   * - 모든 비디오 일시정지 및 이벤트 리스너 제거
   * - TTS 오디오 정리
   * - 자막 및 스프라이트 숨김
   */
  useEffect(() => {
    if (!isPlaying || !pixiReady) {
      return
    }

    // 초기 마운트 시에는 자동재생하지 않음 (사용자가 재생 버튼을 클릭했을 때만 재생)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      // 사용자 제스처가 없으면 재생하지 않음 (비동기 재생 대비 3초 이내)
      const gesture = userGestureRef.current
      const hasValidGesture = gesture && (Date.now() - gesture.timestamp) < 3000
      if (!hasValidGesture) {
        console.warn('초기 마운트 시 자동재생 방지: 사용자 제스처가 없습니다.')
        return
      }
    }

    // 유효한 씬 필터링: 비디오 URL과 격자 구간이 있는 씬만 재생 대상 (항상 최신 scenes 사용)
    const currentScenes = scenesRef.current
    const validScenes = currentScenes.filter(s =>
      s.videoUrl &&
      s.selectionStartSeconds !== undefined &&
      s.selectionEndSeconds !== undefined
    )

    if (validScenes.length === 0) {
      return
    }

    // 재생 시작: 세그먼트 인덱스 초기화
    currentSegmentIndexRef.current = 0
    segmentStartTimeRef.current = 0

    // 비동기로 처리하여 cascading renders 방지 (최신 값은 ref에서 읽음)
    const timeoutId = setTimeout(() => {
      setTotalDuration(totalDurationRef.current)
    }, 0)

    // ref 값들을 effect 시작 부분에서 복사하여 cleanup에서 사용
    const videoElementsSnapshot = new Map(videoElementsRef.current)
    const ttsAudiosSnapshot = new Map(ttsAudioRefsRef.current)
    const textsSnapshot = new Map(textsRef.current)
    const spritesSnapshot = new Map(spritesRef.current)
    const eventListenersSnapshot = new Map(videoEventListenersRef.current)

    /**
     * 다음 세그먼트 재생 (재귀적으로 호출)
     * playNextSegment 내부에서는 호출 시점의 scenesRef.current를 사용하므로
     * 격자 이동으로 인한 참조 변경만으로는 재생이 재시작되지 않음.
     */
    const playNextSegment = async () => {
      const scenesNow = scenesRef.current
      const validNow = scenesNow.filter(s =>
        s.videoUrl &&
        s.selectionStartSeconds !== undefined &&
        s.selectionEndSeconds !== undefined
      )

      if (currentSegmentIndexRef.current >= validNow.length) {
        setCurrentTime(totalDurationRef.current)
        onPlayPause()
        return
      }

      const scene = validNow[currentSegmentIndexRef.current]
      const originalSceneIndex = scenesNow.findIndex(s => s.id === scene.id)
      
      // 씬을 찾을 수 없으면 다음 세그먼트로 이동
      if (originalSceneIndex < 0) {
        moveToNextSegment()
        playNextSegment()
        return
      }

      // 이전 세그먼트들의 시간 합 (유효한 씬 목록 기준)
      const previousSegmentsTime = validNow
        .slice(0, currentSegmentIndexRef.current)
        .reduce((sum, s) => sum + ((s.selectionEndSeconds ?? 0) - (s.selectionStartSeconds ?? 0)), 0)
      segmentStartTimeRef.current = previousSegmentsTime

      // 현재 세그먼트 재생 시작 (항상 최신 playSegment 사용)
      const playSegmentFn = playSegmentRef.current
      if (!playSegmentFn) return
      const success = await playSegmentFn(
        currentSegmentIndexRef.current,
        scene,
        originalSceneIndex,
        previousSegmentsTime,
        playNextSegment
      )

      // 재생 실패 시 다음 세그먼트로 이동
      if (!success) {
        playNextSegment()
      }
    }

    // 첫 번째 세그먼트 재생 시작
    playNextSegment()

    return () => {
      // 타임아웃 정리
      clearTimeout(timeoutId)
      
      // 모든 비디오 일시정지 및 이벤트 리스너 제거
      // snapshot을 사용하여 effect 시작 시점의 리스너만 제거 (메모리 누수 방지)
      videoElementsSnapshot.forEach((videoElement, sceneIndex) => {
        videoElement.pause()
        const listeners = eventListenersSnapshot.get(sceneIndex)
        if (listeners) {
          videoElement.removeEventListener('timeupdate', listeners.timeupdate)
          videoElement.removeEventListener('ended', listeners.ended)
        }
      })
      
      // TTS 오디오 정리
      ttsAudiosSnapshot.forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
      
      // 자막 숨김
      textsSnapshot.forEach((textObj) => {
        if (textObj && !textObj.destroyed) {
          textObj.visible = false
          textObj.alpha = 0
        }
      })
      
      // 비디오 스프라이트 숨김
      spritesSnapshot.forEach((sprite) => {
        if (sprite && !sprite.destroyed) {
          sprite.visible = false
          sprite.alpha = 0
        }
      })
      
      // 재생 중지 시 타임라인을 0으로 리셋 (cascading 방지를 위해 다음 틱에 실행)
      setTimeout(() => setCurrentTime(0), 0)
    }
  // scenes, totalDurationValue, playSegment를 의존성에서 제외: 격자 이동 시 재생이 다시 시작되지 않도록 함.
  }, [
    isPlaying,
    pixiReady,
    moveToNextSegment,
    setCurrentTime,
    setTotalDuration,
    onPlayPause,
    videoElementsRef,
    spritesRef,
    ttsAudioRefsRef,
    textsRef,
  ])

  /**
   * 사용자 제스처 추적 (재생 버튼 클릭 시 호출)
   */
  const trackUserGesture = useCallback(() => {
    if (!isPlaying) {
      userGestureRef.current = { timestamp: Date.now() }
    }
  }, [isPlaying])

  return {
    trackUserGesture,
  }
}
