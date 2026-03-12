const VIDEO_DURATION_TIMEOUT_MS = 10_000

/** 비디오 URL에서 메타데이터만 로드해 duration(초)을 반환. 실패 시 null */
export function getVideoDurationFromUrl(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'
    let settled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const onDone = (sec: number | null) => {
      if (settled) return
      settled = true
      if (timeoutId !== null) clearTimeout(timeoutId)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('error', onErr)
      video.src = ''
      resolve(sec)
    }
    const onMeta = () => {
      const d = video.duration
      onDone(Number.isFinite(d) && d > 0 ? d : null)
    }
    const onErr = () => onDone(null)
    video.addEventListener('loadedmetadata', onMeta, { once: true })
    video.addEventListener('error', onErr, { once: true })
    timeoutId = setTimeout(() => onDone(null), VIDEO_DURATION_TIMEOUT_MS)
    video.src = url
  })
}
