import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_PLANNING_SETUP_ANSWERS } from '@/lib/utils/planningSetupQuery'
import type { PlanningSetupAnswers } from '@/lib/types/domain'
import {
  clearStoredPlanningSetupAnswers,
  getPlanningSetupAnswerSnapshot,
  getStoredPlanningSetupAnswers,
  storePlanningSetupAnswers,
  subscribePlanningSetupAnswerChanges,
} from './planningSetupAnswerStorage'

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

  clear(): void {
    this.values.clear()
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

function createAnswers(overrides: Partial<PlanningSetupAnswers> = {}): PlanningSetupAnswers {
  return {
    ...EMPTY_PLANNING_SETUP_ANSWERS,
    category: 'information',
    faceExposure: 'face-cam',
    videoLength: '15-30s',
    shooting: 'yes',
    shootingEnvironment: '실내 책상 앞',
    coreMaterial: '제품 사용 장면',
    ...overrides,
  }
}

function installFakeWindow(): FakeWindow {
  const fakeWindow = new FakeWindow()
  vi.stubGlobal('window', fakeWindow)
  return fakeWindow
}

describe('planningSetupAnswerStorage', () => {
  beforeEach(() => {
    installFakeWindow()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores planning setup draft by project id', () => {
    const projectAAnswers = createAnswers({ coreMaterial: '프로젝트 A 소재' })
    const projectBAnswers = createAnswers({ coreMaterial: '프로젝트 B 소재' })

    storePlanningSetupAnswers('project-a', projectAAnswers)
    storePlanningSetupAnswers('project-b', projectBAnswers)

    expect(getStoredPlanningSetupAnswers('project-a')).toMatchObject({
      coreMaterial: '프로젝트 A 소재',
    })
    expect(getStoredPlanningSetupAnswers('project-b')).toMatchObject({
      coreMaterial: '프로젝트 B 소재',
    })
  })

  it('falls back to empty answers when there is no trusted draft', () => {
    expect(getStoredPlanningSetupAnswers('missing-project')).toBeNull()
    expect(getPlanningSetupAnswerSnapshot('missing-project')).toEqual(
      EMPTY_PLANNING_SETUP_ANSWERS
    )

    window.localStorage.setItem('bukae_analyze:planning-setup:broken', '{')

    expect(getPlanningSetupAnswerSnapshot('broken')).toEqual(
      EMPTY_PLANNING_SETUP_ANSWERS
    )
  })

  it('notifies same-tab subscribers when the draft changes', () => {
    const onStoreChange = vi.fn()
    const unsubscribe = subscribePlanningSetupAnswerChanges(onStoreChange)

    storePlanningSetupAnswers('project-a', createAnswers())
    clearStoredPlanningSetupAnswers()

    expect(onStoreChange).toHaveBeenCalledTimes(2)

    unsubscribe()
    storePlanningSetupAnswers('project-a', createAnswers())

    expect(onStoreChange).toHaveBeenCalledTimes(2)
  })
})
