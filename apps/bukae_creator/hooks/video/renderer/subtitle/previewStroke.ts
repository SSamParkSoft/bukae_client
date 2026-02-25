const PREVIEW_STROKE_WIDTH_BIAS_PX = 5
const PREVIEW_STROKE_BIAS_MIN_WIDTH = 10
const DEFAULT_STROKE_WIDTH = 5

function normalizeStrokeWidth(width: number | null | undefined): number {
  if (typeof width !== 'number' || !Number.isFinite(width)) {
    return DEFAULT_STROKE_WIDTH
  }
  return width
}

/**
 * 미리보기에서만 사용하는 stroke 보정값.
 * 인코딩 값은 보정하지 않고, 캔버스 체감 두께만 맞춥니다.
 */
export function getPreviewStrokeWidth(width: number | null | undefined): number {
  const normalized = normalizeStrokeWidth(width)
  if (normalized <= 0) {
    return normalized
  }
  if (normalized >= PREVIEW_STROKE_BIAS_MIN_WIDTH) {
    return normalized + PREVIEW_STROKE_WIDTH_BIAS_PX
  }
  return normalized
}
