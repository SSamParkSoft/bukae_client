export const ANALYZE_WORKFLOW_STEPS = [
  { label: 'AI 분석', path: '/analysis' },
  { label: '기획 프리세팅', path: '/planning-setup' },
  { label: 'AI 기획', path: '/ai-planning' },
  { label: '촬영가이드 & 스크립트', path: '/shooting-guide' },
] as const

export function buildAnalyzeWorkflowStepPath(
  path: string,
  options: {
    projectId: string | null
    planning: string | null
  }
): string {
  const params = new URLSearchParams()

  if (options.projectId) {
    params.set('projectId', options.projectId)
  }

  if (options.planning) {
    params.set('planning', options.planning)
  }

  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export function getAnalyzeWorkflowStepIndex(pathname: string): number {
  for (let i = ANALYZE_WORKFLOW_STEPS.length - 1; i >= 0; i--) {
    const step = ANALYZE_WORKFLOW_STEPS[i]
    if (!step) continue
    if (pathname.startsWith(step.path)) return i
  }
  return 0
}
