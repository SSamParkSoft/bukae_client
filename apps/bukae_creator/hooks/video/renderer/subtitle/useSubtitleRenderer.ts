/**
 * 자막 렌더링 훅
 * 자막 렌더링 관련 함수들
 */

import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import type { TimelineData } from '@/store/useVideoCreateStore'

/**
 * Anchor 좌표를 Box Top-left 좌표로 정규화
 * ANIMATION.md 6.2 규칙
 */
export function normalizeAnchorToTopLeft(
  x: number,
  y: number,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
  anchorX: number,
  anchorY: number
): { boxX: number; boxY: number; boxW: number; boxH: number } {
  const scaledW = width * scaleX
  const scaledH = height * scaleY
  
  // Anchor (0~1)를 픽셀 오프셋으로 변환
  const offsetX = scaledW * (anchorX - 0.5)
  const offsetY = scaledH * (anchorY - 0.5)
  
  // Top-left 좌표 계산
  const boxX = x - offsetX
  const boxY = y - offsetY
  
  return {
    boxX,
    boxY,
    boxW: scaledW,
    boxH: scaledH,
  }
}

/**
 * 박스 내부 텍스트 정렬 계산
 * ANIMATION.md 6.3 규칙
 * 세로 정렬은 middle 고정 (서버와 동일)
 */
export function calculateTextPositionInBox(
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  textWidth: number,
  textHeight: number,
  hAlign: 'left' | 'center' | 'right'
): { textX: number; textY: number } {
  // 가로 정렬
  let textX: number
  switch (hAlign) {
    case 'left':
      textX = boxX
      break
    case 'center':
      textX = boxX + (boxW - textWidth) / 2
      break
    case 'right':
      textX = boxX + boxW - textWidth
      break
  }
  
  // 세로 정렬 (middle 고정 - ANIMATION.md 6.3)
  const textY = boxY + (boxH - textHeight) / 2
  
  return { textX, textY }
}

/**
 * 자막 렌더링 함수 파라미터
 */
export interface RenderSubtitlePartParams {
  timeline: TimelineData
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  subtitleContainerRef: React.MutableRefObject<PIXI.Container | null>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
}

/**
 * 자막 렌더링 헬퍼 함수
 */
export function useSubtitleRenderer({
  timeline,
  appRef,
  containerRef,
  subtitleContainerRef,
  textsRef,
}: RenderSubtitlePartParams) {
  const renderSubtitlePart = useCallback(
    (sceneIndex: number, partIndex: number | null, options?: { skipAnimation?: boolean; onComplete?: () => void }) => {
      if (!timeline || !appRef.current) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      const scene = timeline.scenes[sceneIndex]
      if (!scene) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      const originalText = scene.text?.content || ''
      const scriptParts = splitSubtitleByDelimiter(originalText)
      const hasSegments = scriptParts.length > 1

      let partText: string | null = null
      if (partIndex === null) {
        if (hasSegments) {
          partText = scriptParts[0]?.trim() || originalText
        } else {
          partText = originalText
        }
      } else {
        if (partIndex >= 0 && partIndex < scriptParts.length) {
          partText = scriptParts[partIndex]?.trim() || null
        } else {
          if (scriptParts.length > 0) {
            partText = scriptParts[0]?.trim() || null
          } else {
            partText = originalText
          }
        }
      }

      if (!partText) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      // 모든 텍스트를 먼저 숨김 (겹침 방지)
      // Transition 진행 중에도 현재 씬의 자막만 표시하고 다른 씬의 텍스트는 숨김
      textsRef.current.forEach((textObj, textSceneIndex) => {
        if (textObj && !textObj.destroyed && textSceneIndex !== sceneIndex) {
          textObj.visible = false
          textObj.alpha = 0
        }
      })
      
      // 같은 그룹 내 다른 씬의 텍스트도 숨김 (같은 텍스트 객체를 공유하는 경우)
      const sceneId = scene.sceneId
      if (sceneId !== undefined) {
        const sameGroupSceneIndices = timeline.scenes
          .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
          .filter((idx) => idx >= 0 && idx !== sceneIndex)
        
        sameGroupSceneIndices.forEach((groupSceneIndex) => {
          const groupTextObj = textsRef.current.get(groupSceneIndex)
          if (groupTextObj && !groupTextObj.destroyed) {
            groupTextObj.visible = false
            groupTextObj.alpha = 0
          }
        })
      }
      
      // 텍스트 객체 찾기
      // 분할된 씬(splitIndex가 있는 경우)의 경우 각 씬 인덱스별로 별도 텍스트 객체를 사용
      // 분할되지 않은 씬의 경우 같은 그룹 내에서 텍스트 객체를 공유할 수 있음
      let targetTextObj: PIXI.Text | null = null
      
      // 분할된 씬의 경우 현재 씬 인덱스의 텍스트 객체를 우선 사용
      if (scene.splitIndex !== undefined) {
        targetTextObj = textsRef.current.get(sceneIndex) || null
        
        // 분할된 씬인데 텍스트 객체가 없으면 같은 그룹 내 다른 씬의 텍스트 객체를 찾아서 복제하거나 참조
        // 단, 분할된 씬은 각각 별도의 텍스트 객체를 가져야 하므로 같은 그룹 내 다른 씬의 텍스트 객체를 찾아서 사용
        if (!targetTextObj && sceneId !== undefined) {
          // 같은 그룹 내 모든 씬 인덱스 찾기
          const sameGroupSceneIndices = timeline.scenes
            .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
            .filter((idx) => idx >= 0 && idx !== sceneIndex)
          
          // 같은 그룹 내 씬들 중 텍스트 객체가 있는 첫 번째 씬 찾기
          for (const groupSceneIndex of sameGroupSceneIndices) {
            const groupTextObj = textsRef.current.get(groupSceneIndex)
            if (groupTextObj && !groupTextObj.destroyed) {
              // 분할된 씬은 별도의 텍스트 객체가 필요하지만, 아직 생성되지 않았을 경우
              // 같은 그룹 내 다른 씬의 텍스트 객체를 임시로 사용 (렌더링 보장)
              targetTextObj = groupTextObj
              break
            }
          }
        }
      } else {
        // 분할되지 않은 씬의 경우 현재 씬 인덱스의 텍스트 객체를 우선 사용
        targetTextObj = textsRef.current.get(sceneIndex) || null
        
        // 현재 씬 인덱스의 텍스트 객체가 없으면 같은 그룹 내 첫 번째 씬 인덱스의 텍스트 객체 사용
        if (!targetTextObj) {
          if (sceneId !== undefined) {
            const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
            if (firstSceneIndexInGroup >= 0) {
              targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
            }
          }
        }
      }
      
      // 다른 씬의 텍스트 객체는 사용하지 않음 (자막 누적 방지)
      // 현재 씬의 텍스트 객체를 찾지 못했으면 조기 종료
      if (!targetTextObj) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      // 텍스트 객체를 찾지 못했거나 파괴된 경우 조기 종료
      if (!targetTextObj || targetTextObj.destroyed) {
        // 텍스트 객체를 찾을 수 없음 (로그 제거)
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      // UX 개선: 텍스트 객체를 자막 Container에 추가 (Shader Transition을 위한 분리)
      if (subtitleContainerRef.current) {
        // 이전 부모에서 제거 (부드러운 전환을 위해 필요시에만)
        if (targetTextObj.parent && targetTextObj.parent !== subtitleContainerRef.current) {
          targetTextObj.parent.removeChild(targetTextObj)
        }
        // 자막 Container에 추가 (중복 체크로 깜빡임 방지)
        if (!targetTextObj.parent) {
          subtitleContainerRef.current.addChild(targetTextObj)
        }
        // UX 개선: 자막을 항상 맨 위로 올려서 가시성 보장
        const currentIndex = subtitleContainerRef.current.getChildIndex(targetTextObj)
        const maxIndex = subtitleContainerRef.current.children.length - 1
        if (currentIndex !== maxIndex) {
          subtitleContainerRef.current.setChildIndex(targetTextObj, maxIndex)
        }
      } else if (containerRef.current) {
        // 자막 Container가 없으면 기존 방식 사용 (하위 호환성)
        // 이전 부모에서 제거
        if (targetTextObj.parent && targetTextObj.parent !== containerRef.current) {
          targetTextObj.parent.removeChild(targetTextObj)
        }
        // 컨테이너에 추가 (최상위 레이어로)
        if (!targetTextObj.parent) {
          containerRef.current.addChild(targetTextObj)
        }
        // 텍스트는 항상 최상위 레이어
        const currentIndex = containerRef.current.getChildIndex(targetTextObj)
        const maxIndex = containerRef.current.children.length - 1
        if (currentIndex !== maxIndex) {
          containerRef.current.setChildIndex(targetTextObj, maxIndex)
        }
      }

      // 텍스트 업데이트
      targetTextObj.text = partText

      // 자막 스타일 업데이트
      if (scene.text) {
        const textObj = targetTextObj
        const fontFamily = resolveSubtitleFontFamily(scene.text.font)
        const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)

        const stageWidth = appRef.current?.screen?.width || 1080
        let textWidth = stageWidth
        if (scene.text.transform?.width) {
          textWidth = scene.text.transform.width / (scene.text.transform.scaleX || 1)
        }

        const styleConfig: Record<string, unknown> = {
          fontFamily,
          fontSize: scene.text.fontSize || 80,
          fill: scene.text.color || '#ffffff',
          align: scene.text.style?.align || 'center',
          fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
          fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
          wordWrap: true,
          wordWrapWidth: textWidth,
          breakWords: true,
          stroke: { color: '#000000', width: 10 },
        }

        const textStyle = new PIXI.TextStyle(styleConfig as Partial<PIXI.TextStyle>)
        textObj.style = textStyle

        // 텍스트 Transform 적용 (ANIMATION.md 박스+정렬 규칙)
        // 텍스트 스타일이 설정된 후에 bounds를 계산할 수 있도록 여기서 처리
        if (scene.text.transform) {
          const transform = scene.text.transform
          const scaleX = transform.scaleX ?? 1
          const scaleY = transform.scaleY ?? 1
          
          // Anchor 및 정렬 기본값 설정 (하위 호환성)
          const anchorX = transform.anchor?.x ?? 0.5
          const anchorY = transform.anchor?.y ?? 0.5
          const hAlign = transform.hAlign ?? 'center'
          // vAlign은 middle 고정 (ANIMATION.md 6.3)
          
          // Anchor→TopLeft 정규화 (ANIMATION.md 6.2)
          const { boxX, boxY, boxW, boxH } = normalizeAnchorToTopLeft(
            transform.x,
            transform.y,
            transform.width,
            transform.height,
            scaleX,
            scaleY,
            anchorX,
            anchorY
          )
          
          // 텍스트 실제 크기 계산 (PIXI.Text의 getLocalBounds 사용)
          // 스타일이 설정된 후이므로 bounds를 계산할 수 있음
          const textBounds = textObj.getLocalBounds()
          const measuredTextWidth = textBounds.width || 0
          const measuredTextHeight = textBounds.height || 0
          
          // 박스 내부 정렬 계산 (ANIMATION.md 6.3)
          // vAlign은 middle 고정이므로 파라미터로 전달하지 않음
          const { textX, textY } = calculateTextPositionInBox(
            boxX,
            boxY,
            boxW,
            boxH,
            measuredTextWidth,
            measuredTextHeight,
            hAlign
          )
          
          // 디버깅 로그 (개발 모드)
          if (process.env.NODE_ENV === 'development') {
            console.log('[useTransportRenderer] Subtitle Box+Align Calculation:', {
              sceneIndex,
              partIndex,
              transform: {
                x: transform.x,
                y: transform.y,
                width: transform.width,
                height: transform.height,
                scaleX,
                scaleY,
                anchorX,
                anchorY,
                hAlign,
              },
              box: {
                boxX: boxX.toFixed(2),
                boxY: boxY.toFixed(2),
                boxW: boxW.toFixed(2),
                boxH: boxH.toFixed(2),
              },
              text: {
                measuredWidth: measuredTextWidth.toFixed(2),
                measuredHeight: measuredTextHeight.toFixed(2),
                textX: textX.toFixed(2),
                textY: textY.toFixed(2),
              },
            })
          }
          
          // PIXI.Text의 anchor를 (0, 0)으로 설정하고 계산된 위치 사용
          textObj.anchor.set(0, 0)
          textObj.x = textX
          textObj.y = textY
          textObj.scale.set(scaleX, scaleY)
          textObj.rotation = transform.rotation ?? 0
        } else {
          const position = scene.text.position || 'bottom'
          const stageHeight = appRef.current?.screen?.height || 1920
          if (position === 'top') {
            textObj.y = stageHeight * 0.15
          } else if (position === 'bottom') {
            textObj.y = stageHeight * 0.85
          } else {
            textObj.y = stageHeight * 0.5
          }
          textObj.x = stageWidth * 0.5
          textObj.scale.set(1, 1)
          textObj.rotation = 0
          // 기존 방식: anchor를 중앙으로 설정
          textObj.anchor.set(0.5, 0.5)
        }

        // 밑줄 렌더링 (Transform 적용 후에 처리)
        const removeUnderline = () => {
          const underlineChildren = textObj.children.filter(
            (child) => child instanceof PIXI.Graphics && (child as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline
          )
          underlineChildren.forEach((child) => textObj.removeChild(child))
        }
        removeUnderline()
        if (scene.text.style?.underline) {
          requestAnimationFrame(() => {
            const underlineHeight = Math.max(2, (scene.text.fontSize || 80) * 0.05)
            const textColor = scene.text.color || '#ffffff'
            const colorValue = textColor.startsWith('#')
              ? parseInt(textColor.slice(1), 16)
              : 0xffffff

            const bounds = textObj.getLocalBounds()
            const underlineWidth = bounds.width || textWidth

            const underline = new PIXI.Graphics()
            ;(underline as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline = true

            const halfWidth = underlineWidth / 2
            const yPos = bounds.height / 2 + underlineHeight * 0.25

            underline.lineStyle(underlineHeight, colorValue, 1)
            underline.moveTo(-halfWidth, yPos)
            underline.lineTo(halfWidth, yPos)
            underline.stroke()

            textObj.addChild(underline)
          })
        }
      }

      // 표시 (강제로 설정하여 다른 로직에 의해 숨겨진 경우에도 보이도록 함)
      targetTextObj.visible = true
      targetTextObj.alpha = 1
      
      // 텍스트 표시 후 다시 한 번 같은 그룹 내 다른 텍스트 숨김 (겹침 방지)
      if (sceneId !== undefined) {
        const sameGroupSceneIndices = timeline.scenes
          .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
          .filter((idx) => idx >= 0 && idx !== sceneIndex)
        
        sameGroupSceneIndices.forEach((groupSceneIndex) => {
          const groupTextObj = textsRef.current.get(groupSceneIndex)
          if (groupTextObj && !groupTextObj.destroyed && groupTextObj !== targetTextObj) {
            groupTextObj.visible = false
            groupTextObj.alpha = 0
          }
        })
      }
      
      // 다른 씬의 텍스트도 명시적으로 숨김 (중복 방지)
      textsRef.current.forEach((textObj, textSceneIndex) => {
        if (textObj && !textObj.destroyed && textSceneIndex !== sceneIndex && textObj !== targetTextObj) {
          // 같은 그룹 내 텍스트는 위에서 이미 처리했으므로 제외
          const otherScene = timeline.scenes[textSceneIndex]
          const isSameGroup = sceneId !== undefined && otherScene?.sceneId === sceneId
          if (!isSameGroup) {
            textObj.visible = false
            textObj.alpha = 0
          }
        }
      })

      if (options?.onComplete) {
        options.onComplete()
      }
    },
    [timeline, appRef, containerRef, subtitleContainerRef, textsRef]
  )

  return {
    renderSubtitlePart,
    normalizeAnchorToTopLeft,
    calculateTextPositionInBox,
  }
}
