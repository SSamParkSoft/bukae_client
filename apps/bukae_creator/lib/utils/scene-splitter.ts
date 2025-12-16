import { SceneScript, TimelineScene } from '@/store/useVideoCreateStore'
import { getSceneDuration } from '@/utils/timeline'

/**
 * `!`, `.`, `?` 기준으로 문장을 분리한다.
 * 구분 문자까지 포함한 형태로 반환하며, 공백/빈 문장은 제거한다.
 */
export function splitScriptByPunctuation(script: string): string[] {
  const trimmed = (script ?? '').trim()
  if (!trimmed) return []

  const sentences: string[] = []
  let current = ''

  for (const ch of trimmed) {
    current += ch
    if (ch === '!' || ch === '.' || ch === '?') {
      const sentence = current.trim()
      if (sentence) {
        sentences.push(sentence)
      }
      current = ''
    }
  }

  // 마지막에 구분 부호가 없는 문장 처리
  const last = current.trim()
  if (last) {
    sentences.push(last)
  }

  return sentences
}

/**
 * 전체 duration을 문장 길이에 비례해서 분배한다.
 * 각 씬에 최소 duration(2초)을 보장한다.
 */
function distributeDurationByLength(totalDuration: number, sentences: string[]): number[] {
  if (sentences.length === 0) return []
  if (sentences.length === 1) return [Math.max(2, totalDuration)] // 최소 2초 보장

  const MIN_DURATION = 2 // 각 분할된 씬의 최소 duration (초)
  const minTotalDuration = MIN_DURATION * sentences.length

  // 전체 duration이 최소 duration 합보다 작으면 확장
  const adjustedDuration = Math.max(totalDuration, minTotalDuration)

  const lengths = sentences.map((s) => {
    const len = s.replace(/\s+/g, '').length
    return len > 0 ? len : 1
  })

  const totalLength = lengths.reduce((acc, len) => acc + len, 0)
  if (totalLength === 0) {
    const equal = adjustedDuration / sentences.length
    return sentences.map(() => Math.max(MIN_DURATION, equal))
  }

  // 비례 분배 후 최소 duration 보장
  const distributed = lengths.map((len) => (adjustedDuration * len) / totalLength)
  return distributed.map((d) => Math.max(MIN_DURATION, d))
}

/**
 * 하나의 SceneScript / TimelineScene을 여러 문장 단위로 분할한다.
 * - 같은 이미지를 공유하고, 자막 텍스트만 문장 단위로 나뉜다.
 * - duration은 문장 길이에 비례해서 분배된다.
 * - 분할된 씬들 사이 전환 효과는 transitionDuration을 0으로 설정해
 *   화면 전환 없이 자막만 바뀌는 느낌이 나도록 한다.
 *
 * 반환되는 TimelineScene의 sceneId는 0으로 채워두고,
 * 실제 sceneId 재할당은 호출하는 쪽에서 처리한다.
 */
export function splitSceneBySentences(params: {
  sceneScript: SceneScript
  timelineScene?: TimelineScene
}): { sceneScripts: SceneScript[]; timelineScenes: TimelineScene[] } {
  const { sceneScript, timelineScene } = params
  const sentences = splitScriptByPunctuation(sceneScript.script)

  // 분할 가능한 문장이 1개 이하이면 그대로 반환
  if (sentences.length <= 1) {
    return {
      sceneScripts: [sceneScript],
      timelineScenes: timelineScene ? [timelineScene] : [],
    }
  }

  const baseDuration =
    timelineScene?.duration ?? getSceneDuration(sceneScript.script ?? '')
  const durations = distributeDurationByLength(baseDuration, sentences)

  const sceneScripts: SceneScript[] = sentences.map((sentence, idx) => ({
    sceneId: sceneScript.sceneId, // 원본 씬 번호 유지
    script: sentence,
    imageUrl: sceneScript.imageUrl,
    isAiGenerated: sceneScript.isAiGenerated,
    splitIndex: idx + 1, // 분할 인덱스 (1, 2, 3...)
  }))

  const timelineScenes: TimelineScene[] = sentences.map((sentence, idx) => {
    const base: TimelineScene = timelineScene
      ? {
          ...timelineScene,
        }
      : {
          sceneId: sceneScript.sceneId, // 원본 씬 번호 유지
          duration: baseDuration,
          transition: 'none',
          transitionDuration: 0,
          image: sceneScript.imageUrl || '',
          imageFit: 'fill',
          text: {
            content: sentence,
            font: 'Pretendard-Bold',
            color: '#ffffff',
            position: 'center',
            fontSize: 32,
          },
        }

    return {
      ...base,
      sceneId: sceneScript.sceneId, // 원본 씬 번호 유지
      duration: durations[idx],
      transition: 'none', // 씬 분할 간에는 전환 효과 없음
      transitionDuration: 0, // 씬 분할 간에는 전환 효과 없이 자막만 변경
      text: {
        ...base.text,
        content: sentence,
      },
    }
  })

  return { sceneScripts, timelineScenes }
}


