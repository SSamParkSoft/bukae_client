import { test, expect } from 'vitest'
import { normalizeAnchorToTopLeft, calculateTextPositionInBox } from '../useSubtitleRenderer'

// normalizeAnchorToTopLeft
// ANIMATION.md 6.2 규칙: Box_x = Input_x - (Width × Scale_x × Anchor_x)

test('anchor (0.5, 0.5)이면 박스가 중앙 기준으로 배치된다', () => {
  const result = normalizeAnchorToTopLeft(540, 960, 700, 160, 1, 1, 0.5, 0.5)
  expect(result.boxX).toBe(540 - 350)  // 190
  expect(result.boxY).toBe(960 - 80)   // 880
  expect(result.boxW).toBe(700)
  expect(result.boxH).toBe(160)
})

test('anchor (0, 0)이면 좌표가 그대로 top-left가 된다', () => {
  const result = normalizeAnchorToTopLeft(100, 200, 700, 160, 1, 1, 0, 0)
  expect(result.boxX).toBe(100)
  expect(result.boxY).toBe(200)
})

test('anchor (1, 1)이면 좌표에서 전체 크기를 뺀다', () => {
  const result = normalizeAnchorToTopLeft(700, 160, 700, 160, 1, 1, 1, 1)
  expect(result.boxX).toBe(0)
  expect(result.boxY).toBe(0)
})

test('scale이 적용되면 박스 크기와 오프셋에 반영된다', () => {
  const result = normalizeAnchorToTopLeft(540, 960, 700, 160, 1.5, 1.5, 0.5, 0.5)
  expect(result.boxW).toBe(1050)
  expect(result.boxH).toBe(240)
  expect(result.boxX).toBe(540 - 525)  // 15
  expect(result.boxY).toBe(960 - 120)  // 840
})

// calculateTextPositionInBox
// ANIMATION.md 6.3 규칙: 세로 정렬은 middle 고정

test('center 정렬이면 텍스트가 박스 중앙에 배치된다', () => {
  const result = calculateTextPositionInBox(0, 0, 1080, 200, 300, 50, 'center')
  expect(result.textX).toBe((1080 - 300) / 2)  // 390
  expect(result.textY).toBe((200 - 50) / 2)    // 75
})

test('left 정렬이면 텍스트 X가 boxX와 같다', () => {
  const result = calculateTextPositionInBox(100, 0, 1080, 200, 300, 50, 'left')
  expect(result.textX).toBe(100)
})

test('right 정렬이면 텍스트가 박스 우측에 붙는다', () => {
  const result = calculateTextPositionInBox(0, 0, 1080, 200, 300, 50, 'right')
  expect(result.textX).toBe(1080 - 300)  // 780
})

test('세로 정렬은 항상 middle이다', () => {
  const center = calculateTextPositionInBox(0, 500, 1080, 200, 300, 60, 'center')
  const left = calculateTextPositionInBox(0, 500, 1080, 200, 300, 60, 'left')
  const right = calculateTextPositionInBox(0, 500, 1080, 200, 300, 60, 'right')

  const expectedY = 500 + (200 - 60) / 2  // 570
  expect(center.textY).toBe(expectedY)
  expect(left.textY).toBe(expectedY)
  expect(right.textY).toBe(expectedY)
})

test('텍스트가 박스보다 크면 음수 오프셋이 될 수 있다', () => {
  const result = calculateTextPositionInBox(0, 0, 100, 50, 200, 80, 'center')
  expect(result.textX).toBe((100 - 200) / 2)  // -50
  expect(result.textY).toBe((50 - 80) / 2)    // -15
})
