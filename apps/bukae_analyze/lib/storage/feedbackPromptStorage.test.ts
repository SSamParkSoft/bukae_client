import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissFeedbackPrompt,
  hasDismissedFeedbackPrompt,
} from './feedbackPromptStorage'

class FakeLocalStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

class FakeWindow {
  readonly localStorage = new FakeLocalStorage()
}

describe('feedbackPromptStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new FakeWindow())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores prompt dismissal by prompt id and project id', () => {
    dismissFeedbackPrompt('shooting-guide', 'project-a')

    expect(hasDismissedFeedbackPrompt('shooting-guide', 'project-a')).toBe(true)
    expect(hasDismissedFeedbackPrompt('chatbot', 'project-a')).toBe(false)
    expect(hasDismissedFeedbackPrompt('shooting-guide', 'project-b')).toBe(false)
  })
})
