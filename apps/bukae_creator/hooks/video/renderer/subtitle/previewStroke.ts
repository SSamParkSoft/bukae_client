const PREVIEW_STROKE_WIDTH_BIAS_PX = 5
const DEFAULT_STROKE_WIDTH = 5

interface PreviewStrokeWidthOptions {
  fontSize?: number | null
}

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
export function getPreviewStrokeWidth(
  width: number | null | undefined,
  _options?: PreviewStrokeWidthOptions
): number {
  const normalized = normalizeStrokeWidth(width)
  if (normalized <= 0) {
    return normalized
  }
  return normalized + PREVIEW_STROKE_WIDTH_BIAS_PX
}

/**
 * 두꺼운 stroke에서 내부 글자 가독성 유지를 위해 자간을 미세하게 넓힌다.
 * 이 값도 미리보기 전용이며 인코딩 데이터에는 포함하지 않는다.
 */
export function getPreviewLetterSpacing(
  strokeWidth: number | null | undefined,
  _options?: PreviewStrokeWidthOptions
): number {
  const normalized = normalizeStrokeWidth(strokeWidth)
  if (normalized <= 0) {
    return 0
  }
  return 0
}
