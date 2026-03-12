import { useState, useCallback } from 'react'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { api, ApiError, getLocalApiUrl } from '@/lib/api/client'
import { authStorage } from '@/lib/api/auth-storage'
import { compressVideoIfNeeded, COMPRESS_THRESHOLD_BYTES } from '@/lib/video/compressVideoInBrowser'
import { getVideoDurationFromUrl } from '@/lib/video/videoDurationUtils'
import type { SceneScript } from '@/lib/types/domain/script'

type StoreSceneExtended = SceneScript & {
  id?: string
  videoUrl?: string | null
  imageUrl?: string
  ttsDuration?: number
  originalVideoDurationSeconds?: number
  selectionStartSeconds?: number
  selectionEndSeconds?: number
}

export function useSceneMediaUpload() {
  const { setScenes } = useVideoCreateStore()
  const [uploadingSceneIndex, setUploadingSceneIndex] = useState<number | null>(null)
  const [compressingSceneIndex, setCompressingSceneIndex] = useState<number | null>(null)

  const handleVideoUpload = useCallback(
    async (sceneIndex: number, file: File) => {
      const accessToken = authStorage.getAccessToken()
      if (!accessToken) {
        alert('로그인이 필요합니다.')
        return
      }

      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      if (!isImage && !isVideo) {
        throw new Error(`지원하지 않는 파일 형식입니다: ${file.type}`)
      }

      setUploadingSceneIndex(sceneIndex)

      try {
        const scenes = useVideoCreateStore.getState().scenes
        const sceneId = (scenes[sceneIndex] as SceneScript & { id?: string })?.id ?? String(sceneIndex + 1)

        if (isImage) {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('sceneId', sceneId)

          const result = await api.postForm<{ success?: boolean; url?: string }>(
            getLocalApiUrl('/api/images/upload'),
            formData
          )
          if (!result?.success || !result?.url) {
            throw new Error('업로드된 이미지 URL을 가져올 수 없습니다.')
          }

          const next = [...scenes]
          const current = next[sceneIndex] as StoreSceneExtended
          const updated: StoreSceneExtended = {
            ...current,
            imageUrl: result.url,
            videoUrl: null,
            originalVideoDurationSeconds: undefined,
            selectionStartSeconds: undefined,
            selectionEndSeconds: undefined,
          }
          next[sceneIndex] = updated
          setScenes(next)
        } else {
          setCompressingSceneIndex(file.size > COMPRESS_THRESHOLD_BYTES ? sceneIndex : null)
          const fileToUpload = await compressVideoIfNeeded(file)

          const formData = new FormData()
          formData.append('file', fileToUpload)
          formData.append('sceneId', sceneId)

          const result = await api.postForm<{ success?: boolean; url?: string }>(
            getLocalApiUrl('/api/videos/pro/upload'),
            formData
          )
          if (!result?.success || !result?.url) {
            throw new Error('업로드된 영상 URL을 가져올 수 없습니다.')
          }

          const next = [...scenes]
          const current = next[sceneIndex] as StoreSceneExtended
          const updated: StoreSceneExtended = {
            ...current,
            videoUrl: result.url,
            imageUrl: undefined,
          }
          next[sceneIndex] = updated
          setScenes(next)

          const ttsDuration = current.ttsDuration
          const durationSec = await getVideoDurationFromUrl(result.url)
          if (durationSec != null && Number.isFinite(durationSec)) {
            const scenesAfter = useVideoCreateStore.getState().scenes
            const nextAfter = [...scenesAfter]
            const scene = nextAfter[sceneIndex] as StoreSceneExtended
            const updatedAfter: StoreSceneExtended = {
              ...scene,
              originalVideoDurationSeconds: durationSec,
              ...(typeof ttsDuration === 'number' &&
              ttsDuration > 0 &&
              durationSec < ttsDuration
                ? { selectionStartSeconds: 0, selectionEndSeconds: durationSec }
                : {}),
            }
            nextAfter[sceneIndex] = updatedAfter
            setScenes(nextAfter)
          }
        }
      } catch (error) {
        console.error('미디어 업로드 오류:', error)
        let message = '미디어 업로드 중 오류가 발생했습니다.'
        if (error instanceof ApiError) {
          message =
            error.status === 413
              ? '영상 파일이 서버 허용 크기를 초과했습니다. 더 작은 파일(권장: 100MB 이하)을 사용해 주세요.'
              : error.message
        } else if (error instanceof Error) {
          message = error.message
        }
        alert(message)
      } finally {
        setUploadingSceneIndex(null)
        setCompressingSceneIndex(null)
      }
    },
    [setScenes]
  )

  return { uploadingSceneIndex, compressingSceneIndex, handleVideoUpload }
}
