import { useEffect, useRef } from 'react'

interface UsePlaybackStateSyncParams {
  videoPlaybackIsPlaying: boolean
  timelineIsPlaying: boolean
  setTimelineIsPlaying: (playing: boolean) => void
  videoPlaybackSetIsPlaying: (playing: boolean) => void
}

/**
 * 재생 상태 동기화 hook
 * videoPlayback.isPlaying과 timelineIsPlaying을 동기화합니다.
 */
export function usePlaybackStateSync({
  videoPlaybackIsPlaying,
  timelineIsPlaying,
  setTimelineIsPlaying,
  videoPlaybackSetIsPlaying,
}: UsePlaybackStateSyncParams) {
  const isSyncingRef = useRef(false)
  const prevVideoPlaybackIsPlayingRef = useRef<boolean | null>(null)
  const prevTimelineIsPlayingRef = useRef<boolean | null>(null)

  // videoPlayback.isPlaying과 timelineIsPlaying 동기화 (무한 루프 방지)
  useEffect(() => {
    if (isSyncingRef.current) return // 이미 동기화 중이면 무시
    
    const videoPlaybackChanged = prevVideoPlaybackIsPlayingRef.current !== null && 
      prevVideoPlaybackIsPlayingRef.current !== videoPlaybackIsPlaying
    const timelineChanged = prevTimelineIsPlayingRef.current !== null && 
      prevTimelineIsPlayingRef.current !== timelineIsPlaying
    
    // 두 값이 다르고, 어느 쪽이 변경되었는지 확인
    if (videoPlaybackIsPlaying !== timelineIsPlaying) {
      if (videoPlaybackChanged && !timelineChanged) {
        // videoPlayback.isPlaying이 변경된 경우 timelineIsPlaying을 업데이트
        isSyncingRef.current = true
        setTimelineIsPlaying(videoPlaybackIsPlaying)
        requestAnimationFrame(() => {
          isSyncingRef.current = false
        })
      } else if (timelineChanged && !videoPlaybackChanged) {
        // timelineIsPlaying이 변경된 경우 videoPlayback.isPlaying을 업데이트
        isSyncingRef.current = true
        videoPlaybackSetIsPlaying(timelineIsPlaying)
        requestAnimationFrame(() => {
          isSyncingRef.current = false
        })
      } else if (!videoPlaybackChanged && !timelineChanged) {
        // 초기 렌더링 또는 둘 다 변경되지 않은 경우, videoPlayback.isPlaying을 우선
        isSyncingRef.current = true
        setTimelineIsPlaying(videoPlaybackIsPlaying)
        requestAnimationFrame(() => {
          isSyncingRef.current = false
        })
      }
    }
    
    // 이전 값 업데이트
    prevVideoPlaybackIsPlayingRef.current = videoPlaybackIsPlaying
    prevTimelineIsPlayingRef.current = timelineIsPlaying
  }, [videoPlaybackIsPlaying, timelineIsPlaying, setTimelineIsPlaying, videoPlaybackSetIsPlaying])
}

