/** 비디오 URL에서 메타데이터만 로드해 duration(초)을 반환. 실패 시 null */
export function getVideoDurationFromUrl(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'
    const onDone = (sec: number | null) => {
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
    video.src = url
  })
}
