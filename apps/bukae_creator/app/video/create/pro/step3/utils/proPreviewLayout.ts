export interface FittedSize {
  width: number
  height: number
}

export function calculateAspectFittedSize(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number
): FittedSize | null {
  if (
    !Number.isFinite(containerWidth) ||
    !Number.isFinite(containerHeight) ||
    !Number.isFinite(aspectRatio) ||
    containerWidth <= 0 ||
    containerHeight <= 0 ||
    aspectRatio <= 0
  ) {
    return null
  }

  if (containerWidth / containerHeight > aspectRatio) {
    const height = containerHeight
    return {
      width: height * aspectRatio,
      height,
    }
  }

  const width = containerWidth
  return {
    width,
    height: width / aspectRatio,
  }
}
