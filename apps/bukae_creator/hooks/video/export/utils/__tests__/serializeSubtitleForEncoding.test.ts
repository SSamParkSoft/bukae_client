import { test, expect } from 'vitest'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { serializeSubtitleForEncoding } from '../serializeSubtitleForEncoding'

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

const stage = { width: 1080, height: 1920 }

test('transform이 있으면 timeline transform을 우선 사용한다', () => {
  const scene = createScene({
    text: {
      content: '자막',
      font: 'pretendard',
      color: '#ffffff',
      style: { align: 'left' },
      stroke: { color: '#111111', width: 4 },
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
      },
    },
  })

  const result = serializeSubtitleForEncoding(scene, stage)

  expect(result.transform).toEqual({
    x: 320,
    y: 900,
    width: 700,
    height: 160,
    scaleX: 1.1,
    scaleY: 0.9,
    rotation: 0.2,
    anchor: { x: 0.2, y: 0.8 },
  })
  expect(result.alignment).toBe('right')
})

test('transform이 없으면 pro 기준 fallback 위치를 사용한다', () => {
  const scene = createScene({
    text: {
      content: '자막',
      font: 'pretendard',
      color: '#ffffff',
      position: 'bottom',
      style: { align: 'center' },
      stroke: { color: '#000000', width: 5 },
    },
  })

  const result = serializeSubtitleForEncoding(scene, stage)

  expect(result.transform.width).toBe(stage.width * 0.75)
  expect(result.transform.y).toBe(stage.height - 200)
})

test('stroke width가 0이면 enabled=false로 직렬화한다', () => {
  const scene = createScene({
    text: {
      content: '자막',
      font: 'pretendard',
      color: '#ffffff',
      style: { align: 'center' },
      stroke: { color: '#ff0000', width: 0 },
    },
  })

  const result = serializeSubtitleForEncoding(scene, stage)

  expect(result.stroke.enabled).toBe(false)
  expect(result.stroke.width).toBe(0)
  expect(result.stroke.color).toBe('#ff0000')
})

test('alignment는 text.position이 아니라 hAlign/style.align을 사용하고 justify는 center로 정규화한다', () => {
  const withStyleJustify = createScene({
    text: {
      content: '자막',
      font: 'pretendard',
      color: '#ffffff',
      position: 'top',
      style: { align: 'justify' },
      stroke: { color: '#000000', width: 5 },
    },
  })
  const withTransformHAlign = createScene({
    text: {
      content: '자막',
      font: 'pretendard',
      color: '#ffffff',
      position: 'top',
      style: { align: 'left' },
      transform: {
        x: 540,
        y: 400,
        width: 600,
        height: 150,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        hAlign: 'right',
      },
      stroke: { color: '#000000', width: 5 },
    },
  })

  const fromStyle = serializeSubtitleForEncoding(withStyleJustify, stage)
  const fromTransform = serializeSubtitleForEncoding(withTransformHAlign, stage)

  expect(fromStyle.alignment).toBe('center')
  expect(fromTransform.alignment).toBe('right')
})

test('||| 분할 파트별로 content가 달라도 transform은 동일하게 유지된다', () => {
  const baseScene = createScene({
    text: {
      content: '첫 문장',
      font: 'pretendard',
      color: '#ffffff',
      style: { align: 'center' },
      stroke: { color: '#000000', width: 8 },
      transform: {
        x: 500,
        y: 1000,
        width: 740,
        height: 180,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 },
      },
    },
  })

  const partA = serializeSubtitleForEncoding(baseScene, stage)
  const partB = serializeSubtitleForEncoding(
    createScene({
      ...baseScene,
      text: {
        ...baseScene.text,
        content: '두 번째 문장',
      },
    }),
    stage
  )

  expect(partA.transform).toEqual(partB.transform)
})
