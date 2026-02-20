import { TimelineData } from '@/store/useVideoCreateStore'

// 쇼츠 템플릿 상수 정의
const IMAGE_TOP_RATIO = 0.15 // 이미지 상단 위치 (15%)
const IMAGE_HEIGHT_RATIO = 0.7 // 이미지 높이 (70%)
const TEXT_Y_RATIO = 0.90 // 텍스트 Y 위치 (90%)
const TEXT_WIDTH_RATIO = 0.75 // 텍스트 너비 (75%)
const TEXT_HEIGHT_RATIO = 0.07 // 텍스트 높이 (7%)
const TEXT_X_RATIO = 0.5 // 텍스트 X 위치 (중앙, 50%)
const DEFAULT_FONT_SIZE = 80 // 기본 폰트 크기
const DEFAULT_TEXT_COLOR = '#ffffff' // 기본 텍스트 색상
const DEFAULT_FONT = 'Arial' // 기본 폰트

interface StageDimensions {
  width: number
  height: number
}

/**
 * 쇼츠용 템플릿을 모든 씬에 적용
 * 
 * @param timeline - 적용할 타임라인 데이터
 * @param stageDimensions - 스테이지 크기 (width, height)
 * @returns 업데이트된 타임라인 데이터
 */
export function applyShortsTemplateToScenes(
  timeline: TimelineData,
  stageDimensions: StageDimensions
): TimelineData {

  const { width, height } = stageDimensions

  // 모든 씬에 템플릿 적용
  const updatedScenes = timeline.scenes.map((scene, index) => {

    // 이미지 Transform: 상단 15%부터 시작, 가로 100%, 높이 70% (하단 15% 여백)
    // contain 모드로 이미지 비율 유지하면서 영역 내에 맞춤
    const imageTransform = {
      x: 0, // 왼쪽 끝 (0%)
      y: height * IMAGE_TOP_RATIO, // 상단에서 15% 위치
      width: width, // 전체 너비 (100%)
      height: height * IMAGE_HEIGHT_RATIO, // 높이의 70% (상단 15% + 이미지 70% + 하단 15% = 100%)
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    }

    // 텍스트 Transform: 하단 중앙 위치 (비율 기반)
    // 텍스트는 하단에서 약 8% 위에 위치, 너비는 75%
    const textY = height * TEXT_Y_RATIO // 하단에서 12% 위 (88% 위치)
    const textWidth = width * TEXT_WIDTH_RATIO // 화면 너비의 75%
    const textHeight = height * TEXT_HEIGHT_RATIO // 화면 높이의 7%

    const textTransform = {
      x: width * TEXT_X_RATIO, // 중앙 (50%)
      y: textY,
      width: textWidth,
      height: textHeight,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    }

    const updatedScene = {
      ...scene,
      imageFit: 'contain' as const, // 이미지 비율 유지하면서 영역 내에 맞춤
      imageTransform,
      text: {
        ...scene.text,
        position: 'bottom',
        color: DEFAULT_TEXT_COLOR,
        fontSize: DEFAULT_FONT_SIZE,
        font: DEFAULT_FONT,
        transform: textTransform,
        style: {
          bold: true,
          italic: false,
          underline: false,
          align: 'center' as const,
        },
      },
    }


    return updatedScene
  })

  const nextTimeline: TimelineData = {
    ...timeline,
    scenes: updatedScenes,
  }


  return nextTimeline
}

