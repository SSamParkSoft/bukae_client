'use client'

import { useCallback, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ProVideoEditSection } from '../components'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { authStorage } from '@/lib/api/auth-storage'
import { studioScriptApi } from '@/lib/api/studio-script'
import { convertProductToProductResponse } from '@/lib/utils/converters/product-to-response'
import {
  generateSceneId,
  proSceneToSceneScript,
  sceneScriptToProScene,
  type ProScene,
} from '../utils/types'
import { getEffectiveSourceDuration } from '@/app/video/create/pro/step3/utils/proPlaybackUtils'
import type { StudioScriptUserEditGuideResponseItem } from '@/lib/types/api/studio-script'

const DEFAULT_SCENE_COUNT = 6

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
  const {
    setHasUnsavedChanges,
    scenes: storeScenes,
    setScenes: setStoreScenes,
    selectedProducts,
    scriptStyle,
  } = useVideoCreateStore()
  
  // store의 scenes를 현재 형식으로 변환하여 사용
  const scenes: ProScene[] = 
    storeScenes && storeScenes.length > 0
      ? storeScenes.map((s, index) => sceneScriptToProScene(s, index))
      : Array.from({ length: DEFAULT_SCENE_COUNT }, () => ({ id: generateSceneId(), script: '' }))
  
  // store의 scenes가 비어있으면 기본값으로 초기화 (persist 복원 후에만)
  // edit 페이지에서는 기존 작업 내용을 보존해야 하므로 초기화하지 않음
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // storeScenes의 길이를 안정적인 dependency로 사용
  const storeScenesLength = storeScenes?.length ?? 0
  
  useEffect(() => {
    // 이미 초기화되었으면 실행하지 않음
    if (hasInitialized) return
    
    // persist 복원 대기 후 초기화 상태만 설정
    const timer = setTimeout(() => {
      // store에 데이터가 있으면 초기화 완료로 표시
      if (storeScenes && storeScenes.length > 0) {
        setHasInitialized(true)
        return
      }
      
      // store가 비어있어도 localStorage 확인
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('bookae-video-create-storage')
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            const savedScenes = parsed?.state?.scenes
            // localStorage에 저장된 scenes가 있으면 초기화하지 않고 그대로 사용
            if (savedScenes && Array.isArray(savedScenes) && savedScenes.length > 0) {
              setHasInitialized(true)
              return
            }
          } catch (e) {
            console.error('[Step2 Edit] 캐싱 데이터 파싱 실패:', e)
          }
        } else {
        }
      }
      
      // 정말로 비어있을 때만 초기화 완료 표시
      setHasInitialized(true)
    }, 300) // persist 복원 대기 시간을 조금 더 길게
    
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeScenesLength])
  
  // scenes 업데이트 함수 - store에 직접 저장
  const updateScenes = useCallback((updater: (prev: ProScene[]) => ProScene[]) => {
    // 최신 상태를 가져와서 업데이트
    const currentStoreScenes = useVideoCreateStore.getState().scenes
    const currentScenes: ProScene[] = currentStoreScenes && currentStoreScenes.length > 0
      ? currentStoreScenes.map((s: SceneScript, index: number) => sceneScriptToProScene(s, index))
      : Array.from({ length: DEFAULT_SCENE_COUNT }, () => ({ id: generateSceneId(), script: '' }))
    
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
  }, [setStoreScenes, setHasUnsavedChanges])

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

  const handleVideoUpload = useCallback(async (index: number, file: File) => {
    const accessToken = authStorage.getAccessToken()
    if (!accessToken) {
      alert('로그인이 필요합니다.')
      return
    }

    setUploadingSceneIndex(index)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sceneId', scenes[index]?.id || String(index + 1))

      const response = await fetch('/api/videos/pro/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '영상 업로드 실패' }))
        throw new Error(errorData.error || '영상 업로드 실패')
      }

      const result = await response.json()
      if (!result.success || !result.url) {
        throw new Error('업로드된 영상 URL을 가져올 수 없습니다.')
      }

      // 업로드된 영상 URL을 store에 저장
      updateScenes((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], videoUrl: result.url }
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
                  selectionEndSeconds: Math.min(
                    ttsDuration,
                    getEffectiveSourceDuration(ttsDuration, durationSec)
                  ),
                }
              : {}),
          }
          return next
        })
      }
    } catch (error) {
      console.error('영상 업로드 오류:', error)
      alert(error instanceof Error ? error.message : '영상 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingSceneIndex(null)
    }
  }, [scenes, updateScenes])

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

  const handleAiScriptClick = useCallback((index: number) => {
    // TODO: 개별 씬 AI 스크립트 생성 로직 구현
  }, [])

  const handleAiGuideClick = useCallback((index: number) => {
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

  // 두 번째 화면용 scenes 데이터 (TTS duration 포함)
  const videoEditScenes = scenes.map((scene) => ({
    id: scene.id,
    script: scene.script,
    ttsDuration: scene.ttsDuration || 10, // 실제 TTS duration 값 사용 (없으면 기본값 10초)
    guideText: scene.actionGuide ?? '', // 촬영가이드(액션 가이드) - store에 저장
    voiceLabel: scene.voiceLabel, // 적용된 보이스 라벨
    videoUrl: scene.videoUrl, // 업로드된 영상 URL
    selectionStartSeconds: scene.selectionStartSeconds, // 격자 선택 영역 시작 시간
    selectionEndSeconds: scene.selectionEndSeconds, // 격자 선택 영역 끝 시간
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
                    className="font-bold bg-gradient-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.56px]"
                    style={{
                      fontSize: 'var(--font-size-28)',
                      lineHeight: 'var(--line-height-28-140)',
                    }}
                  >
                    STEP 2
                  </span>
                </div>
                <h1
                  className="text-center font-bold mb-2 bg-gradient-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.64px]"
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
                  <Link
                    href="/video/create/pro/step3"
                    className="flex-1 h-14 rounded-2xl bg-[#5e8790] text-white hover:bg-[#5e8790]/90 transition-all flex items-center justify-center gap-2 font-bold tracking-[-0.48px] shadow-(--shadow-card-default)"
                    style={{
                      fontSize: 'var(--font-size-24)',
                      lineHeight: '33.6px',
                    }}
                  >
                    다음 단계
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
