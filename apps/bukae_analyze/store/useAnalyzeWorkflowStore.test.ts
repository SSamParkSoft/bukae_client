import { beforeEach, describe, expect, it } from 'vitest'
import { useAnalyzeWorkflowStore } from './useAnalyzeWorkflowStore'

describe('useAnalyzeWorkflowStore trust boundary', () => {
  beforeEach(() => {
    useAnalyzeWorkflowStore.setState({
      planningSessionByProjectId: {},
      pt1AnswerDraftByKey: {},
      chatbotSessionByPlanningSessionId: {},
      generationRequestIdByBriefVersionId: {},
    })
  })

  it('does not own workflow completion source-of-truth', () => {
    const state = useAnalyzeWorkflowStore.getState()

    expect(state).not.toHaveProperty('analysisCompletedByProjectId')
    expect(state).not.toHaveProperty('isAnalysisCompleted')
    expect(state).not.toHaveProperty('markAnalysisCompleted')
  })

  it('keeps generation request ids as isolated in-memory cache entries', () => {
    useAnalyzeWorkflowStore
      .getState()
      .cacheGenerationRequestId('brief-a', 'generation-a')

    expect(
      useAnalyzeWorkflowStore.getState().getCachedGenerationRequestId('brief-a')
    ).toBe('generation-a')
    expect(
      useAnalyzeWorkflowStore.getState().getCachedGenerationRequestId('brief-b')
    ).toBeNull()
  })
})
