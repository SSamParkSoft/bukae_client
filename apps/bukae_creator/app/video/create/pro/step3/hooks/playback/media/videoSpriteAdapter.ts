'use client'

export interface VideoSpriteAdapter {
  createElement: (videoUrl: string) => HTMLVideoElement
  waitForMetadata: (video: HTMLVideoElement | null, timeoutMs: number) => Promise<void>
  seekFrame: (video: HTMLVideoElement | null, targetTime: number, timeoutMs: number) => Promise<void>
}

function createElement(videoUrl: string): HTMLVideoElement {
  const video = document.createElement('video')
  video.src = videoUrl
  video.muted = true
  video.playsInline = true
  video.loop = false
  video.crossOrigin = 'anonymous'
  video.preload = 'metadata'
  video.style.display = 'none'
  return video
}

function waitForMetadata(video: HTMLVideoElement | null, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!video) {
      reject(new Error('비디오 요소가 null입니다'))
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('error', onError)
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const onLoadedMetadata = () => {
      cleanup()
      resolve()
    }

    const onError = () => {
      cleanup()
      reject(new Error('비디오 메타데이터 로드 실패'))
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('error', onError)

    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('비디오 메타데이터 로드 타임아웃'))
    }, timeoutMs)

    if (video.readyState >= 1) {
      onLoadedMetadata()
      return
    }

    video.load()
  })
}

function seekFrame(video: HTMLVideoElement | null, targetTime: number, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!video) {
      resolve()
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const onSeeked = () => {
      cleanup()
      requestAnimationFrame(() => {
        resolve()
      })
    }

    video.addEventListener('seeked', onSeeked)
    timeoutId = setTimeout(() => {
      cleanup()
      resolve()
    }, timeoutMs)

    video.pause()
    const clampedTime = Math.max(0, Math.min(targetTime, video.duration || targetTime))
    video.currentTime = clampedTime

    if (Math.abs(video.currentTime - clampedTime) < 0.05) {
      cleanup()
      requestAnimationFrame(() => {
        resolve()
      })
    }
  })
}

export const videoSpriteAdapter: VideoSpriteAdapter = {
  createElement,
  waitForMetadata,
  seekFrame,
}
