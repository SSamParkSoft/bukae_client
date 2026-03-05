export const DEFAULT_TRANSITION_START_BUFFER_SEC = 0.02

export interface TransitionFrameStateInput {
  hasTransitionEffect: boolean
  transitionDurationSec: number
  relativeTimeSec: number
  startBufferSec?: number
}

export interface TransitionFrameState {
  shouldTransition: boolean
  progress: number
  relativeTimeSec: number
}

export function getTransitionFrameState({
  hasTransitionEffect,
  transitionDurationSec,
  relativeTimeSec,
  startBufferSec = DEFAULT_TRANSITION_START_BUFFER_SEC,
}: TransitionFrameStateInput): TransitionFrameState {
  const safeRelativeTimeSec = Number.isFinite(relativeTimeSec) ? relativeTimeSec : 0
  const safeTransitionDurationSec =
    Number.isFinite(transitionDurationSec) && transitionDurationSec > 0
      ? transitionDurationSec
      : 0
  const safeStartBufferSec =
    Number.isFinite(startBufferSec) && startBufferSec >= 0
      ? startBufferSec
      : DEFAULT_TRANSITION_START_BUFFER_SEC

  if (!hasTransitionEffect || safeTransitionDurationSec <= 0) {
    return {
      shouldTransition: false,
      progress: 1,
      relativeTimeSec: safeRelativeTimeSec,
    }
  }

  const progress = Math.max(0, Math.min(1, safeRelativeTimeSec / safeTransitionDurationSec))
  const shouldTransition = safeRelativeTimeSec >= -safeStartBufferSec && progress < 1

  return {
    shouldTransition,
    progress,
    relativeTimeSec: safeRelativeTimeSec,
  }
}
