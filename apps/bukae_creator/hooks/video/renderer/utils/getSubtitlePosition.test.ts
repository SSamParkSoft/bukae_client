import test from 'node:test'
import assert from 'node:assert/strict'
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
  assert.equal(result.x, 320)
  assert.equal(result.y, 900)
  assert.equal(result.scaleX, 1.1)
  assert.equal(result.scaleY, 0.9)
  assert.equal(result.rotation, 0.2)
  assert.equal(result.hAlign, 'right')
  assert.equal(result.vAlign, 'middle')
})

test('transform이 없으면 top/center/bottom을 pro 규칙으로 계산한다', () => {
  const topScene = createScene({ text: { ...createScene().text, position: 'top' } })
  const centerScene = createScene({ text: { ...createScene().text, position: 'center' } })
  const bottomScene = createScene({ text: { ...createScene().text, position: 'bottom' } })

  const top = getSubtitlePosition(topScene, stage)
  const center = getSubtitlePosition(centerScene, stage)
  const bottom = getSubtitlePosition(bottomScene, stage)

  assert.equal(top.x, stage.width * 0.5)
  assert.equal(top.y, 200)
  assert.equal(center.y, stage.height * 0.5)
  assert.equal(bottom.y, stage.height - 200)
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
  assert.equal(result.y, stage.height - 200)
  assert.equal(result.scaleX, 1)
  assert.equal(result.scaleY, 1)
  assert.equal(result.rotation, 0)
})
