import { makeMarkupFromPlainText } from '@/lib/tts/auto-pause'
import type { TimelineData } from '@/store/useVideoCreateStore'

/**
 * 씬의 텍스트를 마크업 배열로 변환합니다.
 * ||| 구분자로 분할하여 각 구간별로 마크업을 생성합니다.
 * 
 * @param timeline Timeline 객체
 * @param sceneIndex 씬 인덱스
 * @returns 마크업 배열
 */
export const buildSceneMarkup = (timeline: TimelineData | null, sceneIndex: number): string[] => {
  if (!timeline) return []
  const base = (timeline.scenes[sceneIndex]?.text?.content ?? '').trim()
  if (!base) return []
  
  // ||| 구분자로 분할 (공백 유무와 관계없이 분할)
  const parts = base.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
  
  // 디버깅: Scene 1의 경우 로그 출력
  if (sceneIndex === 0 && parts.length > 1) {
    console.log(`[DEBUG] Scene ${sceneIndex} 구분자 발견: ${parts.length}개 구간`, base.substring(0, 100))
  } else if (sceneIndex === 0) {
    console.log(`[DEBUG] Scene ${sceneIndex} 구분자 없음: 1개 구간`, base.substring(0, 100))
  }
  
  // 각 구간별로 마크업 생성
  const isLast = sceneIndex >= timeline.scenes.length - 1
  // pause 기능은 현재 비활성화되어 있으나, 로직은 유지됨
  // pause를 다시 사용하려면 enablePause: true로 변경
  return parts.map((part, partIndex) => {
    // 마지막 씬의 마지막 구간이 아니면 transition pause 추가
    const isLastPart = isLast && partIndex === parts.length - 1
    return makeMarkupFromPlainText(part, { 
      addSceneTransitionPause: !isLastPart,
      enablePause: false // pause 비활성화 (로직은 유지)
    })
  })
}

/**
 * TTS 캐시 키를 생성합니다.
 * 
 * @param voiceName 음성 템플릿 이름
 * @param markup 마크업 문자열
 * @returns TTS 캐시 키
 */
export const makeTtsKey = (voiceName: string, markup: string): string => {
  return `${voiceName}::${markup}`
}

