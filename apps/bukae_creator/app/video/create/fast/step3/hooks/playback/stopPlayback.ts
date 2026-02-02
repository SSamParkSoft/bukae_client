/**
 * 설정 변경 시 재생 정지 로직 (유틸)
 * 씬/그룹/전체 재생 중일 때 Transport 정지 및 상태 초기화
 */

export interface StopPlaybackParams {
  isPlaying: boolean
  playingSceneIndex: number | null
  playingGroupSceneId: number | null
  transport: { pause: () => void }
  setIsPlaying: (playing: boolean) => void
  setPlayingSceneIndex: (index: number | null) => void
  setPlayingGroupSceneId: (sceneId: number | null) => void
  setPlaybackEndTime: (time: number | null) => void
  /** TTS 정지·허용 인덱스 초기화 (stopAll으로 음성 즉시 끔, setAllowedSceneIndices로 재생 범위 해제) */
  getTtsTrack: () => {
    setAllowedSceneIndices: (indices: number[] | null) => void
    stopAll: () => void
  } | null
}

/**
 * 재생 중이면 정지 (일시정지 버튼 제외한 모든 설정 변경 시 사용)
 */
export function stopPlaybackIfPlaying(params: StopPlaybackParams): void {
  const {
    isPlaying,
    playingSceneIndex,
    playingGroupSceneId,
    transport,
    setIsPlaying,
    setPlayingSceneIndex,
    setPlayingGroupSceneId,
    setPlaybackEndTime,
    getTtsTrack,
  } = params

  if (!isPlaying && playingSceneIndex === null && playingGroupSceneId === null) {
    return
  }

  transport.pause()
  setIsPlaying(false)
  setPlayingSceneIndex(null)
  setPlayingGroupSceneId(null)
  setPlaybackEndTime(null)

  const tts = getTtsTrack()
  if (tts) {
    if ('stopAll' in tts && typeof tts.stopAll === 'function') {
      tts.stopAll()
    }
    if ('setAllowedSceneIndices' in tts) {
      tts.setAllowedSceneIndices(null)
    }
  }
}
