/**
 * Step 3: 컨테이너 구성 보장
 * ANIMATION.md 표준 파이프라인 3단계
 *
 * 씬마다 blackBg 포함 Container 생성, Stage clip mask 설정
 */

import type { PipelineContext, Step8Result } from './types'
import * as PIXI from 'pixi.js'

/** mainContainer에 clip mask가 이미 설정됐는지 추적하는 WeakSet */
const _maskedContainers = new WeakSet<PIXI.Container>()

/**
 * mainContainer에 스테이지 크기의 clip mask를 한 번만 설정
 */
function ensureStageMask(
  mainContainer: PIXI.Container,
  stageWidth: number,
  stageHeight: number
): void {
  if (_maskedContainers.has(mainContainer)) return

  const stageMask = new PIXI.Graphics()
  stageMask.beginFill(0xffffff)
  stageMask.drawRect(0, 0, stageWidth, stageHeight)
  stageMask.endFill()
  mainContainer.mask = stageMask
  mainContainer.addChild(stageMask)
  _maskedContainers.add(mainContainer)
}

/** sceneContainer 안에 blackBg(index 0)가 있는지 확인하는 Symbol 마커 */
const BLACK_BG_MARKER = Symbol('blackBg')

/**
 * sceneContainer 안에 blackBg가 없으면 생성하여 index 0에 추가
 */
function ensureBlackBg(
  sceneContainer: PIXI.Container,
  stageWidth: number,
  stageHeight: number
): void {
  const existing = sceneContainer.children.find(
    (c) => (c as PIXI.Graphics & { [BLACK_BG_MARKER]?: boolean })[BLACK_BG_MARKER]
  )
  if (existing) return

  const blackBg = new PIXI.Graphics() as PIXI.Graphics & { [BLACK_BG_MARKER]?: boolean }
  blackBg[BLACK_BG_MARKER] = true
  blackBg.beginFill(0x000000)
  blackBg.drawRect(0, 0, stageWidth, stageHeight)
  blackBg.endFill()
  blackBg.visible = true

  sceneContainer.addChildAt(blackBg, 0)
}

/**
 * 씬 index에 해당하는 sceneContainer를 가져오거나 생성하여
 * mainContainer 안에 등록한다.
 */
function getOrCreateSceneContainerInMain(
  sceneIndex: number,
  sceneContainersRef: React.MutableRefObject<Map<number, PIXI.Container>>,
  mainContainer: PIXI.Container,
  stageWidth: number,
  stageHeight: number
): PIXI.Container {
  let sc = sceneContainersRef.current.get(sceneIndex)

  if (!sc || sc.destroyed) {
    sc = new PIXI.Container()
    sceneContainersRef.current.set(sceneIndex, sc)
  }

  // blackBg 보장
  ensureBlackBg(sc, stageWidth, stageHeight)

  // mainContainer 안에 없으면 추가
  if (sc.parent !== mainContainer) {
    if (sc.parent) sc.parent.removeChild(sc)
    mainContainer.addChild(sc)
  }

  return sc
}

/**
 * sprite를 sceneContainer 안으로 이동 (기존 parent에서 제거 후 추가)
 * blackBg 뒤에 오도록 index 1 이상에 배치
 */
function moveSpriteToContainer(sprite: PIXI.Sprite, sceneContainer: PIXI.Container): void {
  if (sprite.parent === sceneContainer) return

  if (sprite.parent) {
    sprite.parent.removeChild(sprite)
  }
  sceneContainer.addChild(sprite)
}

/**
 * 3단계: 컨테이너 구성 보장
 *
 * - mainContainer에 stage clip mask 설정 (최초 1회)
 * - 현재 씬 / 이전 씬에 대해 blackBg 포함 sceneContainer 보장
 * - sprite를 sceneContainer 안으로 이동
 * - Transition이 없을 때 이전 sceneContainer 숨김 + 위치 초기화
 *
 * @returns false면 파이프라인 조기 반환 필요
 */
export function step3SetupContainers(
  context: PipelineContext,
  sceneIndex: number,
  sprite: PIXI.Sprite | undefined,
  _sceneText: PIXI.Text | undefined,
  step8Result: Step8Result
): boolean {
  const {
    containerRef,
    spritesRef,
    sceneContainersRef,
    subtitleContainerRef,
    transitionQuadContainerRef,
    stageDimensions,
  } = context

  const {
    isTransitionInProgress,
    isTransitionInProgressForRender,
    previousRenderedSceneIndex,
    sceneChanged: _sceneChanged,
  } = step8Result

  if (!containerRef.current) return false

  const mainContainer = containerRef.current
  const { width: stageWidth, height: stageHeight } = stageDimensions

  // 1. Stage clip mask (최초 1회)
  ensureStageMask(mainContainer, stageWidth, stageHeight)

  // 2. 현재 씬의 sceneContainer 보장
  const currentSceneContainer = getOrCreateSceneContainerInMain(
    sceneIndex,
    sceneContainersRef,
    mainContainer,
    stageWidth,
    stageHeight
  )

  // 3. 이전 씬의 sceneContainer 보장 (transition 중)
  const inTransition = isTransitionInProgress || isTransitionInProgressForRender
  if (inTransition && previousRenderedSceneIndex !== null && previousRenderedSceneIndex >= 0) {
    getOrCreateSceneContainerInMain(
      previousRenderedSceneIndex,
      sceneContainersRef,
      mainContainer,
      stageWidth,
      stageHeight
    )
  }

  // 4. sprite를 현재 sceneContainer 안으로 이동
  if (sprite && !sprite.destroyed) {
    moveSpriteToContainer(sprite, currentSceneContainer)
    // transition이 아닐 때 sprite 표시 (transition 중에는 step6에서 처리)
    if (!inTransition) {
      sprite.visible = true
      sprite.alpha = 1
    }
  }

  // 5. 자막 Container / Transition Quad Container를 최상위 유지
  //    (mainContainer 자식 순서: sceneContainers → subtitleContainer → quadContainer)
  const ensureOnTop = (child: PIXI.Container | null) => {
    if (!child) return
    if (child.parent === mainContainer) {
      mainContainer.setChildIndex(child, mainContainer.children.length - 1)
    } else {
      mainContainer.addChild(child)
    }
  }
  ensureOnTop(transitionQuadContainerRef.current)
  ensureOnTop(subtitleContainerRef.current)

  // 6. Transition이 없을 때: 다른 모든 sceneContainer 숨기고 현재 것만 보이게
  if (!inTransition) {
    sceneContainersRef.current.forEach((sc, idx) => {
      if (sc.destroyed) return
      if (idx === sceneIndex) {
        sc.visible = true
        sc.alpha = 1
        sc.x = 0
        sc.y = 0
      } else {
        sc.visible = false
        sc.alpha = 1
        sc.x = 0
        sc.y = 0
      }
    })

    // 이전 씬 sprite들도 숨김 (sceneContainer.visible=false로 이미 처리되지만 안전을 위해)
    spritesRef.current.forEach((spriteRef, spriteSceneIndex) => {
      if (spriteSceneIndex !== sceneIndex && spriteRef && !spriteRef.destroyed) {
        spriteRef.visible = false
        spriteRef.alpha = 0
      }
    })
  }

  return true
}
