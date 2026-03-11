/**
 * PixiJS 객체 생성 팩토리
 * 반복되는 PixiJS 객체 생성 패턴을 통합하여 일관성을 유지합니다.
 */

import * as PIXI from 'pixi.js'

/**
 * Edit Handle 생성 설정
 */
interface EditHandleConfig {
  size?: number
  color?: number
  borderColor?: number
  borderWidth?: number
  interactive?: boolean
  cursor?: string
  position?: { x: number; y: number }
}

/**
 * 편집 핸들 생성 팩토리
 * 이미지/텍스트 리사이즈용 핸들 사각형을 생성합니다.
 */
export const createEditHandle = (config: Partial<EditHandleConfig> = {}): PIXI.Graphics => {
  const {
    size = 20,
    color = 0x5e8790, // 브랜드 컬러 (brand-teal)
    borderColor = 0xffffff,
    borderWidth = 2,
    interactive = true,
    cursor = 'pointer',
    position,
  } = config

  const handleGraphics = new PIXI.Graphics()
  handleGraphics.clear()
  handleGraphics.rect(-size / 2, -size / 2, size, size)
  handleGraphics.fill({ color, alpha: 1 })
  handleGraphics.setStrokeStyle({ color: borderColor, width: borderWidth, alpha: 1 })
  handleGraphics.stroke()

  if (position) {
    handleGraphics.x = position.x
    handleGraphics.y = position.y
  }

  handleGraphics.visible = true
  handleGraphics.alpha = 1
  handleGraphics.interactive = interactive
  handleGraphics.cursor = cursor

  return handleGraphics
}

/**
 * Sprite 생성 설정
 */
interface SpriteConfig {
  texture?: PIXI.Texture
  anchor?: { x: number; y: number }
  visible?: boolean
  alpha?: number
  interactive?: boolean
  cursor?: string
  x?: number
  y?: number
  rotation?: number
  scale?: { x: number; y: number }
}

/**
 * 스프라이트 생성 팩토리
 * 이미지/비디오 스프라이트를 생성합니다.
 */
export const createSprite = (config: Partial<SpriteConfig> = {}): PIXI.Sprite => {
  const {
    texture,
    anchor = { x: 0.5, y: 0.5 },
    visible = false,
    alpha = 0,
    interactive = false,
    cursor = 'default',
    x,
    y,
    rotation,
    scale,
  } = config

  const sprite = texture ? new PIXI.Sprite(texture) : new PIXI.Sprite()

  sprite.anchor.set(anchor.x, anchor.y)
  sprite.visible = visible
  sprite.alpha = alpha
  sprite.interactive = interactive
  sprite.cursor = cursor

  if (x !== undefined) sprite.x = x
  if (y !== undefined) sprite.y = y
  if (rotation !== undefined) sprite.rotation = rotation
  if (scale) sprite.scale.set(scale.x, scale.y)

  return sprite
}

/**
 * Text Style 생성 설정
 */
interface TextStyleConfig {
  fontFamily?: string
  fontSize?: number
  fill?: string | number
  align?: 'left' | 'center' | 'right'
  fontWeight?: PIXI.TextStyleFontWeight
  fontStyle?: 'normal' | 'italic'
  letterSpacing?: number
  wordWrap?: boolean
  wordWrapWidth?: number
  breakWords?: boolean
  stroke?: { color: string | number; width: number }
}

/**
 * 텍스트 스타일 생성 팩토리
 * PIXI.TextStyle 객체를 생성합니다.
 */
export const createTextStyle = (config: Partial<TextStyleConfig> = {}): PIXI.TextStyle => {
  const styleConfig: Partial<PIXI.TextStyle> = {
    fontFamily: config.fontFamily || 'Arial',
    fontSize: config.fontSize || 80,
    fill: config.fill || '#ffffff',
    align: config.align || 'center',
    fontWeight: config.fontWeight || '400',
    fontStyle: config.fontStyle || 'normal',
    letterSpacing: config.letterSpacing ?? 0,
    wordWrap: config.wordWrap ?? true,
    wordWrapWidth: config.wordWrapWidth ?? 1080,
    breakWords: config.breakWords ?? true,
  }

  if (config.stroke) {
    styleConfig.stroke = { color: config.stroke.color, width: config.stroke.width }
  }

  return new PIXI.TextStyle(styleConfig as Partial<PIXI.TextStyle>)
}

/**
 * Text 생성 설정
 */
interface TextConfig {
  text?: string
  style?: Partial<PIXI.TextStyle> | PIXI.TextStyle
  anchor?: { x: number; y: number }
  visible?: boolean
  alpha?: number
  interactive?: boolean
  cursor?: string
  x?: number
  y?: number
  rotation?: number
  scale?: { x: number; y: number }
}

/**
 * 텍스트 객체 생성 팩토리
 * 자막 텍스트를 생성합니다.
 */
export const createText = (config: Partial<TextConfig> = {}): PIXI.Text => {
  const {
    text,
    style,
    anchor = { x: 0, y: 0 },
    visible = false,
    alpha = 0,
    interactive = false,
    cursor = 'default',
    x,
    y,
    rotation,
    scale,
  } = config

  const textObj = new PIXI.Text({
    text: text || '',
    style: style || createTextStyle(),
  })

  textObj.anchor.set(anchor.x, anchor.y)
  textObj.visible = visible
  textObj.alpha = alpha
  textObj.interactive = interactive
  textObj.cursor = cursor

  if (x !== undefined) textObj.x = x
  if (y !== undefined) textObj.y = y
  if (rotation !== undefined) textObj.rotation = rotation
  if (scale) textObj.scale.set(scale.x, scale.y)

  return textObj
}

/**
 * Container 생성 설정
 */
interface ContainerConfig {
  interactive?: boolean
  visible?: boolean
  alpha?: number
  sortableChildren?: boolean
}

/**
 * 컨테이너 생성 팩토리
 * PIXI.Container 객체를 생성합니다.
 */
export const createContainer = (config: Partial<ContainerConfig> = {}): PIXI.Container => {
  const {
    interactive = false,
    visible = true,
    alpha = 1,
    sortableChildren = false,
  } = config

  const container = new PIXI.Container()
  container.interactive = interactive
  container.visible = visible
  container.alpha = alpha
  container.sortableChildren = sortableChildren

  return container
}

/**
 * Graphics 생성 설정
 */
interface GraphicsConfig {
  _fill?: { color: number | string; alpha: number }
  _stroke?: { color: number | string; width: number; alpha: number }
  interactive?: boolean
  cursor?: string
  visible?: boolean
  alpha?: number
}

/**
 * 그래픽 객체 생성 팩토리
 * 도형/선 그리기를 위한 Graphics 객체를 생성합니다.
 */
export const createGraphics = (config: Partial<GraphicsConfig> = {}): PIXI.Graphics => {
  const {
    _fill,
    _stroke,
    interactive = false,
    cursor = 'default',
    visible = true,
    alpha = 1,
  } = config

  const graphics = new PIXI.Graphics()
  graphics.visible = visible
  graphics.alpha = alpha
  graphics.interactive = interactive
  graphics.cursor = cursor

  return graphics
}
