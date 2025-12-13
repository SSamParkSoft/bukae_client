/**
 * 이미지 fit 모드에 따라 스프라이트 파라미터를 계산합니다.
 * @param textureWidth 텍스처 너비
 * @param textureHeight 텍스처 높이
 * @param stageWidth 스테이지 너비
 * @param stageHeight 스테이지 높이
 * @param fit fit 모드 ('cover' | 'contain' | 'fill')
 * @returns 스프라이트 위치 및 크기 파라미터
 */
export const calculateSpriteParams = (
  textureWidth: number,
  textureHeight: number,
  stageWidth: number,
  stageHeight: number,
  fit: 'cover' | 'contain' | 'fill'
): { x: number; y: number; width: number; height: number } => {
  const imgAspect = textureWidth / textureHeight
  const stageAspect = stageWidth / stageHeight

  if (fit === 'fill') {
    return { x: 0, y: 0, width: stageWidth, height: stageHeight }
  } else if (fit === 'cover') {
    const scale = imgAspect > stageAspect 
      ? stageHeight / textureHeight 
      : stageWidth / textureWidth
    const width = textureWidth * scale
    const height = textureHeight * scale
    return {
      x: (stageWidth - width) / 2,
      y: (stageHeight - height) / 2,
      width,
      height,
    }
  } else {
    const scale = imgAspect > stageAspect 
      ? stageWidth / textureWidth 
      : stageHeight / textureHeight
    const width = textureWidth * scale
    const height = textureHeight * scale
    return {
      x: (stageWidth - width) / 2,
      y: (stageHeight - height) / 2,
      width,
      height,
    }
  }
}

