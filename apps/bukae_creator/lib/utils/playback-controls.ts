/**
 * 재생 버튼 핸들러 생성
 * 
 * @param videoPlayback - 비디오 재생 관련 객체
 * @param isTtsBootstrapping - TTS 부트스트래핑 상태
 * @param isBgmBootstrapping - BGM 부트스트래핑 상태
 * @param isPreparing - 준비 중 상태
 * @param selectSceneRef - 씬 선택 함수 ref
 * @param sceneNavigation - 씬 네비게이션 객체
 * @returns 재생 버튼 클릭 핸들러
 */
export function createPlayButtonHandler({
  videoPlayback,
  isTtsBootstrapping,
  isBgmBootstrapping,
  isPreparing,
  selectSceneRef,
  sceneNavigation,
}: {
  videoPlayback: {
    toggle?: () => void
  }
  isTtsBootstrapping: boolean
  isBgmBootstrapping: boolean
  isPreparing: boolean
  selectSceneRef: React.MutableRefObject<((index: number, skipStopPlaying?: boolean, onTransitionComplete?: () => void) => void) | null>
  sceneNavigation?: {
    selectScene?: (index: number, skipStopPlaying?: boolean, onTransitionComplete?: () => void) => void
  }
}): () => void {
  return () => {
    console.log(`[playback-controls] 재생 버튼 클릭 | videoPlayback.toggle: ${typeof videoPlayback.toggle}, isTtsBootstrapping: ${isTtsBootstrapping}, isBgmBootstrapping: ${isBgmBootstrapping}, isPreparing: ${isPreparing}`)
    console.log(`[playback-controls] selectSceneRef.current: ${!!selectSceneRef.current}, sceneNavigation.selectScene: ${!!sceneNavigation?.selectScene}`)

    if (videoPlayback.toggle) {
      console.log('[playback-controls] videoPlayback.toggle 호출')
      videoPlayback.toggle()
    } else {
      console.error('[playback-controls] videoPlayback.toggle이 없습니다!')
    }
  }
}

