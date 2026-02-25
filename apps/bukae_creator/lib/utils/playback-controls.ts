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
    if (videoPlayback.toggle) {
      videoPlayback.toggle()
    } else {
      if (process.env.NODE_ENV === 'development') {
        // 개발 환경에서만 콘솔에 경고 출력
         
        console.warn('[playback-controls] videoPlayback.toggle이 없습니다!')
      }
    }
  }
}

