const USER_PAUSE_TAG_RE = /\[pause(?:\s+short|\s+long)?\]/gi

export type AutoPauseOptions = {
  /**
   * 씬 전환용 pause를 붙일지 여부
   * - 마지막 씬이 아니면 true
   */
  addSceneTransitionPause: boolean
}

/**
 * 사용자가 텍스트에 직접 입력한 pause 태그는 UI 단순화를 위해 무시합니다.
 */
export function stripUserPauseTags(text: string): string {
  return text.replace(USER_PAUSE_TAG_RE, '').replace(/\s+/g, ' ').trim()
}

/**
 * 순수 텍스트를 Chirp3 markup으로 변환합니다.
 * - `! . ?` 뒤에 다음 문장이 이어질 때 짧은 pause 삽입
 * - 씬 전환 시(마지막 씬 제외) 긴 pause 삽입
 *
 * NOTE: 반환된 markup은 합성 요청에만 사용하고, 사용자에게는 표시하지 않습니다.
 */
export function makeMarkupFromPlainText(input: string, opts: AutoPauseOptions): string {
  const cleaned = stripUserPauseTags(input)
  if (!cleaned) return ''

  // 문장부호 뒤에 텍스트가 이어지는 경우에만 pause 삽입
  // 예: "좋아! 지금" -> "좋아! [pause] 지금"
  // 공백 유무와 무관하게 다음에 글자가 있으면 삽입
  const withPunctPauses = cleaned.replace(/([!.?])(\s*)(?=\S)/g, '$1 [pause] ')

  if (!opts.addSceneTransitionPause) {
    return withPunctPauses.trim()
  }

  // 씬 전환용 pause (마지막 씬 제외)
  return `${withPunctPauses.trim()} [pause long]`
}


