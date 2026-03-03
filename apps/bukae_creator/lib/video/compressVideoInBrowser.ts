/**
 * 브라우저에서 FFmpeg.wasm으로 영상을 압축합니다.
 * 서버에서는 실행되지 않으며, 업로드 전 큰 파일을 줄일 때만 사용합니다.
 */

const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
const INPUT_NAME = 'input'
const OUTPUT_NAME = 'output.mp4'

/** 압축 후에도 원본보다 크면 원본을 반환하기 위한 최소 비율 (예: 0.95 = 95% 이하만 사용) */
const MAX_SIZE_RATIO = 1.0

export class CompressVideoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompressVideoError'
  }
}

/**
 * 파일 확장자에 맞는 입력 파일명 반환 (FFmpeg가 인식하도록)
 */
function getInputName(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
  const safe = ['mp4', 'mov', 'avi', 'webm'].includes(ext) ? ext : 'mp4'
  return `${INPUT_NAME}.${safe}`
}

/**
 * 브라우저 환경에서만 영상을 압축합니다.
 * 720p, H.264 CRF 28, AAC 128k, faststart 적용.
 * 서버(SSR)에서는 파일을 그대로 반환합니다.
 *
 * @param file - 원본 영상 파일
 * @returns 압축된 영상 파일 (실패 시 또는 서버에서는 원본 반환)
 */
export async function compressVideoInBrowser(file: File): Promise<File> {
  if (typeof window === 'undefined') {
    return file
  }

  try {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util')

    const ffmpeg = new FFmpeg()

    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    const inName = getInputName(file)
    await ffmpeg.writeFile(inName, await fetchFile(file))

    // 720p, H.264 CRF 28, AAC 128k, faststart (웹 재생 최적화)
    await ffmpeg.exec([
      '-i', inName,
      '-vf', 'scale=-2:720',
      '-c:v', 'libx264',
      '-crf', '28',
      '-preset', 'fast',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      OUTPUT_NAME,
    ])

    const data = await ffmpeg.readFile(OUTPUT_NAME)
    // FileData(Uint8Array<ArrayBufferLike>)를 BlobPart 호환으로 복사 (빌드 타입 호환)
    const bytes = new Uint8Array(data as Uint8Array)
    const blob = new Blob([bytes], { type: 'video/mp4' })

    // 압축 결과가 원본보다 크면 원본 사용
    if (blob.size > file.size * MAX_SIZE_RATIO) {
      return file
    }

    const outName = file.name.replace(/\.[^.]+$/i, '.mp4')
    return new File([blob], outName, { type: 'video/mp4' })
  } catch (err) {
    console.warn('[compressVideoInBrowser] 압축 실패, 원본으로 업로드:', err)
    return file
  }
}

/** 이 크기(바이트)를 넘으면 업로드 전 압축 시도 (예: 4MB) */
export const COMPRESS_THRESHOLD_BYTES = 4 * 1024 * 1024

/**
 * 파일이 임계값보다 크면 압축 후 반환, 아니면 그대로 반환.
 */
export async function compressVideoIfNeeded(file: File): Promise<File> {
  if (typeof window === 'undefined' || file.size <= COMPRESS_THRESHOLD_BYTES) {
    return file
  }
  return compressVideoInBrowser(file)
}
