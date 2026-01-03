/**
 * 재생 관련 타입 정의
 */

import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { TimelineData, SceneScript } from '@/store/useVideoCreateStore'
import type { CommonRefs } from './common'
import type { RenderSceneContentOptions, RenderSceneImageOptions, RenderSubtitlePartOptions, PrepareImageAndSubtitleOptions } from './scene'

/**
 * TTS 구간 정보
 */
export interface TtsPart {
  blob: Blob
  durationSec: number
  url: string | null
  partIndex: number
  markup: string
}

/**
 * TTS 씬 결과
 */
export interface TtsSceneResult {
  sceneIndex: number
  parts: TtsPart[]
}

/**
 * TTS 생성 함수 타입
 */
export type EnsureSceneTtsFunction = (
  sceneIndex: number,
  signal?: AbortSignal,
  forceRegenerate?: boolean
) => Promise<TtsSceneResult>

/**
 * Full Playback 파라미터
 */
export interface UseFullPlaybackParams extends Partial<CommonRefs> {
  timeline: TimelineData | null
  voiceTemplate: string | null
  bgmTemplate: string | null
  playbackSpeed: number
  buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey: (voiceName: string, markup: string) => string
  ensureSceneTts?: EnsureSceneTtsFunction
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  setCurrentTime?: (time: number) => void
  setTimelineIsPlaying?: (playing: boolean) => void
  setIsPreparing?: (preparing: boolean) => void
  setIsTtsBootstrapping?: (bootstrapping: boolean) => void
  startBgmAudio: (templateId: string | null, speed: number, shouldPlay: boolean) => Promise<void>
  stopBgmAudio: () => void
  changedScenesRef: React.MutableRefObject<Set<number>>
  renderSceneContent: (
    sceneIndex: number,
    partIndex?: number | null,
    options?: RenderSceneContentOptions
  ) => void
  renderSceneImage?: (
    sceneIndex: number,
    options?: RenderSceneImageOptions
  ) => void
  renderSubtitlePart?: (
    sceneIndex: number,
    partIndex: number,
    options?: RenderSubtitlePartOptions
  ) => void
  prepareImageAndSubtitle?: (
    sceneIndex: number,
    partIndex?: number,
    options?: PrepareImageAndSubtitleOptions
  ) => void
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  getMp3DurationSec: (blob: Blob) => Promise<number>
  setTimeline: (timeline: TimelineData) => void
  disableAutoTimeUpdateRef?: React.MutableRefObject<boolean>
  currentTimeRef?: React.MutableRefObject<number>
  totalDuration?: number
  timelineBarRef?: React.RefObject<HTMLDivElement | null>
  activeAnimationsRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>
}

/**
 * Scene Navigation 파라미터
 */
export interface UseSceneNavigationParams extends Partial<CommonRefs> {
  timeline: TimelineData | null
  scenes: SceneScript[]
  currentSceneIndex: number
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  isManualSceneSelectRef: React.MutableRefObject<boolean>
  updateCurrentScene: (
    explicitPreviousIndex?: number | null,
    forceTransition?: string,
    onAnimationComplete?: (sceneIndex: number) => void,
    isPlaying?: boolean,
    partIndex?: number | null,
    sceneIndex?: number,
    overrideTransitionDuration?: number
  ) => void
  setTimeline: (timeline: TimelineData) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  isPreviewingTransition: boolean
  setIsPreviewingTransition: (previewing: boolean) => void
  setCurrentTime: (time: number) => void
  voiceTemplate: string | null
  playbackSpeed: number
  buildSceneMarkup: (sceneIndex: number) => string[]
  makeTtsKey: (voice: string, markup: string) => string
  isPlayingRef: React.MutableRefObject<boolean>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  appRef: React.RefObject<PIXI.Application | null>
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  loadAllScenes?: () => Promise<void>
  setSelectedPart?: (part: { sceneIndex: number; partIndex: number } | null) => void
  renderSceneContent?: (
    sceneIndex: number,
    partIndex?: number | null,
    options?: Omit<RenderSceneContentOptions, 'transitionDuration'>
  ) => void
  renderSceneImage?: (
    sceneIndex: number,
    options?: RenderSceneImageOptions
  ) => void
  renderSubtitlePart?: (
    sceneIndex: number,
    partIndex: number | null,
    options?: RenderSubtitlePartOptions
  ) => void
  prepareImageAndSubtitle?: (
    sceneIndex: number,
    partIndex?: number,
    options?: PrepareImageAndSubtitleOptions
  ) => void
}

/**
 * Group Playback 파라미터
 */
export interface UseGroupPlaybackParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey: (voiceName: string, markup: string) => string
  ensureSceneTts: EnsureSceneTtsFunction
  renderSceneContent: (
    sceneIndex: number,
    partIndex?: number | null,
    options?: RenderSceneContentOptions
  ) => void
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  setCurrentTime?: (time: number) => void
  setTimelineIsPlaying?: (playing: boolean) => void
  changedScenesRef: React.MutableRefObject<Set<number>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  getMp3DurationSec: (blob: Blob) => Promise<number>
  setTimeline: (timeline: TimelineData) => void
  disableAutoTimeUpdateRef?: React.MutableRefObject<boolean>
  currentTimeRef?: React.MutableRefObject<number>
  activeAnimationsRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>
}

/**
 * Single Scene Playback 파라미터
 */
export interface UseSingleScenePlaybackParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  playbackSpeed: number
  buildSceneMarkup: (sceneIndex: number) => string[]
  makeTtsKey: (voiceName: string, markup: string) => string
  ensureSceneTts: EnsureSceneTtsFunction
  renderSceneImage: (
    sceneIndex: number,
    options?: RenderSceneImageOptions
  ) => void
  renderSubtitlePart: (
    sceneIndex: number,
    partIndex: number,
    options?: RenderSubtitlePartOptions
  ) => void
  prepareImageAndSubtitle: (
    sceneIndex: number,
    partIndex?: number,
    options?: PrepareImageAndSubtitleOptions
  ) => void
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  setCurrentTime?: (time: number) => void
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  getMp3DurationSec: (blob: Blob) => Promise<number>
  setTimeline: (timeline: TimelineData) => void
  disableAutoTimeUpdateRef?: React.MutableRefObject<boolean>
  currentTimeRef?: React.MutableRefObject<number>
  activeAnimationsRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>
}

