import { describe, expect, it } from 'vitest'
import { mapPlanningSession } from './planningMapper'

describe('mapPlanningSession', () => {
  it('maps PLANNING_READY project status to planningReady workflow status', () => {
    const session = mapPlanningSession({
      planningSessionId: 'planning-session-id',
      planningStatus: 'WAITING_FOR_USER',
      planningMode: 'pt1',
      clarifyingQuestions: [],
      projectStatus: 'PLANNING_READY',
      currentStep: 'PLANNING',
    })

    expect(session.projectStatus).toBe('PLANNING_READY')
    expect(session.projectWorkflow.status).toBe('planningReady')
    expect(session.projectWorkflow.step).toBe('planning')
  })

  it('maps FAILED project status to failed workflow status', () => {
    const session = mapPlanningSession({
      planningSessionId: 'planning-session-id',
      planningStatus: 'DRAFTING',
      planningMode: 'pt1',
      clarifyingQuestions: [],
      projectStatus: 'FAILED',
      currentStep: 'PLANNING',
    })

    expect(session.projectStatus).toBe('FAILED')
    expect(session.projectWorkflow.status).toBe('failed')
  })
})
