import * as PIXI from 'pixi.js'

/**
 * 씬을 표시하는 공통 함수
 * 씬 선택과 재생 모두에서 사용됩니다.
 * 
 * @param index - 표시할 씬 인덱스
 * @param appRef - PixiJS Application ref
 * @param containerRef - PixiJS Container ref
 * @param spritesRef - 스프라이트 맵 ref
 * @param textsRef - 텍스트 맵 ref
 */
export function showScene(
  index: number,
  appRef: React.RefObject<PIXI.Application | null>,
  containerRef: React.RefObject<PIXI.Container | null>,
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>,
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
): void {
  console.log(`[scene-renderer] 씬 표시 시작 | index: ${index}`)

  if (!appRef.current || !containerRef.current) {
    console.warn(`[scene-renderer] appRef 또는 containerRef가 없습니다. | index: ${index}`)
    return
  }

  // 모든 씬 숨기기
  spritesRef.current.forEach((sprite, idx) => {
    if (sprite) {
      sprite.visible = false
      sprite.alpha = 0
    }
  })
  textsRef.current.forEach((text, idx) => {
    if (text) {
      text.visible = false
      text.alpha = 0
    }
  })

  // 선택된 씬만 즉시 표시
  const selectedSprite = spritesRef.current.get(index)
  const selectedText = textsRef.current.get(index)

  if (selectedSprite) {
    if (!selectedSprite.parent && containerRef.current) {
      containerRef.current.addChild(selectedSprite)
    }
    selectedSprite.visible = true
    selectedSprite.alpha = 1
    console.log(`[scene-renderer] 스프라이트 표시 | index: ${index}`)
  }

  if (selectedText) {
    if (!selectedText.parent && containerRef.current) {
      containerRef.current.addChild(selectedText)
    }
    selectedText.visible = true
    selectedText.alpha = 1
    console.log(`[scene-renderer] 텍스트 표시 | index: ${index}`)
  }

  console.log(`[scene-renderer] 씬 표시 완료 | index: ${index}`)
  // 렌더링은 PixiJS ticker가 처리
}

