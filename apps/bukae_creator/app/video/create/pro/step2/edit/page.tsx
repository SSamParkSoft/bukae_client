'use client'

import { useCallback, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ProVideoEditSection } from '../components'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { useVideoCreateStoreHydration } from '@/store/useVideoCreateStoreHydration'
import { api, ApiError } from '@/lib/api/client'
import { authStorage } from '@/lib/api/auth-storage'
import { studioScriptApi } from '@/lib/api/studio-script'
import { convertProductToProductResponse } from '@/lib/utils/converters/product-to-response'
import {
  generateSceneId,
  proSceneToSceneScript,
  sceneScriptToProScene,
  type ProScene,
} from '../utils/types'
import { normalizeSelectionRange } from '@/app/video/create/pro/step3/utils/proPlaybackUtils'
import { compressVideoIfNeeded, COMPRESS_THRESHOLD_BYTES } from '@/lib/video/compressVideoInBrowser'
import type { StudioScriptUserEditGuideResponseItem } from '@/lib/types/api/studio-script'

const DEFAULT_SCENE_COUNT = 6

function getLocalApiUrl(path: string): string {
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

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

export default function ProStep2EditPage() {
  const router = useRouter()
  const {
    setHasUnsavedChanges,
    scenes: storeScenes,
    setScenes: setStoreScenes,
    selectedProducts,
    scriptStyle,
  } = useVideoCreateStore()
  const isStoreHydrated = useVideoCreateStoreHydration()
  const storeScenesLength = storeScenes?.length ?? 0
  const [fallbackScenes] = useState<ProScene[]>(() =>
    Array.from({ length: DEFAULT_SCENE_COUNT }, () => ({ id: generateSceneId(), script: '' }))
  )

  // store의 scenes를 현재 형식으로 변환하여 사용 (hydration 전에는 기본값 렌더링 금지)
  const scenes: ProScene[] = useMemo(
    () =>
      !isStoreHydrated
        ? []
        : storeScenesLength > 0
          ? storeScenes.map((s, index) => sceneScriptToProScene(s, index))
          : fallbackScenes,
    [fallbackScenes, isStoreHydrated, storeScenes, storeScenesLength]
  )

  // persist 복원 완료 후 store가 비어있을 때만 기본 씬 초기화
  useEffect(() => {
    if (!isStoreHydrated || storeScenesLength > 0) {
      return
    }

    const defaultScenes = fallbackScenes.map((scene, index) => proSceneToSceneScript(scene, index))
    setStoreScenes(defaultScenes)
    setHasUnsavedChanges(true)
  }, [fallbackScenes, isStoreHydrated, setHasUnsavedChanges, setStoreScenes, storeScenesLength])
  
  // scenes 업데이트 함수 - store에 직접 저장
  const updateScenes = useCallback((updater: (prev: ProScene[]) => ProScene[]) => {
    // 최신 상태를 가져와서 업데이트
    const currentStoreScenes = useVideoCreateStore.getState().scenes
    const currentScenes: ProScene[] = currentStoreScenes && currentStoreScenes.length > 0
      ? currentStoreScenes.map((s: SceneScript, index: number) => sceneScriptToProScene(s, index))
      : fallbackScenes
    
    const updated = updater(currentScenes)
    
    // store에 저장 (localStorage에 자동 저장됨)
    const scenesToSave = updated.map((s: ProScene, index: number) => proSceneToSceneScript(s, index))
    
    // 상태 변경 전에 autoSaveEnabled 확인 및 설정
    const store = useVideoCreateStore.getState()
    if (!store.autoSaveEnabled) {
      useVideoCreateStore.setState({ autoSaveEnabled: true })
    }
    
    setStoreScenes(scenesToSave)
    
    // 강제로 저장되도록 상태 업데이트
    setHasUnsavedChanges(true)
  }, [fallbackScenes, setStoreScenes, setHasUnsavedChanges])

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false)

  const handleScriptChange = useCallback((index: number, value: string) => {
    updateScenes((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], script: value }
      return next
    })
    // updateScenes 내부에서 이미 setHasUnsavedChanges를 호출하므로 중복 호출 제거
  }, [updateScenes])

  const handleGuideChange = useCallback(
    (index: number, value: string) => {
      updateScenes((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], actionGuide: value }
        return next
      })
    },
    [updateScenes]
  )

  const handleSelectionChange = useCallback((index: number, startSeconds: number, endSeconds: number) => {
    updateScenes((prev) => {
      const next = [...prev]
      const currentScene = next[index]
      // 기존 씬의 모든 필드를 유지하면서 selection만 업데이트
      next[index] = { 
        ...currentScene, 
        selectionStartSeconds: startSeconds,
        selectionEndSeconds: endSeconds,
      }
      
      return next
    })
  }, [updateScenes])

  const [uploadingSceneIndex, setUploadingSceneIndex] = useState<number | null>(null)
  const [compressingSceneIndex, setCompressingSceneIndex] = useState<number | null>(null)

  const handleVideoUpload = useCallback(async (index: number, file: File) => {
    const accessToken = authStorage.getAccessToken()
    if (!accessToken) {
      alert('로그인이 필요합니다.')
      return
    }

    // 파일 타입 확인 (이미지 vs 영상)
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      throw new Error(`지원하지 않는 파일 형식입니다: ${file.type}`)
    }

    setUploadingSceneIndex(index)

    try {
      if (isImage) {
        // 이미지 업로드
        const formData = new FormData()
        formData.append('file', file)
        formData.append('sceneId', scenes[index]?.id || String(index + 1))

        const result = await api.postForm<{ success?: boolean; url?: string }>(
          getLocalApiUrl('/api/images/upload'),
          formData
        )
        if (!result.success || !result.url) {
          throw new Error('업로드된 이미지 URL을 가져올 수 없습니다.')
        }

        // 업로드된 이미지 URL을 store에 저장하고, 이전 비디오 관련 필드를 초기화
        updateScenes((prev) => {
          const next = [...prev]
          next[index] = {
            ...next[index],
            imageUrl: result.url,
            // 이미지로 전환 시 비디오 관련 필드 초기화
            videoUrl: null,
            originalVideoDurationSeconds: undefined,
            selectionStartSeconds: undefined,
            selectionEndSeconds: undefined,
          }
          return next
        })

        // 이미지 처리 완료 - 영상 관련 로직은 건너뜀
        return
      } else {
        // 영상 업로드 로직 (기존 로직)
        setCompressingSceneIndex(file.size > COMPRESS_THRESHOLD_BYTES ? index : null)

        // 큰 파일은 업로드 전 브라우저에서 압축 (4MB 초과 시)
        const fileToUpload = await compressVideoIfNeeded(file)

        const formData = new FormData()
        formData.append('file', fileToUpload)
        formData.append('sceneId', scenes[index]?.id || String(index + 1))

        const result = await api.postForm<{ success?: boolean; url?: string }>(
          getLocalApiUrl('/api/videos/pro/upload'),
          formData
        )
        if (!result.success || !result.url) {
          throw new Error('업로드된 영상 URL을 가져올 수 없습니다.')
        }

        // 업로드된 영상 URL을 store에 저장하고, 이전 이미지 관련 필드를 초기화
        updateScenes((prev) => {
          const next = [...prev]
          next[index] = {
            ...next[index],
            videoUrl: result.url,
            // 비디오로 전환 시 이미지 필드 초기화
            imageUrl: null,
          }
          return next
        })

        // 원본 영상 길이를 로드해, 씬 duration(TTS)보다 짧으면 이어붙인 구간으로 선택 자동 설정
        const ttsDuration = scenes[index]?.ttsDuration
        const durationSec = await getVideoDurationFromUrl(result.url)
        if (durationSec != null && Number.isFinite(durationSec)) {
          updateScenes((prev) => {
            const next = [...prev]
            const scene = next[index]
            next[index] = {
              ...scene,
              originalVideoDurationSeconds: durationSec,
              ...(typeof ttsDuration === 'number' &&
              ttsDuration > 0 &&
              durationSec < ttsDuration
                ? {
                    selectionStartSeconds: 0,
                    selectionEndSeconds: durationSec,
                  }
                : {}),
            }
            return next
          })
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
  }, [updateScenes, scenes])

  const handleAiGuideGenerateAll = useCallback(async () => {
    const product = selectedProducts?.[0]
    if (!product) {
      alert('상품을 먼저 선택해주세요.')
      return
    }
    if (!scriptStyle) {
      alert('대본 스타일을 먼저 선택해주세요.')
      return
    }
    if (!scenes.length || scenes.every((s) => !s.script?.trim())) {
      alert('1단계에서 대본을 먼저 생성해주세요.')
      return
    }

    setIsGeneratingGuide(true)
    try {
      const productResponse = convertProductToProductResponse(product)
      const imageUrls = Array.isArray(product.images)
        ? product.images
        : product.image
          ? [product.image]
          : (productResponse.imageUrls ?? productResponse.imageURL ?? [])
      const productWithImages = {
        ...productResponse,
        productId: String(productResponse.productId ?? productResponse.id ?? ''),
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      }
      const previousScripts = scenes.map((s, i) => ({
        scene: i + 1,
        script: s.script || '',
        duration: s.ttsDuration ?? 0,
      }))

      const data = await studioScriptApi.generateGuideUserEdit({
        product: productWithImages,
        type: scriptStyle,
        previousScripts,
      })

      const list = Array.isArray(data)
        ? data
        : [data as StudioScriptUserEditGuideResponseItem]

      updateScenes((prev) => {
        return list.map((item, index) => {
          const existing = prev[index]
          return {
            ...existing,
            id: existing?.id ?? generateSceneId(),
            script: item.script?.trim() ?? existing?.script ?? '',
            actionGuide: item.actionGuide?.trim() ?? existing?.actionGuide ?? '',
            ttsDuration: typeof item.duration === 'number' ? item.duration : existing?.ttsDuration,
          }
        })
      })
    } catch (error) {
      console.error('촬영 가이드 생성 오류:', error)
      alert('촬영 가이드 생성 중 오류가 발생했어요.')
    } finally {
      setIsGeneratingGuide(false)
    }
  }, [selectedProducts, scriptStyle, scenes, updateScenes])

  const handleAiScriptClick = useCallback(() => {
    // TODO: 개별 씬 AI 스크립트 생성 로직 구현
  }, [])

  const handleAiGuideClick = useCallback(() => {
    // TODO: 개별 씬 AI 촬영가이드 생성 로직 구현
  }, [])

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (draggedIndex === null) return
    if (draggedIndex === index) return
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const position: 'before' | 'after' = offsetY < rect.height / 2 ? 'before' : 'after'
    setDragOver({ index, position })
  }, [draggedIndex])

  const handleDrop = useCallback((e?: React.DragEvent<HTMLDivElement>) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (draggedIndex === null || !dragOver) {
      setDraggedIndex(null)
      setDragOver(null)
      return
    }
    if (draggedIndex === dragOver.index) {
      setDraggedIndex(null)
      setDragOver(null)
      return
    }
    updateScenes((prev) => {
      const newScenes = [...prev]
      const [removed] = newScenes.splice(draggedIndex, 1)
      let targetIndex = dragOver.position === 'after' ? dragOver.index + 1 : dragOver.index
      if (draggedIndex < targetIndex) targetIndex -= 1
      newScenes.splice(targetIndex, 0, removed)
      return newScenes
    })
    // updateScenes 내부에서 이미 setHasUnsavedChanges를 호출하므로 중복 호출 제거
    setDraggedIndex(null)
    setDragOver(null)
  }, [draggedIndex, dragOver, updateScenes])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOver(null)
  }, [])

  // 다음 단계(step3) 이동 전:
  // 1) 누락된 원본 길이 메타데이터를 보강하고
  // 2) 씬별 selection range를 확장 소스 기준으로 정규화해서
  // 3) 어떤 상황에서도 같은 지점을 복원 가능하게 저장한다.
  const handleGoToStep3 = useCallback(async () => {
    const currentStoreScenes = useVideoCreateStore.getState().scenes
    const currentScenes: ProScene[] = currentStoreScenes?.length
      ? currentStoreScenes.map((s: SceneScript, i: number) => sceneScriptToProScene(s, i))
      : []

    const scenesWithResolvedOriginalDuration = await Promise.all(
      currentScenes.map(async (scene) => {
        if (!scene.videoUrl) {
          return scene
        }

        const hasOriginalDuration =
          typeof scene.originalVideoDurationSeconds === 'number' &&
          Number.isFinite(scene.originalVideoDurationSeconds) &&
          scene.originalVideoDurationSeconds > 0

        if (hasOriginalDuration) {
          return scene
        }

        const resolvedDuration = await getVideoDurationFromUrl(scene.videoUrl)
        if (!resolvedDuration || !Number.isFinite(resolvedDuration) || resolvedDuration <= 0) {
          return scene
        }

        return {
          ...scene,
          originalVideoDurationSeconds: resolvedDuration,
        }
      })
    )

    const normalized: ProScene[] = scenesWithResolvedOriginalDuration.map((scene) => {
      if (!scene.videoUrl) {
        return scene
      }

      const normalizedRange = normalizeSelectionRange({
        ttsDuration: scene.ttsDuration,
        originalVideoDurationSeconds: scene.originalVideoDurationSeconds,
        selectionStartSeconds: scene.selectionStartSeconds,
        selectionEndSeconds: scene.selectionEndSeconds,
      })

      return {
        ...scene,
        ttsDuration: normalizedRange.ttsDurationSeconds,
        selectionStartSeconds: normalizedRange.startSeconds,
        selectionEndSeconds: normalizedRange.endSeconds,
      }
    })

    const toSave = normalized.map((scene, index) => proSceneToSceneScript(scene, index))
    setStoreScenes(toSave)

    requestAnimationFrame(() => {
      router.push('/video/create/pro/step3')
    })
  }, [setStoreScenes, router])

  // 두 번째 화면용 scenes 데이터 (TTS duration 포함)
  const videoEditScenes = scenes.map((scene) => ({
    id: scene.id,
    script: scene.script,
    ttsDuration: scene.ttsDuration || 10, // 실제 TTS duration 값 사용 (없으면 기본값 10초)
    guideText: scene.actionGuide ?? '', // 촬영가이드(액션 가이드) - store에 저장
    voiceLabel: scene.voiceLabel, // 적용된 보이스 라벨
    videoUrl: scene.videoUrl, // 업로드된 영상 URL
    imageUrl: scene.imageUrl, // 업로드된 이미지 URL
    selectionStartSeconds: scene.selectionStartSeconds, // 격자 선택 영역 시작 시간
    selectionEndSeconds: scene.selectionEndSeconds, // 격자 선택 영역 끝 시간
    originalVideoDurationSeconds: scene.originalVideoDurationSeconds,
  }))


  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center"
      >
        <div className="flex w-full max-w-[1194px] mx-auto px-4 sm:px-6 pt-4 pb-8">
          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="max-w-5xl mx-auto">
              {/* Pro step2 헤더 */}
              <div className="mb-20 mt-[72px]">
                <div className="flex items-center justify-center mb-4">
                  <span
                    className="font-bold bg-linear-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.56px]"
                    style={{
                      fontSize: 'var(--font-size-28)',
                      lineHeight: 'var(--line-height-28-140)',
                    }}
                  >
                    STEP 2
                  </span>
                </div>
                <h1
                  className="text-center font-bold mb-2 bg-linear-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.64px]"
                  style={{
                    fontSize: 'var(--font-size-32)',
                    lineHeight: 'var(--line-height-32-140)',
                  }}
                >
                  어떻게 제작해볼까요?
                </h1>
                <p
                  className="text-center font-semibold text-brand-teal-dark tracking-[-0.36px] mt-4"
                  style={{
                    fontSize: 'var(--font-size-18)',
                    lineHeight: 'var(--line-height-18-140)',
                  }}
                >
                  AI 촬영가이드를 생성하고, 영상을 업로드 및 원하는 영상 편집을 입력해주세요.
                </p>
              </div>

              {/* 영상 업로드 & 편집 섹션 */}
              <section className="mb-10 space-y-8" data-pro-step2-video-edit>
                {/* 섹션 설명 (카드 바깥) */}
                <div className="space-y-2">
                  <h2
                    className="font-bold text-text-dark tracking-[-0.4px]"
                    style={{
                      fontSize: 'var(--font-size-24)',
                      lineHeight: 'var(--line-height-24-140)',
                    }}
                  >
                    촬영 가이드 생성 & 영상 업로드
                  </h2>
                  <p
                    className="font-semibold text-black tracking-[-0.32px]"
                    style={{
                      fontSize: 'var(--font-size-16)',
                      lineHeight: 'var(--line-height-16-140)',
                    }}
                  >
                    AI 촬영가이드를 생성하고, 영상을 업로드 및 원하는 영상 편집을 입력해주세요.
                  </p>
                </div>

                {/* 이전 단계와 동일한 느낌의 투명한 흰색 배경 컨테이너 */}
                <div className="rounded-2xl bg-white/40 border border-white/10 p-6 shadow-(--shadow-container)">
                  {/* 상단: AI 촬영가이드 생성 버튼이 가장 위에 오는 영역 + 씬 카드들 */}
                  <ProVideoEditSection
                    scenes={videoEditScenes}
                    onScriptChange={handleScriptChange}
                    onGuideChange={handleGuideChange}
                    onVideoUpload={handleVideoUpload}
                    onAiScriptClick={handleAiScriptClick}
                    onAiGuideClick={handleAiGuideClick}
                    onAiGuideGenerateAll={handleAiGuideGenerateAll}
                    isGeneratingGuide={isGeneratingGuide}
                    onSelectionChange={handleSelectionChange}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    draggedIndex={draggedIndex}
                    dragOver={dragOver}
                    uploadingSceneIndex={uploadingSceneIndex}
                    compressingSceneIndex={compressingSceneIndex}
                  />
                </div>

                {/* 하단: 이전/다음 단계 네비게이션 버튼 */}
                <div className="flex flex-col sm:flex-row gap-4 mt-12">
                  <Link
                    href="/video/create/pro/step2"
                    className="flex-1 h-14 rounded-2xl border-2 border-[#5e8790] text-[#5e8790] hover:bg-[#5e8790]/10 transition-all flex items-center justify-center gap-2 font-bold tracking-[-0.48px] shadow-(--shadow-card-default)"
                    style={{
                      fontSize: 'var(--font-size-24)',
                      lineHeight: '33.6px',
                    }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                    이전 단계
                  </Link>
                  <button
                    type="button"
                    onClick={handleGoToStep3}
                    className="flex-1 h-14 rounded-2xl bg-[#5e8790] text-white hover:bg-[#5e8790]/90 transition-all flex items-center justify-center gap-2 font-bold tracking-[-0.48px] shadow-(--shadow-card-default)"
                    style={{
                      fontSize: 'var(--font-size-24)',
                      lineHeight: '33.6px',
                    }}
                  >
                    다음 단계
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
