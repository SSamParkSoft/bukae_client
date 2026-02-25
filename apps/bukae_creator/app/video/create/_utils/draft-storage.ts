'use client'

import { useVideoCreateStore } from '@/store/useVideoCreateStore'

const VIDEO_CREATE_STORAGE_KEY = 'bookae-video-create-storage'
const CURRENT_VIDEO_JOB_ID_KEY = 'currentVideoJobId'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * localStorage에 저장된 영상 제작 드래프트가 있는지 확인합니다.
 */
export function hasVideoCreateDraft(): boolean {
  if (typeof window === 'undefined') return false

  const persisted = localStorage.getItem(VIDEO_CREATE_STORAGE_KEY)
  const savedJobId = localStorage.getItem(CURRENT_VIDEO_JOB_ID_KEY)
  const hasSavedJobId = !!savedJobId && savedJobId.trim().length > 0
  if (!persisted) {
    // step 상태 없이 jobId만 남아있는 경우는 고아 데이터로 정리
    if (hasSavedJobId) {
      localStorage.removeItem(CURRENT_VIDEO_JOB_ID_KEY)
    }
    return false
  }

  try {
    const parsed = JSON.parse(persisted) as unknown
    if (!isObject(parsed) || !isObject(parsed.state)) {
      if (hasSavedJobId) {
        localStorage.removeItem(CURRENT_VIDEO_JOB_ID_KEY)
      }
      return false
    }

    const state = parsed.state
    const hasPersistedDraft =
      hasNonEmptyArray(state.selectedProducts) ||
      hasNonEmptyString(state.scriptStyle) ||
      hasNonEmptyArray(state.selectedImages) ||
      hasNonEmptyArray(state.scenes) ||
      isObject(state.timeline) ||
      hasNonEmptyString(state.videoTitle) ||
      hasNonEmptyString(state.videoDescription) ||
      hasNonEmptyArray(state.videoHashtags)

    if (hasPersistedDraft) {
      return true
    }

    // step 상태 없이 jobId만 남아있는 경우는 고아 데이터로 정리
    if (hasSavedJobId) {
      localStorage.removeItem(CURRENT_VIDEO_JOB_ID_KEY)
    }

    return false
  } catch {
    if (hasSavedJobId) {
      localStorage.removeItem(CURRENT_VIDEO_JOB_ID_KEY)
    }
    return false
  }
}

/**
 * 영상 제작 드래프트와 진행 중 jobId를 모두 초기화합니다.
 */
export function clearVideoCreateDraft(): void {
  useVideoCreateStore.getState().reset()

  // persist 저장소 정리
  useVideoCreateStore.persist.clearStorage()

  if (typeof window !== 'undefined') {
    localStorage.removeItem(CURRENT_VIDEO_JOB_ID_KEY)
  }
}
