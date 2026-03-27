import { test, expect } from 'vitest'
import { computeOnTtsEnded, computeTtsStartOffset } from '../ttsSyncScheduler'
import type { ProStep3Scene } from '../../model/types'

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function makeScene(overrides: Partial<ProStep3Scene> = {}): ProStep3Scene {
  return {
    id: overrides.id ?? 'scene-1',
    script: overrides.script ?? 'hello',
    videoUrl: overrides.videoUrl !== undefined ? overrides.videoUrl : 'https://example.com/video.mp4',
    imageUrl: overrides.imageUrl ?? null,
    selectionStartSeconds: overrides.selectionStartSeconds ?? 0,
    selectionEndSeconds: overrides.selectionEndSeconds ?? 3,
    voiceTemplate: overrides.voiceTemplate ?? 'ko-KR-Standard-A',
    ttsDuration: overrides.ttsDuration,
    originalVideoDurationSeconds: overrides.originalVideoDurationSeconds,
  }
}

// ─── computeOnTtsEnded ───────────────────────────────────────────────────────

test('computeOnTtsEnded: 첫 번째 씬 완료 → 두 번째 씬으로 이동', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
    makeScene({ id: 's2', ttsDuration: 2 }),
    makeScene({ id: 's3', ttsDuration: 4 }),
  ]

  const action = computeOnTtsEnded(scenes, 0)
  expect(action?.type).toBe('next')
  if (action?.type !== 'next') return
  expect(action.sceneIndex).toBe(1)
  expect(action.seekTo).toBe(3) // s1 TTS duration
})

test('computeOnTtsEnded: 중간 씬 완료 → 세 번째 씬으로 이동', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
    makeScene({ id: 's2', ttsDuration: 2 }),
    makeScene({ id: 's3', ttsDuration: 4 }),
  ]

  const action = computeOnTtsEnded(scenes, 1)
  expect(action?.type).toBe('next')
  if (action?.type !== 'next') return
  expect(action.sceneIndex).toBe(2)
  expect(action.seekTo).toBe(5) // s1 + s2
})

test('computeOnTtsEnded: 마지막 씬 완료 → stop, seekTo = 전체 길이', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
    makeScene({ id: 's2', ttsDuration: 2 }),
  ]

  const action = computeOnTtsEnded(scenes, 1)
  expect(action?.type).toBe('stop')
  expect(action?.seekTo).toBe(5) // s1 + s2
})

test('computeOnTtsEnded: 재생 불가 씬(videoUrl=null)은 건너뜀', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
    makeScene({ id: 's2', videoUrl: null, ttsDuration: 2 }), // 재생 불가
    makeScene({ id: 's3', ttsDuration: 4 }),
  ]

  const action = computeOnTtsEnded(scenes, 0)
  expect(action?.type).toBe('next')
  if (action?.type !== 'next') return
  // s2는 건너뛰고 s3으로
  expect(action.sceneIndex).toBe(2)
  expect(action.seekTo).toBe(3) // s1만 합산 (s2는 재생 불가)
})

test('computeOnTtsEnded: 나머지가 모두 재생 불가면 stop', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
    makeScene({ id: 's2', videoUrl: null }),
    makeScene({ id: 's3', videoUrl: null }),
  ]

  const action = computeOnTtsEnded(scenes, 0)
  expect(action?.type).toBe('stop')
  expect(action?.seekTo).toBe(3)
})

test('computeOnTtsEnded: 재생 불가 씬이 완료됐다고 들어오면 null', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
    makeScene({ id: 's2', videoUrl: null, ttsDuration: 2 }),
  ]

  expect(computeOnTtsEnded(scenes, 1)).toBeNull()
})

test('computeOnTtsEnded: 씬이 1개뿐이면 완료 시 stop', () => {
  const scenes = [makeScene({ id: 's1', ttsDuration: 5 })]

  const action = computeOnTtsEnded(scenes, 0)
  expect(action?.type).toBe('stop')
  expect(action?.seekTo).toBe(5)
})

// ─── computeTtsStartOffset ───────────────────────────────────────────────────

test('computeTtsStartOffset: transport가 씬 시작점이면 offset=0', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
    makeScene({ id: 's2', ttsDuration: 2 }),
  ]

  // s2 시작 시간 = 3 (s1 TTS duration)
  expect(computeTtsStartOffset(scenes, 1, 3)).toBe(0)
})

test('computeTtsStartOffset: transport가 씬 중간이면 (tSec - sceneStart)', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
    makeScene({ id: 's2', ttsDuration: 4 }),
  ]

  // s2는 t=3에서 시작, transport=4.5 → offset = 1.5
  expect(computeTtsStartOffset(scenes, 1, 4.5)).toBeCloseTo(1.5)
})

test('computeTtsStartOffset: transport가 씬 시작 이전이면 0으로 clamp', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
    makeScene({ id: 's2', ttsDuration: 2 }),
  ]

  // s2 시작=3인데 transport=1 → clamp → 0
  expect(computeTtsStartOffset(scenes, 1, 1)).toBe(0)
})

test('computeTtsStartOffset: transport가 TTS duration을 넘으면 (duration - 0.01)으로 clamp', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
  ]

  // s1 시작=0, ttsDuration=3, transport=10 → offset = 3 - 0.01 = 2.99
  expect(computeTtsStartOffset(scenes, 0, 10)).toBeCloseTo(2.99)
})

test('computeTtsStartOffset: ttsDuration 없고 selection 구간만 있을 때', () => {
  const scenes = [
    makeScene({ id: 's1', selectionStartSeconds: 2, selectionEndSeconds: 5 }), // duration=3, no ttsDuration
  ]

  // transport=1.5 → offset = 1.5 (clamp 상한: 3 - 0.01 = 2.99)
  expect(computeTtsStartOffset(scenes, 0, 1.5)).toBeCloseTo(1.5)
})

test('computeTtsStartOffset: 재생 불가 씬이면 0', () => {
  const scenes = [
    makeScene({ id: 's1', videoUrl: null }),
  ]

  expect(computeTtsStartOffset(scenes, 0, 1)).toBe(0)
})

// ─── 연속 씬 전환 시뮬레이션 ─────────────────────────────────────────────────

test('씬 3개 순차 전환: computeOnTtsEnded 체인이 seekTo를 정확히 계산', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 3 }),
    makeScene({ id: 's2', ttsDuration: 2 }),
    makeScene({ id: 's3', ttsDuration: 4 }),
  ]

  // s1 완료 → s2로 이동
  const a1 = computeOnTtsEnded(scenes, 0)
  expect(a1?.type).toBe('next')
  expect(a1?.seekTo).toBe(3)

  // s2 완료 → s3로 이동
  const a2 = computeOnTtsEnded(scenes, 1)
  expect(a2?.type).toBe('next')
  expect(a2?.seekTo).toBe(5)

  // s3 완료 → 정지
  const a3 = computeOnTtsEnded(scenes, 2)
  expect(a3?.type).toBe('stop')
  expect(a3?.seekTo).toBe(9) // 3+2+4
})

test('seek 후 재개: 씬 중간에서 TTS 시작 오프셋이 정확해야 함', () => {
  const scenes = [
    makeScene({ id: 's1', ttsDuration: 5 }),
    makeScene({ id: 's2', ttsDuration: 3 }),
  ]

  // 사용자가 t=6.2 (s2 중간)으로 seek 후 재생
  // s2 시작=5이므로 TTS는 1.2초 지점부터 시작
  expect(computeTtsStartOffset(scenes, 1, 6.2)).toBeCloseTo(1.2)
})
