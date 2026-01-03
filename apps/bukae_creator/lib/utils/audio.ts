/**
 * MP3 Blob의 duration을 초 단위로 가져옵니다.
 * 
 * @param blob MP3 Blob
 * @returns duration (초)
 */
export const getMp3DurationSec = async (blob: Blob): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(blob)
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    })
    audio.addEventListener('error', (e) => {
      URL.revokeObjectURL(url)
      reject(new Error(`오디오 로드 실패: ${e}`))
    })
    audio.src = url
  })
}

