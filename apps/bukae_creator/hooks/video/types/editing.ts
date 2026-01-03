/**
 * 편집 관련 타입 정의
 */

import * as PIXI from 'pixi.js'
import { TimelineData } from '@/store/useVideoCreateStore'
import type { CommonRefs, EditMode, SelectedElementType, ResizeHandle, Transform, DragStartPos, ResizeStartPos } from './common'

/**
 * Pixi Editor 파라미터
 */
export interface UsePixiEditorParams extends Partial<CommonRefs> {
  // 필수 Refs
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  
  // 편집 핸들 Refs
  editHandlesRef: React.MutableRefObject<Map<number, PIXI.Container>>
  textEditHandlesRef: React.MutableRefObject<Map<number, PIXI.Container>>
  
  // 드래그 관련 Refs
  isDraggingRef: React.MutableRefObject<boolean>
  draggingElementRef: React.MutableRefObject<'image' | 'text' | null>
  dragStartPosRef: React.MutableRefObject<DragStartPos>
  
  // 리사이즈 관련 Refs
  isResizingRef: React.MutableRefObject<boolean>
  resizeHandleRef: React.MutableRefObject<ResizeHandle>
  resizeStartPosRef: React.MutableRefObject<ResizeStartPos | null>
  isFirstResizeMoveRef: React.MutableRefObject<boolean>
  
  // Transform 관련 Refs
  originalTransformRef: React.MutableRefObject<Transform | null>
  originalSpriteTransformRef: React.MutableRefObject<Map<number, Omit<Transform, 'baseWidth' | 'baseHeight' | 'left' | 'right' | 'top' | 'bottom'>>>
  originalTextTransformRef: React.MutableRefObject<Map<number, Omit<Transform, 'baseWidth' | 'baseHeight' | 'left' | 'right' | 'top' | 'bottom'>>>
  isResizingTextRef: React.MutableRefObject<boolean>
  
  // 기타 Refs
  currentSceneIndexRef: React.MutableRefObject<number>
  isSavingTransformRef: React.MutableRefObject<boolean>
  clickedOnPixiElementRef?: React.MutableRefObject<boolean>
  
  // State
  editMode: EditMode
  setEditMode: (mode: EditMode) => void
  selectedElementIndex: number | null
  setSelectedElementIndex: (index: number | null) => void
  selectedElementType: SelectedElementType
  setSelectedElementType: (type: SelectedElementType) => void
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData) => void
  useFabricEditing: boolean
  isPlayingRef?: React.MutableRefObject<boolean>
}

