import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getMaxAccessibleStepIndex,
  getStoredWorkflowStep,
  hasCompletedStep,
  markIntakeSubmitted,
  markWorkflowStepCompleted,
  migrateIntakeSubmissionStorage,
  subscribeWorkflowStepCompletionChanges,
} from './workflowStepCompletionStorage'

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
  private readonly listeners = new Map<string, Set<(event: Event) => void>>()

  addEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.get(type)?.delete(listener)
  }

  dispatchEvent(event: Event): boolean {
    this.listeners.get(event.type)?.forEach((listener) => {
      listener(event)
    })
    return true
  }
}

describe('workflowStepCompletionStorage trust boundary', () => {
  beforeEach(() => {
    vi.stubGlobal('window', new FakeWindow())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores workflow completion by project id', () => {
    markWorkflowStepCompleted('project-a', 'planning')
    markWorkflowStepCompleted('project-b', 'benchmark-analysis')

    expect(getStoredWorkflowStep('project-a')).toBe('planning')
    expect(getStoredWorkflowStep('project-b')).toBe('benchmark-analysis')
  })

  it('does not move workflow completion backwards', () => {
    markWorkflowStepCompleted('project-a', 'planning')
    markWorkflowStepCompleted('project-a', 'intake')

    expect(getStoredWorkflowStep('project-a')).toBe('planning')
    expect(hasCompletedStep('project-a', 'intake')).toBe(true)
    expect(hasCompletedStep('project-a', 'planning')).toBe(true)
    expect(hasCompletedStep('project-a', 'generation')).toBe(false)
  })

  it('calculates max accessible step index from trusted workflow storage', () => {
    expect(getMaxAccessibleStepIndex('project-a')).toBe(0)

    markWorkflowStepCompleted('project-a', 'planning')

    expect(getMaxAccessibleStepIndex('project-a')).toBe(2)
  })

  it('migrates legacy intake submission into workflow completion', () => {
    markIntakeSubmitted('project-a')
    migrateIntakeSubmissionStorage('project-a')

    expect(getStoredWorkflowStep('project-a')).toBe('intake')
  })

  it('notifies same-tab subscribers when completion changes', () => {
    const onStoreChange = vi.fn()
    const unsubscribe = subscribeWorkflowStepCompletionChanges(onStoreChange)

    markWorkflowStepCompleted('project-a', 'benchmark-analysis')
    markWorkflowStepCompleted('project-a', 'planning')

    expect(onStoreChange).toHaveBeenCalledTimes(2)

    unsubscribe()
    markWorkflowStepCompleted('project-a', 'generation')

    expect(onStoreChange).toHaveBeenCalledTimes(2)
  })
})
