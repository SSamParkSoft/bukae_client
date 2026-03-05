import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSubtitlePosition } from '../../renderer/utils/getSubtitlePosition'

export interface SubtitleStageSize {
  width: number
  height: number
}

type SubtitleAlignment = 'left' | 'center' | 'right'

interface SubtitleTransformForEncoding {
  x: number
  y: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  rotation: number
  anchor: { x: number; y: number }
}

interface SubtitleStrokeForEncoding {
  enabled: boolean
  color: string
  width: number
}

export interface SerializedSubtitleForEncoding {
  transform: SubtitleTransformForEncoding
  alignment: SubtitleAlignment
  stroke: SubtitleStrokeForEncoding
}

function normalizeAlignment(value?: string): SubtitleAlignment {
  if (value === 'left' || value === 'right' || value === 'center') {
    return value
  }
  return 'center'
}

function getFallbackBoxWidth(stage: SubtitleStageSize): number {
  return stage.width * 0.75
}

export function serializeSubtitleForEncoding(
  scene: TimelineData['scenes'][number],
  stage: SubtitleStageSize
): SerializedSubtitleForEncoding {
  const sceneText = scene.text ?? {
    content: ' ',
    font: 'pretendard',
    color: '#ffffff',
  }
  const transform = sceneText.transform
  const strokeWidth = sceneText.stroke?.width ?? 5
  const strokeColor = sceneText.stroke?.color ?? '#000000'

  const alignment = normalizeAlignment(
    transform?.hAlign ?? sceneText.style?.align ?? 'center'
  )
  const fallbackWidth = getFallbackBoxWidth(stage)

  if (transform) {
    return {
      transform: {
        x: transform.x,
        y: transform.y,
        width: transform.width && transform.width > 0 ? transform.width : fallbackWidth,
        height: transform.height && transform.height > 0 ? transform.height : stage.height * 0.07,
        scaleX: transform.scaleX ?? 1,
        scaleY: transform.scaleY ?? 1,
        rotation: transform.rotation ?? 0,
        anchor: {
          x: transform.anchor?.x ?? 0.5,
          y: transform.anchor?.y ?? 0.5,
        },
      },
      alignment,
      stroke: {
        enabled: strokeWidth > 0,
        color: strokeColor,
        width: strokeWidth,
      },
    }
  }

  const subtitlePosition = getSubtitlePosition(scene, stage)

  return {
    transform: {
      x: subtitlePosition.x,
      y: subtitlePosition.y,
      width: fallbackWidth,
      height: stage.height * 0.07,
      scaleX: subtitlePosition.scaleX ?? 1,
      scaleY: subtitlePosition.scaleY ?? 1,
      rotation: subtitlePosition.rotation ?? 0,
      anchor: { x: 0.5, y: 0.5 },
    },
    alignment,
    stroke: {
      enabled: strokeWidth > 0,
      color: strokeColor,
      width: strokeWidth,
    },
  }
}
