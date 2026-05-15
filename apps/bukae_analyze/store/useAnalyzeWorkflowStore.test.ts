import { beforeEach, describe, expect, it } from 'vitest'
import { useAnalyzeWorkflowStore } from './useAnalyzeWorkflowStore'

describe('useAnalyzeWorkflowStore trust boundary', () => {
  beforeEach(() => {
    useAnalyzeWorkflowStore.setState({
      planningSessionByProjectId: {},
      pt1AnswerDraftByKey: {},
      chatbotSessionByPlanningSessionId: {},
    })
  })

  it('does not own workflow completion source-of-truth', () => {
    const state = useAnalyzeWorkflowStore.getState()

    expect(state).not.toHaveProperty('analysisCompletedByProjectId')
    expect(state).not.toHaveProperty('isAnalysisCompleted')
    expect(state).not.toHaveProperty('markAnalysisCompleted')
  })

})
