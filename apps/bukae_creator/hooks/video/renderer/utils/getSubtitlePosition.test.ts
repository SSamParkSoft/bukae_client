import { test, expect } from 'vitest'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSubtitlePosition } from './getSubtitlePosition'

const stage = { width: 1080, height: 1920 }

function createScene(
  overrides: Partial<TimelineData['scenes'][number]> = {}
): TimelineData['scenes'][number] {
  return {
    sceneId: 1,
    duration: 2.5,
    transition: 'none',
    image: 'https://example.com/image.png',
    text: {
      content: '기본 자막',
      font: 'pretendard',
      color: '#ffffff',
      position: 'bottom',
      fontSize: 80,
      style: { align: 'center' },
      stroke: { color: '#000000', width: 5 },
    },
    ...overrides,
  }
}

test('transform이 있으면 position보다 transform 값을 우선 사용한다', () => {
  const scene = createScene({
    text: {
      content: '자막',
      font: 'pretendard',
      color: '#ffffff',
      position: 'top',
      transform: {
        x: 320,
        y: 900,
        width: 700,
        height: 160,
        scaleX: 1.1,
        scaleY: 0.9,
        rotation: 0.2,
        anchor: { x: 0.2, y: 0.8 },
        hAlign: 'right',
        vAlign: 'middle',
      },
      stroke: { color: '#000000', width: 5 },
    },
  })

  const result = getSubtitlePosition(scene, stage)
  expect(result.x).toBe(320)
  expect(result.y).toBe(900)
  expect(result.scaleX).toBe(1.1)
  expect(result.scaleY).toBe(0.9)
  expect(result.rotation).toBe(0.2)
  expect(result.hAlign).toBe('right')
  expect(result.vAlign).toBe('middle')
})

test('transform이 없으면 top/center/bottom을 pro 규칙으로 계산한다', () => {
  const topScene = createScene({ text: { ...createScene().text, position: 'top' } })
  const centerScene = createScene({ text: { ...createScene().text, position: 'center' } })
  const bottomScene = createScene({ text: { ...createScene().text, position: 'bottom' } })

  const top = getSubtitlePosition(topScene, stage)
  const center = getSubtitlePosition(centerScene, stage)
  const bottom = getSubtitlePosition(bottomScene, stage)

  expect(top.x).toBe(stage.width * 0.5)
  expect(top.y).toBe(200)
  expect(center.y).toBe(stage.height * 0.5)
  expect(bottom.y).toBe(stage.height - 200)
})

test('transform이 없고 position 누락 시 bottom 기본값을 사용한다', () => {
  const scene = createScene({
    text: {
      content: '자막',
      font: 'pretendard',
      color: '#ffffff',
      fontSize: 80,
      style: { align: 'center' },
      stroke: { color: '#000000', width: 5 },
    },
  })

  const result = getSubtitlePosition(scene, stage)
  expect(result.y).toBe(stage.height - 200)
  expect(result.scaleX).toBe(1)
  expect(result.scaleY).toBe(1)
  expect(result.rotation).toBe(0)
})
