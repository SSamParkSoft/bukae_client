const USER_PAUSE_TAG_RE = /\[pause(?:\s+short|\s+long)?\]/gi

// Pause 규칙 상수
const PUNCT_PAUSE_SKIP_CHARS = 7 // 문장부호 pause를 스킵할 최대 문장 길이
const SCENE_TRANSITION_PAUSE_TAG = '[pause short]' // 씬 전환 pause 태그

export type AutoPauseOptions = {
  /**
   * 씬 전환용 pause를 붙일지 여부
   * - 마지막 씬이 아니면 true
   */
  addSceneTransitionPause: boolean
  /**
   * pause 삽입 기능 활성화 여부
   * - false일 경우 pause 로직은 유지하되 실제로는 pause를 삽입하지 않음
   */
  enablePause?: boolean
}

/**
 * 사용자가 텍스트에 직접 입력한 pause 태그는 UI 단순화를 위해 무시합니다.
 */
export function stripUserPauseTags(text: string): string {
  return text.replace(USER_PAUSE_TAG_RE, '').replace(/\s+/g, ' ').trim()
}

/**
 * 순수 텍스트를 Chirp3 markup으로 변환합니다.
 * - `! . ?` 뒤에 다음 문장이 이어질 때 짧은 pause 삽입 (문장 길이 > 7자일 때만)
 * - 씬 전환 시(마지막 씬 제외) short pause 삽입
 *
 * NOTE: 반환된 markup은 합성 요청에만 사용하고, 사용자에게는 표시하지 않습니다.
 */
export function makeMarkupFromPlainText(input: string, opts: AutoPauseOptions): string {
  const cleaned = stripUserPauseTags(input)
  if (!cleaned) return ''

  const enablePause = opts.enablePause ?? false // 기본값: false (pause 비활성화)

  // pause 기능이 비활성화된 경우 원본 텍스트만 반환
  if (!enablePause) {
    return cleaned.trim()
  }

  // 문장부호 뒤에 텍스트가 이어지는 경우에만 pause 삽입
  // 직전 문장 길이 > 7자일 때만 pause 삽입
  let result = ''
  let lastIndex = 0
  const punctRegex = /([!.?])(\s*)(?=\S)/g
  let match: RegExpExecArray | null

  while ((match = punctRegex.exec(cleaned)) !== null) {
    const punctIndex = match.index
    const punctChar = match[1]
    const spaces = match[2]
    const nextCharIndex = match.index + match[0].length

    // 이전 문장부호 이후부터 현재 문장부호까지의 텍스트 길이 계산
    const prevSegment = cleaned.slice(lastIndex, punctIndex).trim()
    const segmentLength = prevSegment.length

    // 결과에 이전 세그먼트와 문장부호 추가
    result += cleaned.slice(lastIndex, punctIndex + punctChar.length)

    // 문장 길이 > 7자일 때만 pause 삽입
    if (segmentLength > PUNCT_PAUSE_SKIP_CHARS) {
      result += ` [pause] `
    } else {
      result += spaces
    }

    lastIndex = nextCharIndex
  }

  // 마지막 부분 추가
  const withPunctPauses = result + cleaned.slice(lastIndex)

  if (!opts.addSceneTransitionPause) {
    return withPunctPauses.trim()
  }

  // 씬 전환용 pause (마지막 씬 제외)
  return `${withPunctPauses.trim()} ${SCENE_TRANSITION_PAUSE_TAG}`
}


