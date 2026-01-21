import { SceneScript, TimelineScene } from '@/store/useVideoCreateStore'
import { getSceneDuration } from '@/utils/timeline'
import { SUBTITLE_DEFAULT_FONT_ID } from '@/lib/subtitle-fonts'

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

  // 각 문장마다 개별 duration을 다시 계산 (길이 비례 분배 대신 문장별 추정)
  const durations = sentences.map((sentence) => Math.max(2, getSceneDuration(sentence)))

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
          duration: durations[idx],
          transition: 'none',
          transitionDuration: 0,
          image: sceneScript.imageUrl || '',
          imageFit: 'fill',
          text: {
            content: sentence,
            font: SUBTITLE_DEFAULT_FONT_ID,
            fontWeight: 700,
            color: '#ffffff',
            position: 'center',
            fontSize: 80,
          },
        }

    // 분할된 각 구간은 전환 효과를 가지지 않는 독립 씬으로 시작
    // 이후 사용자가 각 씬에 다른 전환 효과를 설정할 수 있도록 transition/transitionDuration은 초기화
    return {
      ...base,
      sceneId: sceneScript.sceneId, // 원본 씬 번호 유지
      duration: durations[idx],
      transition: 'none',
      transitionDuration: 0,
      splitIndex: idx + 1, // 분할 인덱스 (1, 2, 3...)
      text: {
        ...base.text,
        content: sentence,
      },
    }
  })

  return { sceneScripts, timelineScenes }
}

/**
 * 씬 스크립트에 ||| 구분자를 삽입하여 하나의 객체로 유지한다.
 * - 문장을 `.`, `!`, `?` 기준으로 분할하고 각 문장 사이에 `|||` 구분자 삽입
 * - 객체 분할 없이 하나의 SceneScript/TimelineScene으로 반환
 */
export function insertSceneDelimiters(params: {
  sceneScript: SceneScript
  timelineScene?: TimelineScene
}): { sceneScript: SceneScript; timelineScene?: TimelineScene } {
  const { sceneScript, timelineScene } = params
  const sentences = splitScriptByPunctuation(sceneScript.script)

  // 분할 가능한 문장이 1개 이하이면 그대로 반환
  if (sentences.length <= 1) {
    return {
      sceneScript,
      timelineScene,
    }
  }

  // 각 문장 사이에 ||| 구분자 삽입
  const scriptWithDelimiters = sentences.join(' ||| ')

  // SceneScript 업데이트
  const updatedSceneScript: SceneScript = {
    ...sceneScript,
    script: scriptWithDelimiters,
  }

  // TimelineScene 업데이트 (text.content에 구분자 포함, 다른 속성은 모두 유지)
  const updatedTimelineScene: TimelineScene | undefined = timelineScene
    ? {
        ...timelineScene,
        // 기존 속성 모두 유지 (imageFit, transition, duration 등)
        text: {
          ...timelineScene.text,
          content: scriptWithDelimiters,
        },
      }
    : undefined

  return {
    sceneScript: updatedSceneScript,
    timelineScene: updatedTimelineScene,
  }
}


