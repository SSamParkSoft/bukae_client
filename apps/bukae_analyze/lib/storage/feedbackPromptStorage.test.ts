import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearFeedbackPromptDismissals,
  dismissFeedbackPrompt,
  hasDismissedFeedbackPrompt,
} from './feedbackPromptStorage'

class FakeLocalStorage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
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

  it('stores prompt dismissal by project id', () => {
    dismissFeedbackPrompt('project-a')

    expect(hasDismissedFeedbackPrompt('project-a')).toBe(true)
    expect(hasDismissedFeedbackPrompt('project-b')).toBe(false)
  })

  it('clears prompt dismissals', () => {
    dismissFeedbackPrompt('project-a')
    dismissFeedbackPrompt('project-b')

    clearFeedbackPromptDismissals()

    expect(hasDismissedFeedbackPrompt('project-a')).toBe(false)
    expect(hasDismissedFeedbackPrompt('project-b')).toBe(false)
  })
})
