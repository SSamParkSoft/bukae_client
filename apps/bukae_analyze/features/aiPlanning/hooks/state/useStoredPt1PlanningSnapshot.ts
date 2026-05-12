'use client'

import { useEffect, useState } from 'react'
import {
  getStoredPt1PlanningSnapshot,
  type Pt1PlanningSnapshot,
} from '@/features/aiPlanning/lib/pt1PlanningSnapshotStorage'

interface StoredPt1PlanningSnapshotState {
  snapshot: Pt1PlanningSnapshot | null
  isLoaded: boolean
}

interface LocalPt1PlanningSnapshotState extends StoredPt1PlanningSnapshotState {
  projectId: string
}

function createLocalPt1PlanningSnapshotState(
  projectId: string,
  snapshot: Pt1PlanningSnapshot | null = null,
  isLoaded = false
): LocalPt1PlanningSnapshotState {
  return {
    projectId,
    snapshot,
    isLoaded,
  }
}

function isCurrentLocalPt1PlanningSnapshotState(
  state: LocalPt1PlanningSnapshotState,
  projectId: string
): boolean {
  return state.projectId === projectId
}

export function useStoredPt1PlanningSnapshot(
  projectId: string
): StoredPt1PlanningSnapshotState {
  const [localPt1SnapshotState, setLocalPt1SnapshotState] = useState<LocalPt1PlanningSnapshotState>(() => (
    createLocalPt1PlanningSnapshotState(projectId)
  ))

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLocalPt1SnapshotState(createLocalPt1PlanningSnapshotState(
        projectId,
        getStoredPt1PlanningSnapshot(projectId),
        true
      ))
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [projectId])

  if (!isCurrentLocalPt1PlanningSnapshotState(localPt1SnapshotState, projectId)) {
    return {
      snapshot: null,
      isLoaded: false,
    }
  }

  return {
    snapshot: localPt1SnapshotState.snapshot,
    isLoaded: localPt1SnapshotState.isLoaded,
  }
}
