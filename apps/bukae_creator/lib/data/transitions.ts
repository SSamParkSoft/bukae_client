/**
 * 전환 효과 라벨 맵
 */
export const transitionLabels: Record<string, string> = {
  'none': '없음',
  'fade': '페이드',
  'slide-left': '슬라이드 좌',
  'slide-right': '슬라이드 우',
  'slide-up': '슬라이드 상',
  'slide-down': '슬라이드 하',
  'zoom-in': '확대',
  'zoom-out': '축소',
  'rotate': '회전',
  'blur': '블러',
  'glitch': '글리치',
  'ripple': '물결',
  'circle': '원형',
}

/**
 * "움직임" 효과 목록 (그룹 내 전환 효과 지속 대상)
 */
export const MOVEMENT_EFFECTS = ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out']

/**
 * 기본 전환 효과 옵션
 */
export const transitions = [
  { value: 'none', label: '없음' },
  { value: 'fade', label: '페이드' },
  { value: 'rotate', label: '회전' },
  { value: 'blur', label: '블러' },
  { value: 'glitch', label: '글리치' },
  { value: 'ripple', label: '물결' },
  { value: 'circle', label: '원형' },
]

/**
 * 움직임 효과 옵션
 */
export const movements = [
  { value: 'slide-left', label: '슬라이드 좌' },
  { value: 'slide-right', label: '슬라이드 우' },
  { value: 'slide-up', label: '슬라이드 상' },
  { value: 'slide-down', label: '슬라이드 하' },
  { value: 'zoom-in', label: '확대' },
  { value: 'zoom-out', label: '축소' },
]

/**
 * 모든 전환 효과 옵션 (하위 호환성을 위해 유지)
 */
export const allTransitions = [...transitions, ...movements]

