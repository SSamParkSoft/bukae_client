import { test, expect } from 'vitest'
import {
  calculateMotionLocalTime,
  calculateMotionProgress,
} from '../calculateMotionTiming'
import type { TimelineData } from '@/store/useVideoCreateStore'

function makeTimeline(motion?: TimelineData['scenes'][number]['motion']): TimelineData {
  return {
    scenes: [
      {
        sceneId: 1,
        duration: 5,
        transition: 'none',
        image: 'https://example.com/img.jpg',
        text: { content: '', font: 'pretendard', color: '#fff', style: { align: 'center' }, stroke: { color: '#000', width: 0 } },
        motion,
      },
    ],
  }
}

// calculateMotionLocalTime

test('activeSegment 없으면 sceneLocalT를 그대로 반환한다', () => {
  const result = calculateMotionLocalTime({
    sceneLocalT: 2.5,
    sceneStartTime: 0,
    activeSegmentFromTts: null,
  })
  expect(result.motionLocalT).toBe(2.5)
})

test('activeSegment의 startSec 기준으로 로컬 시간을 계산한다', () => {
  const result = calculateMotionLocalTime({
    sceneLocalT: 2,
    sceneStartTime: 3,
    activeSegmentFromTts: {
      segment: { id: 'seg-1', startSec: 4 },
      segmentIndex: 0,
    },
  })
  // timelineTime = 3 + 2 = 5, segmentStart = 4, motionLocalT = 1
  expect(result.motionLocalT).toBe(1)
})

test('타임라인 시간이 세그먼트 시작보다 앞이면 0으로 클램프된다', () => {
  const result = calculateMotionLocalTime({
    sceneLocalT: 0,
    sceneStartTime: 3,
    activeSegmentFromTts: {
      segment: { id: 'seg-1', startSec: 5 },
      segmentIndex: 0,
    },
  })
  // timelineTime = 3, segmentStart = 5, motionLocalT = max(0, -2) = 0
  expect(result.motionLocalT).toBe(0)
})

// calculateMotionProgress

test('motion이 없으면 progress는 0이다', () => {
  const timeline = makeTimeline(undefined)
  const result = calculateMotionProgress({
    timeline,
    sceneIndex: 0,
    sceneLocalT: 2,
    sceneStartTime: 0,
  })
  expect(result.motionProgress).toBe(0)
})

test('씬 duration 기반으로 progress를 계산한다', () => {
  const timeline = makeTimeline({
    type: 'zoom-in',
    startSecInScene: 0,
    durationSec: 0,
    easing: 'ease-out',
    params: { scaleFrom: 1, scaleTo: 1.2 },
  })
  // durationSec=0이므로 scene.duration=5 사용, sceneLocalT=2.5 → progress=0.5
  const result = calculateMotionProgress({
    timeline,
    sceneIndex: 0,
    sceneLocalT: 2.5,
    sceneStartTime: 0,
  })
  expect(result.motionProgress).toBe(0.5)
})

test('progress는 1을 초과하지 않는다', () => {
  const timeline = makeTimeline({
    type: 'zoom-in',
    startSecInScene: 0,
    durationSec: 0,
    easing: 'ease-out',
    params: { scaleFrom: 1, scaleTo: 1.2 },
  })
  const result = calculateMotionProgress({
    timeline,
    sceneIndex: 0,
    sceneLocalT: 999,
    sceneStartTime: 0,
  })
  expect(result.motionProgress).toBe(0)  // elapsed > duration → not active
})

test('씬 시작 전이면 progress는 0이다', () => {
  const timeline = makeTimeline({
    type: 'zoom-in',
    startSecInScene: 0,
    durationSec: 0,
    easing: 'ease-out',
    params: { scaleFrom: 1, scaleTo: 1.2 },
  })
  const result = calculateMotionProgress({
    timeline,
    sceneIndex: 0,
    sceneLocalT: -1,
    sceneStartTime: 0,
  })
  expect(result.motionProgress).toBe(0)
})
