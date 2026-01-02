'use client'

import { create } from 'zustand'
import type { SceneScript, TimelineData } from './useVideoCreateStore'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'

export interface SceneStructureInfo {
  index: number
  sceneId: number
  splitIndex?: number
  isSplit: boolean // splitIndex가 있는지 여부
  fullSubtitle: string // 전체 자막 (||| 구분자 포함)
  subtitleParts: string[] // 분할된 자막 배열
  hasSubtitleSegments: boolean // ||| 구분자가 있는지 여부
  groupStartIndex: number // 그룹의 시작 인덱스
  groupEndIndex: number // 그룹의 끝 인덱스
  groupSize: number // 그룹 내 씬 개수
  ttsDuration: number // TTS duration (초)
  hasTtsCache: boolean // TTS 캐시가 있는지 여부
}

export interface GroupInfo {
  sceneId: number
  indices: number[] // 그룹에 속한 씬 인덱스 배열 (splitIndex 순서로 정렬)
  firstSceneIndex: number // 그룹의 첫 번째 씬 인덱스
  lastSceneIndex: number // 그룹의 마지막 씬 인덱스
  size: number
  totalTtsDuration: number // 그룹 전체 TTS duration 합 (초)
  hasAllTtsCache: boolean // 모든 씬의 TTS 캐시가 있는지 여부
}

interface TtsCacheEntry {
  blob?: Blob
  durationSec: number
  markup: string
  url?: string | null
  sceneId?: number
  sceneIndex?: number
}

interface UpdateStructureParams {
  scenes: SceneScript[]
  timeline: TimelineData | null
  ttsCacheRef?: React.MutableRefObject<Map<string, TtsCacheEntry>>
  voiceTemplate?: string | null
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey?: (voiceName: string, markup: string) => string
}

interface SceneStructureState {
  sceneStructures: SceneStructureInfo[] // 인덱스별 구조 정보
  groups: Map<number, GroupInfo> // sceneId별 그룹 정보
  groupIndices: number[][] // 그룹별 인덱스 배열 (빠른 조회용)
  updateStructure: (params: UpdateStructureParams) => void
  getSceneStructure: (index: number) => SceneStructureInfo | undefined
  getGroupInfo: (sceneId: number) => GroupInfo | undefined
  getGroupIndices: (sceneId: number) => number[]
  isSceneInGroup: (index: number) => boolean
  getGroupSize: (sceneId: number) => number
  getSceneTtsDuration: (index: number) => number
  getGroupTtsDuration: (sceneId: number) => number
}

export const useSceneStructureStore = create<SceneStructureState>((set, get) => ({
  sceneStructures: [],
  groups: new Map(),
  groupIndices: [],

  updateStructure: ({
    scenes,
    timeline,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
  }: UpdateStructureParams) => {
    if (!timeline || scenes.length === 0) {
      set({
        sceneStructures: [],
        groups: new Map(),
        groupIndices: [],
      })
      return
    }

    // 1. sceneId별로 그룹화
    const sceneGroups = new Map<number, number[]>()
    scenes.forEach((scene, index) => {
      const sceneId = scene.sceneId
      if (!sceneGroups.has(sceneId)) {
        sceneGroups.set(sceneId, [])
      }
      sceneGroups.get(sceneId)!.push(index)
    })

    // 2. 각 그룹 내에서 splitIndex 순서로 정렬
    sceneGroups.forEach((indices) => {
      indices.sort((a, b) => {
        const aSplitIndex = scenes[a].splitIndex || 0
        const bSplitIndex = scenes[b].splitIndex || 0
        return aSplitIndex - bSplitIndex
      })
    })

    // 3. GroupInfo 생성 (TTS duration 포함)
    const groups = new Map<number, GroupInfo>()
    sceneGroups.forEach((indices, sceneId) => {
      // 그룹 전체 TTS duration 계산
      let totalTtsDuration = 0
      let hasAllTtsCache = true

      if (ttsCacheRef && voiceTemplate && buildSceneMarkup && makeTtsKey) {
        for (const sceneIndex of indices) {
          const markups = buildSceneMarkup(timeline, sceneIndex)
          let sceneTtsDuration = 0
          let sceneHasCache = true

          for (const markup of markups) {
            const key = makeTtsKey(voiceTemplate, markup)
            const cached = ttsCacheRef.current.get(key)
            if (cached && cached.durationSec > 0) {
              sceneTtsDuration += cached.durationSec
            } else {
              sceneHasCache = false
            }
          }

          totalTtsDuration += sceneTtsDuration
          if (!sceneHasCache) {
            hasAllTtsCache = false
          }
        }
      }

      groups.set(sceneId, {
        sceneId,
        indices: [...indices],
        firstSceneIndex: indices[0],
        lastSceneIndex: indices[indices.length - 1],
        size: indices.length,
        totalTtsDuration,
        hasAllTtsCache,
      })
    })

    // 4. SceneStructureInfo 생성 (TTS duration 포함)
    const sceneStructures: SceneStructureInfo[] = scenes.map((scene, index) => {
      const timelineScene = timeline.scenes[index]
      const fullSubtitle = timelineScene?.text?.content || scene.script || ''
      const subtitleParts = splitSubtitleByDelimiter(fullSubtitle)
      const hasSubtitleSegments = subtitleParts.length > 1

      const groupInfo = groups.get(scene.sceneId)
      const groupStartIndex = groupInfo?.firstSceneIndex ?? index
      const groupEndIndex = groupInfo?.lastSceneIndex ?? index
      const groupSize = groupInfo?.size ?? 1

      // 씬별 TTS duration 계산
      let ttsDuration = 0
      let hasTtsCache = false

      if (ttsCacheRef && voiceTemplate && buildSceneMarkup && makeTtsKey) {
        const markups = buildSceneMarkup(timeline, index)
        for (const markup of markups) {
          const key = makeTtsKey(voiceTemplate, markup)
          const cached = ttsCacheRef.current.get(key)
          if (cached && cached.durationSec > 0) {
            ttsDuration += cached.durationSec
            hasTtsCache = true
          }
        }
      }

      return {
        index,
        sceneId: scene.sceneId,
        splitIndex: scene.splitIndex,
        isSplit: scene.splitIndex !== undefined,
        fullSubtitle,
        subtitleParts,
        hasSubtitleSegments,
        groupStartIndex,
        groupEndIndex,
        groupSize,
        ttsDuration,
        hasTtsCache,
      }
    })

    // 5. groupIndices 배열 생성 (빠른 조회용)
    const groupIndices: number[][] = Array.from(groups.values()).map((group) => group.indices)

    set({
      sceneStructures,
      groups,
      groupIndices,
    })
  },

  getSceneStructure: (index: number) => {
    return get().sceneStructures[index]
  },

  getGroupInfo: (sceneId: number) => {
    return get().groups.get(sceneId)
  },

  getGroupIndices: (sceneId: number) => {
    return get().groups.get(sceneId)?.indices ?? []
  },

  isSceneInGroup: (index: number) => {
    const structure = get().sceneStructures[index]
    return structure ? structure.groupSize > 1 : false
  },

  getGroupSize: (sceneId: number) => {
    return get().groups.get(sceneId)?.size ?? 1
  },

  getSceneTtsDuration: (index: number) => {
    return get().sceneStructures[index]?.ttsDuration ?? 0
  },

  getGroupTtsDuration: (sceneId: number) => {
    return get().groups.get(sceneId)?.totalTtsDuration ?? 0
  },
}))

