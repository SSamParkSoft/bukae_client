'use client'

import { motion } from 'framer-motion'
import { ProPreviewPanel } from './ui/ProPreviewPanel'
import { ProSceneListPanel } from './ui/ProSceneListPanel'
import { ProEffectsPanel } from './ui/ProEffectsPanel'
import { useVideoCreateStore, type TimelineData } from '@/store/useVideoCreateStore'
import { useCallback, useState } from 'react'
import { allTransitions, transitions, movements } from '@/lib/data/transitions'
import { ensureSceneArray, isValidSceneArray } from '@/app/video/create/_utils/scene-array'
import { getPlayableSegments, reorderByIndexOrder } from './utils'
import type { MotionConfig } from '@/hooks/video/effects/motion/types'
import {
  useProStep3Scenes,
  useProStep3SelectionChange,
  useProStep3State,
} from './hooks'
import type { SceneScript } from '@/lib/types/domain/script'
import { useTimelineInitializer } from '@/hooks/video/timeline/useTimelineInitializer'
import { useProVideoExport } from '@/hooks/video/export/useProVideoExport'
import { api, ApiError } from '@/lib/api/client'
import { authStorage } from '@/lib/api/auth-storage'
import { compressVideoIfNeeded, COMPRESS_THRESHOLD_BYTES } from '@/lib/video/compressVideoInBrowser'

/** 비디오 URL에서 메타데이터만 로드해 duration(초)을 반환. 실패 시 null */
function getVideoDurationFromUrl(url: string): Promise<number | null> {
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

type StoreSceneExtended = SceneScript & {
  id?: string
  videoUrl?: string | null
  imageUrl?: string
  ttsDuration?: number
  originalVideoDurationSeconds?: number
  selectionStartSeconds?: number
  selectionEndSeconds?: number
}

export default function ProStep3Page() {
  const { 
    scenes: storeScenes, 
    setScenes, 
    bgmTemplate, 
    setBgmTemplate,
    timeline,
    setTimeline,
    subtitleFont,
    subtitleColor,
    subtitlePosition,
    videoTitle,
    videoDescription,
    selectedProducts,
  } = useVideoCreateStore()
  
  // 현재 선택된 씬 인덱스
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingSceneIndex, setPlayingSceneIndex] = useState<number | null>(null)
  const [scenePlaybackRequest, setScenePlaybackRequest] = useState<{ sceneIndex: number; requestId: number } | null>(null)
  const [uploadingSceneIndex, setUploadingSceneIndex] = useState<number | null>(null)
  const [compressingSceneIndex, setCompressingSceneIndex] = useState<number | null>(null)

  // Pro step3 씬 데이터 변환 훅
  const { proStep3Scenes } = useProStep3Scenes()

  // Timeline 초기화 (씬에서 timeline 생성)
  useTimelineInitializer({
    scenes: storeScenes,
    selectedImages: [],
    subtitleFont: subtitleFont || null,
    subtitleColor: subtitleColor || null,
    subtitlePosition: subtitlePosition || null,
    timeline,
    setTimeline,
  })

  // 격자 선택 영역 변경 훅
  const { handleSelectionChange, handleOriginalVideoDurationLoaded } = useProStep3SelectionChange()

  const canStartPlayback = useCallback(() => {
    const playableScenes = getPlayableSegments(
      proStep3Scenes.map((scene) => ({
        ...scene,
        mediaUrl: scene.videoUrl,
      }))
    )

    if (playableScenes.length === 0) {
      alert('재생할 영상이 없습니다.')
      return false
    }
    return true
  }, [proStep3Scenes])

  const handlePlayingChange = useCallback((nextPlaying: boolean) => {
    setIsPlaying(nextPlaying)
    if (!nextPlaying) {
      setPlayingSceneIndex(null)
    }
  }, [])

  const handleScenePlaybackComplete = useCallback(() => {
    setPlayingSceneIndex(null)
  }, [])

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
            '/api/images/upload',
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
            '/api/videos/pro/upload',
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

  // 효과 패널 및 사운드 상태 관리 훅
  const {
    rightPanelTab,
    setRightPanelTab,
    confirmedBgmTemplate,
    soundEffect,
    setSoundEffect,
    confirmedSoundEffect,
    handleBgmConfirm,
    handleSoundEffectConfirm,
  } = useProStep3State()

  // Pro 인코딩 내보내기 (공통 API → step4 이동)
  const { isExporting, handleExport } = useProVideoExport({
    proStep3Scenes,
    timeline,
    videoTitle: videoTitle || '',
    videoDescription: videoDescription || '',
    bgmTemplate,
    subtitleFont,
    selectedProducts: selectedProducts ?? [],
  })

  // 현재 선택된 씬의 비디오 URL, 이미지 URL, 선택 영역
  const currentScene = proStep3Scenes[currentSceneIndex]
  const currentVideoUrl = currentScene?.videoUrl || null
  const currentImageUrl = currentScene?.imageUrl || null
  const currentSelectionStartSeconds = currentScene?.selectionStartSeconds || 0

  // 씬 선택 핸들러
  const handleSceneSelect = useCallback((index: number) => {
    setCurrentSceneIndex(index)
  }, [])

  const handleScenePlay = useCallback(async (sceneIndex: number) => {
    const targetScene = proStep3Scenes[sceneIndex]
    const videoUrl = targetScene?.videoUrl?.trim() || ''
    const imageUrl = targetScene?.imageUrl?.trim() || ''

    // 영상도 이미지도 없는 씬은 재생 불가
    if (!videoUrl && !imageUrl) {
      alert('재생할 영상/이미지가 없습니다.')
      return
    }

    setCurrentSceneIndex(sceneIndex)
    if (!isPlaying || playingSceneIndex !== sceneIndex) {
      setPlayingSceneIndex(sceneIndex)
    }
    setScenePlaybackRequest((prev) => ({
      sceneIndex,
      requestId: (prev?.requestId ?? 0) + 1,
    }))
  }, [isPlaying, playingSceneIndex, proStep3Scenes])

  // 씬 재정렬 핸들러
  const handleSceneReorder = useCallback(
    (newOrder: number[]) => {
      const safeScenes = ensureSceneArray<SceneScript>(storeScenes)
      if (!isValidSceneArray(safeScenes)) {
        return
      }
      const reordered = reorderByIndexOrder(safeScenes, newOrder)
      setScenes(reordered)
    },
    [setScenes, storeScenes]
  )

  // 전환 효과 변경 핸들러
  const handleTransitionChange = useCallback((sceneIndex: number, value: string) => {
    if (!timeline?.scenes?.[sceneIndex]) {
      return
    }

    const nextScenes = timeline.scenes.map((scene, index) => {
      if (index !== sceneIndex) {
        return scene
      }
      const hasTransitionEffect = value !== 'none'
      const nextTransitionDuration =
        value === 'none'
          ? 0
          : scene.transitionDuration && scene.transitionDuration > 0
            ? scene.transitionDuration
            : 0.5
      return {
        ...scene,
        transition: value,
        transitionDuration: nextTransitionDuration,
        // 정책: Pro에서도 전환/움직임 동시 사용 금지
        motion: hasTransitionEffect ? undefined : scene.motion,
      }
    })

    setTimeline({
      ...timeline,
      scenes: nextScenes,
    })
  }, [setTimeline, timeline])

  // 모션 변경 핸들러
  const handleMotionChange = useCallback((sceneIndex: number, motion: MotionConfig | null) => {
    if (!timeline?.scenes?.[sceneIndex]) {
      return
    }

    const nextScenes = timeline.scenes.map((scene, index) => {
      if (index !== sceneIndex) {
        return scene
      }
      const hasMotion = motion != null
      return {
        ...scene,
        motion: motion ?? undefined,
        // 정책: Pro에서도 전환/움직임 동시 사용 금지
        transition: hasMotion ? 'none' : scene.transition,
        transitionDuration: hasMotion ? 0 : scene.transitionDuration,
      }
    })

    setTimeline({
      ...timeline,
      scenes: nextScenes,
    })
  }, [setTimeline, timeline])

  // Timeline 설정 핸들러 (store의 setTimeline 사용)
  const handleSetTimeline = useCallback((newTimeline: TimelineData) => {
    setTimeline(newTimeline)
  }, [setTimeline])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 고정 80px 양옆 마진 + 최대 1760px 컨테이너 */}
      <div
        className="w-full h-full mx-auto"
        style={{ maxWidth: '1760px', paddingLeft: '80px', paddingRight: '80px' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col lg:flex-row h-full overflow-hidden w-full gap-4 lg:gap-3 xl:gap-4 2xl:gap-5"
        >
          {/* 왼쪽 패널: 미리보기 (Pro 전용 - 썸네일만 표시) */}
          <div className="w-full lg:w-[25%] min-w-[250px] flex flex-col overflow-hidden lg:h-full">
            <ProPreviewPanel
              currentVideoUrl={currentVideoUrl}
              currentImageUrl={currentImageUrl}
              currentSelectionStartSeconds={currentSelectionStartSeconds}
              currentSceneIndex={currentSceneIndex}
              scenes={proStep3Scenes}
              scenePlaybackRequest={scenePlaybackRequest}
              isPlaying={isPlaying}
              onBeforePlay={canStartPlayback}
              onPlayingChange={handlePlayingChange}
              onScenePlaybackComplete={handleScenePlaybackComplete}
              bgmTemplate={bgmTemplate}
              confirmedBgmTemplate={confirmedBgmTemplate}
              onExport={handleExport}
              isExporting={isExporting}
            />
          </div>

          {/* 중앙 패널: 씬 리스트 */}
          <div className="w-full lg:w-[45%] min-w-[480px] flex flex-col overflow-hidden lg:h-full shrink-0 lg:mr-2">
            <ProSceneListPanel
              theme="light"
              scenes={proStep3Scenes}
              timeline={timeline}
              currentSceneIndex={currentSceneIndex}
              playingSceneIndex={playingSceneIndex}
              isPreparing={false}
              isTtsBootstrapping={false}
              onSelect={handleSceneSelect}
              onReorder={handleSceneReorder}
              onPlayScene={handleScenePlay}
              onVideoUpload={handleVideoUpload}
              uploadingSceneIndex={uploadingSceneIndex}
              compressingSceneIndex={compressingSceneIndex}
              onOpenEffectPanel={(tab) => {
                setRightPanelTab(tab)
              }}
              onSelectionChange={handleSelectionChange}
              onOriginalVideoDurationLoaded={handleOriginalVideoDurationLoaded}
            />
          </div>

          {/* 오른쪽 패널: 효과 설정 */}
          <div className="w-full lg:w-[30%] min-w-[350px] flex flex-col overflow-hidden lg:h-full shrink-0">
            <ProEffectsPanel
              theme="light"
              rightPanelTab={rightPanelTab}
              setRightPanelTab={setRightPanelTab}
              timeline={timeline}
              currentSceneIndex={currentSceneIndex}
              allTransitions={allTransitions}
              transitions={transitions}
              movements={movements}
              onTransitionChange={handleTransitionChange}
              bgmTemplate={bgmTemplate}
              setBgmTemplate={setBgmTemplate}
              confirmedBgmTemplate={confirmedBgmTemplate}
              onBgmConfirm={handleBgmConfirm}
              soundEffect={soundEffect}
              setSoundEffect={setSoundEffect}
              confirmedSoundEffect={confirmedSoundEffect}
              onSoundEffectConfirm={handleSoundEffectConfirm}
              setTimeline={handleSetTimeline}
              onMotionChange={handleMotionChange}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
