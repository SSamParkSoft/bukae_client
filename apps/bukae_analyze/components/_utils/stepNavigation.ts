export const STEPS = [
  { label: 'AI 분석', path: '/analysis' },
  { label: '기획 설정', path: '/planning-setup' },
  { label: 'AI 기획', path: '/ai-planning' },
  { label: '촬영가이드 & 스크립트', path: '/shooting-guide' },
] as const

export function getCurrentStepIndex(pathname: string): number {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    const step = STEPS[i]
    if (!step) continue
    if (pathname.startsWith(step.path)) return i
  }
  return 0
}
