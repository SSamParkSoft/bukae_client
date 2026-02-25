'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage } from '@/lib/api/auth-storage'
import { createTransitionMap } from '@/lib/utils/video-export'
import { getFontFileName, SUBTITLE_DEFAULT_FONT_ID } from '@/lib/subtitle-fonts'
import { bgmTemplates, getBgmTemplateUrlSync } from '@/lib/data/templates'
import { getSoundEffectStorageUrl } from '@/lib/utils/supabase-storage'
import { getSubtitlePosition } from '../renderer/utils/getSubtitlePosition'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'

interface UseProVideoExportParams {
  /** Pro step3 씬 목록 (videoUrl, selection, ttsDuration, ttsAudioBase64 포함) */
  proStep3Scenes: ProStep3Scene[]
  /** 타임라인 (자막/전환/폰트 등) */
  timeline: TimelineData | null
  videoTitle: string
  videoDescription: string
  bgmTemplate: string | null
  subtitleFont: string | null
  selectedProducts: Array<{ id: string; name: string; price: number; image: string; platform: string; url: string }>
}

/**
 * Pro 트랙 전용 비디오 내보내기 hook.
 * Fast와 동일한 API(/api/videos/generate)를 사용하며, 씬별 비디오 URL + TTS 업로드 후 인코딩 요청을 보내고 step4로 이동합니다.
 */
export function useProVideoExport({
  proStep3Scenes,
  timeline,
  videoTitle,
  videoDescription,
  bgmTemplate,
  subtitleFont,
  selectedProducts,
}: UseProVideoExportParams) {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (isExporting) return
    if (!timeline || !timeline.scenes.length) {
      alert('타임라인 데이터가 없어요.')
      return
    }
    if (proStep3Scenes.length === 0) {
      alert('내보낼 씬이 없어요.')
      return
    }

    setIsExporting(true)
    try {
      const accessToken = authStorage.getAccessToken()
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.')
      }

      const [width, height] = timeline.resolution.split('x').map(Number)
      const jobId = crypto.randomUUID()
      const clientRequestId = crypto.randomUUID()

      // 1. 씬별 TTS 업로드 (ttsAudioBase64 -> Blob -> /api/media/upload)
      const ttsUrls: (string | null)[] = []
      for (let index = 0; index < proStep3Scenes.length; index++) {
        const scene = proStep3Scenes[index]
        const base64 = (scene as ProStep3Scene & { ttsAudioBase64?: string }).ttsAudioBase64
        if (!base64) {
          ttsUrls.push(null)
          continue
        }
        try {
          const binary = atob(base64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          const blob = new Blob([bytes], { type: 'audio/mpeg' })
          const formData = new FormData()
          formData.append('file', blob, `scene_${index}_part1.mp3`)
          formData.append('sceneIndex', String(index))
          formData.append('partIndex', '0')
          formData.append('sceneId', String(timeline.scenes[index]?.sceneId ?? index))

          const uploadRes = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
          })
          if (!uploadRes.ok) {
            ttsUrls.push(null)
            continue
          }
          const uploadData = await uploadRes.json()
          ttsUrls.push(uploadData.url ?? null)
        } catch {
          ttsUrls.push(null)
        }
      }

      // 2. 씬별 보이스/비디오 URL 검증
      for (let i = 0; i < proStep3Scenes.length; i++) {
        const scene = proStep3Scenes[i]
        if (!scene.videoUrl?.trim()) {
          throw new Error(`씬 ${i + 1}에 영상이 없습니다.`)
        }
      }
      const scenesWithoutVoice: number[] = []
      for (let i = 0; i < proStep3Scenes.length; i++) {
        const scene = proStep3Scenes[i]
        if (!scene) {
          scenesWithoutVoice.push(i + 1)
          continue
        }

        const ttsUrl = ttsUrls[i]
        const uploadedTtsUrl = typeof ttsUrl === 'string' ? ttsUrl.trim() : ''
        const hasUploadedTtsUrl = uploadedTtsUrl.length > 0
        const ttsAudioBase64 = typeof scene.ttsAudioBase64 === 'string' ? scene.ttsAudioBase64.trim() : ''
        const hasTtsAudioBase64 = ttsAudioBase64.length > 0

        if (!hasUploadedTtsUrl || !hasTtsAudioBase64) {
          scenesWithoutVoice.push(i + 1)
        }
      }
      if (scenesWithoutVoice.length > 0) {
        throw new Error(`씬 ${scenesWithoutVoice.join(', ')}에 음성이 없습니다. TTS를 먼저 생성해주세요.`)
      }

      const firstProduct = selectedProducts[0]
      const bgmTemplateObj = bgmTemplate ? bgmTemplates.find((t) => t.id === bgmTemplate) : null
      const bgmUrl = bgmTemplateObj ? getBgmTemplateUrlSync(bgmTemplateObj) : null

      // 3. Pro 전용: video 레이어 형식으로 encodingScenes 생성 (백엔드는 image가 아닌 video 필드 사용)
      const encodingScenes: Array<{
        sceneId: number
        order: number
        duration: number
        transition: Record<string, unknown>
        video: {
          url: string
          fit: string
          loop: boolean
          mute: boolean
          trimStart: number
          trimEnd: number
          transform: {
            x: number
            y: number
            width: number
            height: number
            scaleX: number
            scaleY: number
            rotation: number
            anchor: { x: number; y: number }
          }
        }
        text: unknown
        voice: unknown
        soundEffect: unknown
      }> = []

      for (let index = 0; index < proStep3Scenes.length; index++) {
        const scene = proStep3Scenes[index]
        const tlScene = timeline.scenes[index]
        const selectionDuration = scene.selectionEndSeconds - scene.selectionStartSeconds
        const duration = scene.ttsDuration ?? (selectionDuration > 0 ? selectionDuration : 2.5)
        const transitionType = tlScene?.transition ?? 'none'
        const transition = createTransitionMap(transitionType, tlScene?.transitionDuration ?? 0.5)

        const sceneFontId = tlScene?.text?.font ?? subtitleFont ?? SUBTITLE_DEFAULT_FONT_ID
        const sceneFontWeight = tlScene?.text?.fontWeight ?? 700
        const fontSize = tlScene?.text?.fontSize ?? 80
        const fontFileName = getFontFileName(sceneFontId, sceneFontWeight) ?? 'NanumGothic-Regular'

        const soundEffectPath = tlScene?.soundEffect ?? null
        const soundEffectUrl = soundEffectPath
          ? getSoundEffectStorageUrl(soundEffectPath) ?? `/sound-effects/${soundEffectPath}`
          : null

        const subtitlePosition = tlScene
          ? getSubtitlePosition(tlScene, { width, height })
          : {
              x: width * 0.5,
              y: height * 0.75,
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
            }
        const textTransform = tlScene?.text?.transform ?? {
          x: subtitlePosition.x,
          y: subtitlePosition.y,
          width: width * 0.75,
          height: height * 0.07,
          scaleX: subtitlePosition.scaleX ?? 1,
          scaleY: subtitlePosition.scaleY ?? 1,
          rotation: subtitlePosition.rotation ?? 0,
          anchor: { x: 0.5, y: 0.5 },
        }

        encodingScenes.push({
          sceneId: index + 1,
          order: index,
          duration: Math.max(0.1, duration),
          transition,
          video: {
            url: scene.videoUrl!,
            fit: tlScene?.imageFit ?? 'contain',
            loop: true,
            mute: true,
            trimStart: scene.selectionStartSeconds ?? 0,
            trimEnd: scene.selectionEndSeconds ?? duration,
            transform: {
              x: width / 2,
              y: height / 2,
              width,
              height,
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
              anchor: { x: 0.5, y: 0.5 },
            },
          },
          text: {
            content: (scene.script || tlScene?.text?.content || ' ').trim() || ' ',
            visible: true,
            font: {
              family: fontFileName,
              size: fontSize,
              weight: String(sceneFontWeight),
              style: tlScene?.text?.style?.italic ? 'italic' : 'normal',
            },
            color: tlScene?.text?.color ?? '#FFFFFF',
            stroke: {
              enabled: true,
              color: tlScene?.text?.stroke?.color ?? '#000000',
              width: tlScene?.text?.stroke?.width ?? 10,
            },
            shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
            decoration: {
              underline: tlScene?.text?.style?.underline ?? false,
              italic: tlScene?.text?.style?.italic ?? false,
            },
            alignment: tlScene?.text?.position ?? 'center',
            transform: {
              ...textTransform,
              anchor: { x: 0.5, y: 0.5 },
            },
          },
          voice: {
            enabled: !!ttsUrls[index],
            url: ttsUrls[index] ?? null,
            text: (scene.script || tlScene?.text?.content || ' ').trim() || ' ',
            startTime: 0,
          },
          soundEffect: {
            enabled: !!soundEffectPath,
            filename: soundEffectPath,
            url: soundEffectUrl,
            startTime: 0,
            volume: 0.4,
          },
        })
      }

      const encodingRequest = {
        videoId: jobId,
        videoTitle: videoTitle || '제목 없음',
        description: videoDescription || '',
        sequence: 1,
        renderSettings: {
          resolution: { width, height },
          fps: timeline.fps,
          playbackSpeed: timeline.playbackSpeed ?? 1,
          outputFormat: 'mp4',
          codec: 'libx264',
          bitrate: '8M',
          backgroundColor: '#000000',
        },
        audio: {
          bgm: {
            enabled: !!bgmTemplate,
            templateId: bgmTemplate ?? null,
            url: bgmUrl ?? null,
            volume: 1,
            fadeIn: 2,
            fadeOut: 2,
          },
          voice: {
            enabled: true,
            templateId: null,
            volume: 1,
          },
        },
        scenes: encodingScenes,
        metadata: firstProduct
          ? {
              productName: firstProduct.name || '상품명 없음',
              productImage: firstProduct.image || '',
              productUrl: firstProduct.url || '',
              platform: firstProduct.platform || 'coupang',
              mallType: firstProduct.platform || 'coupang',
              originalUrl: firstProduct.url || 'https://www.coupang.com',
            }
          : {
              productName: '상품명 없음',
              productImage: '',
              productUrl: 'https://www.coupang.com',
              platform: 'coupang',
              mallType: 'coupang',
              originalUrl: 'https://www.coupang.com',
            },
      }

      const exportPayload = {
        jobType: 'AUTO_CREATE_VIDEO_FROM_DATA',
        clientRequestId,
        encodingRequest,
      }

      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(exportPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `영상 생성 실패 (${response.status})`
        throw new Error(errorMessage)
      }

      const result = await response.json()
      setIsExporting(false)
      if (result.jobId) {
        router.push(`/video/create/pro/step4?jobId=${result.jobId}`)
      } else {
        alert('영상 생성이 시작되었어요. 완료되면 알림을 받으실 수 있어요.')
      }
    } catch (error) {
      setIsExporting(false)
      alert(`영상 생성 중 오류가 발생했어요: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }, [
    isExporting,
    proStep3Scenes,
    timeline,
    videoTitle,
    videoDescription,
    bgmTemplate,
    subtitleFont,
    selectedProducts,
    router,
  ])

  return { isExporting, handleExport }
}
