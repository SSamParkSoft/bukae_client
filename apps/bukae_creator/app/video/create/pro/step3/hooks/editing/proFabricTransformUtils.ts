import type { TextSettings, TextTransform, ImageTransform, TextAlign } from '@/lib/types/domain/timeline'

const DEFAULT_FONT_SIZE = 80
const DEFAULT_TEXT_COLOR = '#ffffff'
const DEFAULT_TEXT_FONT = 'pretendard'
const DEFAULT_TEXT_ALIGN: TextAlign = 'center'

export interface FabricLikeTransformTarget {
  left?: number
  top?: number
  angle?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  getScaledWidth?: () => number
  getScaledHeight?: () => number
}

export interface FabricLikeTextTarget extends FabricLikeTransformTarget {
  fontSize?: number
  text?: string
  fill?: unknown
  textAlign?: string
}

function readScaledSize(target: FabricLikeTransformTarget): { width: number; height: number } {
  const fallbackWidth = (target.width ?? 0) * (target.scaleX ?? 1)
  const fallbackHeight = (target.height ?? 0) * (target.scaleY ?? 1)

  const width = typeof target.getScaledWidth === 'function'
    ? target.getScaledWidth()
    : fallbackWidth

  const height = typeof target.getScaledHeight === 'function'
    ? target.getScaledHeight()
    : fallbackHeight

  return {
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
  }
}

export function toTimelineTransform(
  target: FabricLikeTransformTarget,
  scaleRatio: number
): ImageTransform {
  const safeScale = scaleRatio > 0 ? scaleRatio : 1
  const invScale = 1 / safeScale
  const scaledSize = readScaledSize(target)

  return {
    x: (target.left ?? 0) * invScale,
    y: (target.top ?? 0) * invScale,
    width: scaledSize.width * invScale,
    height: scaledSize.height * invScale,
    scaleX: 1,
    scaleY: 1,
    rotation: ((target.angle ?? 0) * Math.PI) / 180,
  }
}

export function buildDefaultTextSettings(content: string): TextSettings {
  return {
    content,
    font: DEFAULT_TEXT_FONT,
    color: DEFAULT_TEXT_COLOR,
    fontSize: DEFAULT_FONT_SIZE,
    style: {
      align: DEFAULT_TEXT_ALIGN,
    },
  }
}

export function toTimelineTextSettings(
  target: FabricLikeTextTarget,
  scaleRatio: number,
  previous: TextSettings,
  updateContent: boolean
): TextSettings {
  const safeScale = scaleRatio > 0 ? scaleRatio : 1
  const invScale = 1 / safeScale

  const nextTransform: TextTransform = toTimelineTransform(target, safeScale)

  const baseFontSize = target.fontSize ?? previous.fontSize ?? DEFAULT_FONT_SIZE
  const actualFontSize = baseFontSize * (target.scaleY ?? 1) * invScale

  const alignCandidate = target.textAlign
  const align: TextAlign =
    alignCandidate === 'left' ||
    alignCandidate === 'center' ||
    alignCandidate === 'right' ||
    alignCandidate === 'justify'
      ? alignCandidate
      : previous.style?.align ?? DEFAULT_TEXT_ALIGN

  return {
    ...previous,
    ...(updateContent ? { content: target.text ?? previous.content ?? '' } : {}),
    fontSize: actualFontSize,
    color: typeof target.fill === 'string' ? target.fill : previous.color ?? DEFAULT_TEXT_COLOR,
    style: {
      ...previous.style,
      align,
    },
    transform: nextTransform,
  }
}
