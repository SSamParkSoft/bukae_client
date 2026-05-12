import { beforeEach, describe, expect, it } from 'vitest'
import { usePlanningStore } from './usePlanningStore'

describe('usePlanningStore trust boundary', () => {
  beforeEach(() => {
    usePlanningStore.setState({
      isSubmitting: false,
      submitError: null,
    })
  })

  it('keeps only planning setup submit UI state', () => {
    const state = usePlanningStore.getState()

    expect(state).not.toHaveProperty('answers')
    expect(state).not.toHaveProperty('setAnswers')
    expect(state.isSubmitting).toBe(false)
    expect(state.submitError).toBeNull()
  })

  it('updates submit loading and error state without owning form answers', () => {
    usePlanningStore.getState().setSubmitting(true)
    usePlanningStore.getState().setSubmitError('필수 값을 입력해주세요.')

    expect(usePlanningStore.getState()).toMatchObject({
      isSubmitting: true,
      submitError: '필수 값을 입력해주세요.',
    })
  })
})
