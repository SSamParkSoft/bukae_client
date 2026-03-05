/**
 * Step 4.5: 영상 씬 동기화
 * Step 4(base state 리셋)와 Step 5(motion) 사이에 삽입
 *
 * 영상 씬의 HTMLVideoElement.currentTime을 타임라인 tSec 기준으로 동기화합니다.
 * 이미지 씬이면 아무 것도 하지 않습니다.
 */

import type { PipelineContext } from './types'
import type { TimelineScene } from '@/lib/types/domain/timeline'
import { detectMediaType } from '../utils/detectMediaType'

/** 동기화 허용 오차 (초) — pro 트랙과 동일 */
const SYNC_EPSILON_SEC = 0.08

/**
 * 선택 구간 내 비디오 재생 시간 계산
 * - 씬 내 경과 시간(sceneLocalT)을 selectionStart 기준 offset으로 변환
 * - 원본 영상 길이가 TTS보다 짧으면 루프(나머지 연산) 적용
 */
function calculateVideoTime(sceneLocalT: number, scene: TimelineScene): number {
  const selectionStart = Number.isFinite(scene.selectionStartSeconds) && scene.selectionStartSeconds! >= 0
    ? scene.selectionStartSeconds!
    : 0
  const selectionEnd = Number.isFinite(scene.selectionEndSeconds) && scene.selectionEndSeconds! > selectionStart
    ? scene.selectionEndSeconds!
    : selectionStart
  const selectionDuration = Math.max(0, selectionEnd - selectionStart)

  const originalDuration = Number.isFinite(scene.originalVideoDurationSeconds) && scene.originalVideoDurationSeconds! > 0
    ? scene.originalVideoDurationSeconds!
    : 0

  const safeT = Math.max(0, sceneLocalT)

  if (originalDuration > 0) {
    // 확장 소스 모드: 원본을 반복 이어붙인 소스에서 탐색
    const sourceTime = selectionStart + safeT
    return Math.max(0, sourceTime % originalDuration)
  }

  if (selectionDuration <= 0) return selectionStart

  // 기본: 선택 구간 내에서 루프
  const offsetInSelection = safeT % selectionDuration
  return selectionStart + offsetInSelection
}

/**
 * 4.5단계: 영상 씬 동기화
 *
 * @param context 파이프라인 컨텍스트
 * @param sceneIndex 씬 인덱스
 * @param scene 씬 데이터
 * @param sceneLocalT 씬 내 경과 시간 (초)
 */
export function step4_5SyncVideo(
  context: PipelineContext,
  sceneIndex: number,
  scene: TimelineScene,
  sceneLocalT: number
): void {
  if (detectMediaType(scene) !== 'video') return

  const videoElementsRef = context.videoElementsRef
  if (!videoElementsRef) return

  const video = videoElementsRef.current.get(sceneIndex)
  if (!video) return

  const expectedTime = calculateVideoTime(sceneLocalT, scene)
  const diff = Math.abs(video.currentTime - expectedTime)

  if (diff > SYNC_EPSILON_SEC) {
    // seeked 이벤트 없이 직접 설정 (렌더 루프에서 호출되므로 비동기 불필요)
    const safeTime = Math.max(0, Math.min(expectedTime, video.duration || expectedTime))
    video.currentTime = safeTime
  }
}
