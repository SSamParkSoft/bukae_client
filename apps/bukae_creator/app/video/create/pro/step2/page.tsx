'use client'

import { useCallback, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { ScriptStyleSection, AiScriptGenerateButton } from '@/app/video/create/_components'
import { ProSceneCard } from './components/ProSceneCard'
import { conceptOptions } from '@/lib/data/templates'
import type { ConceptType } from '@/lib/data/templates'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { studioScriptApi } from '@/lib/api/studio-script'
import { authStorage } from '@/lib/api/auth-storage'
import { prefetchPublicVoices } from '@/lib/tts/public-voices-cache'
import { convertProductToProductResponse } from '@/lib/utils/converters/product-to-response'
import type { ProVoicePanelProps } from './components/ProVoicePanel'
import { synthesizeAllScenes } from './utils/synthesizeAllScenes'
import {
  generateSceneId,
  proSceneToSceneScript,
  sceneScriptToProScene,
  type ExtendedSceneScript,
  type ProScene,
} from './utils/types'

const DEFAULT_SCENE_COUNT = 6

const ProVoicePanel = dynamic<ProVoicePanelProps>(
  () => import('./components/ProVoicePanel').then((mod) => mod.ProVoicePanel),
  {
    ssr: false,
    loading: () => (
      <div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[min(calc(100vw-2rem),560px)] min-w-[360px] sm:w-[640px] sm:min-w-0 max-h-[85vh] flex items-center justify-center bg-white/40 border border-white/10 backdrop-blur-sm rounded-2xl p-6"
        style={{ boxShadow: 'var(--shadow-container)' }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-[#5e8790]" />
      </div>
    ),
  }
)

export default function ProStep2Page() {
  const router = useRouter()
  const { 
    scriptStyle, 
    setScriptStyle, 
    setHasUnsavedChanges,
    scenes: storeScenes,
    setScenes: setStoreScenes
  } = useVideoCreateStore()
  
  // store의 scenes를 현재 형식으로 변환하여 사용
  const scenes: ProScene[] = 
    storeScenes && storeScenes.length > 0
      ? storeScenes.map((s, index) => sceneScriptToProScene(s, index))
      : Array.from({ length: DEFAULT_SCENE_COUNT }, () => ({ id: generateSceneId(), script: '' }))
  
  // store의 scenes가 비어있으면 기본값으로 초기화 (persist 복원 후에만)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  useEffect(() => {
    // 마운트 후 일정 시간이 지난 후에만 초기화 (persist 복원 대기)
    const timer = setTimeout(() => {
      // persist가 복원된 후에만 실행
      if (!hasInitialized && (!storeScenes || storeScenes.length === 0)) {
        // localStorage에서 직접 확인하여 실제로 비어있는지 확인
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('bookae-video-create-storage')
          if (saved) {
            try {
              const parsed = JSON.parse(saved)
              const savedScenes = parsed?.state?.scenes
              // localStorage에 저장된 scenes가 있으면 초기화하지 않음
              if (savedScenes && Array.isArray(savedScenes) && savedScenes.length > 0) {
                setHasInitialized(true)
                return
              }
            } catch (e) {
              // 파싱 실패 시 무시
            }
          }
        }
        
        // 실제로 비어있을 때만 초기화
        const defaultScenes: ExtendedSceneScript[] = 
          Array.from({ length: DEFAULT_SCENE_COUNT }, (_, i) => ({ 
            sceneId: i + 1,
            id: generateSceneId(), // 고유 ID 생성
            script: '' 
          }))
        setStoreScenes(defaultScenes)
        setHasUnsavedChanges(true)
        setHasInitialized(true)
      } else if (storeScenes && storeScenes.length > 0) {
        // 이미 데이터가 있으면 초기화 완료로 표시
        setHasInitialized(true)
      }
    }, 200) // persist 복원 대기 시간
    
    return () => clearTimeout(timer)
  }, [storeScenes, hasInitialized, setStoreScenes, setHasUnsavedChanges])

  
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
  const { selectedImages, selectedProducts } = useVideoCreateStore()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)
  const [voicePanelOpen, setVoicePanelOpen] = useState(false)
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [isSynthesizingTts, setIsSynthesizingTts] = useState(false)
  const [ttsProgress, setTtsProgress] = useState({ completed: 0, total: 0 })

  useEffect(() => {
    const token = authStorage.getAccessToken()
    prefetchPublicVoices(token)
    void import('./components/ProVoicePanel')
  }, [])

  const handleScriptStyleSelect = useCallback(
    (concept: ConceptType) => {
      const isSameSelection = scriptStyle === concept
      if (isSameSelection) {
        setScriptStyle(null)
      } else {
        setScriptStyle(concept)
        setHasUnsavedChanges(true)
      }
    },
    [scriptStyle, setScriptStyle, setHasUnsavedChanges]
  )

  const handleScriptChange = useCallback((index: number, value: string) => {
    updateScenes((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], script: value }
      return next
    })
    // updateScenes 내부에서 이미 setHasUnsavedChanges를 호출하므로 중복 호출 제거
  }, [updateScenes])

  const handleSceneDelete = useCallback((index: number) => {
    updateScenes((prev) => prev.filter((_, i) => i !== index))
    // updateScenes 내부에서 이미 setHasUnsavedChanges를 호출하므로 중복 호출 제거
  }, [updateScenes])

  const handleGenerateAllScripts = useCallback(async () => {
    if (!scriptStyle) {
      alert('대본 스타일을 먼저 선택해주세요.')
      return
    }

    if (!selectedImages || selectedImages.length === 0) {
      alert('이미지를 먼저 선택해주세요.')
      return
    }

    setIsGeneratingAll(true)

    try {
      const product = selectedProducts[0]

      if (!product) {
        setIsGeneratingAll(false)
        alert('상품을 먼저 선택해주세요.')
        return
      }

      // Product를 ProductResponse 형태로 변환 (Pro 전용 API)
      const productResponse = convertProductToProductResponse(product)

      const data = await studioScriptApi.generateScriptsPro({
        product: productResponse,
        type: scriptStyle,
        imageUrls: selectedImages,
      })

      const items = Array.isArray(data) ? data : [data]

      // 응답 데이터를 scenes에 반영
      updateScenes((prev) => {
        const updated = prev.map((scene, index) => {
          const sceneData = items.find((item) => item.imageUrl === selectedImages[index]) || items[index]
          return {
            ...scene,
            script: sceneData?.script || scene.script || '생성된 대본이 없어요.',
          }
        })
        return updated
      })
      // updateScenes 내부에서 이미 setHasUnsavedChanges를 호출하므로 중복 호출 제거
    } catch (error) {
      console.error('대본 일괄 생성 오류:', error)
      alert('대본 일괄 생성 중 오류가 발생했어요.')
    } finally {
      setIsGeneratingAll(false)
    }
  }, [scriptStyle, selectedImages, selectedProducts, updateScenes, setHasUnsavedChanges])

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

  const handleVoiceButtonClick = useCallback((index: number) => {
    if (voicePanelOpen && selectedSceneIndex === index) {
      setVoicePanelOpen(false)
      setSelectedSceneIndex(null)
      return
    }
    setSelectedSceneIndex(index)
    setVoicePanelOpen(true)
  }, [voicePanelOpen, selectedSceneIndex])

  const handleVoiceSelect = useCallback((voiceTemplate: string | null, voiceLabel: string) => {
    if (selectedSceneIndex === null) {
      return
    }
    updateScenes((prev) => {
      const next = [...prev]
      next[selectedSceneIndex] = {
        ...next[selectedSceneIndex],
        voiceTemplate,
        voiceLabel,
      }
      return next
    })
    // updateScenes 내부에서 이미 setHasUnsavedChanges를 호출하므로 중복 호출 제거
    setVoicePanelOpen(false)
    setSelectedSceneIndex(null)
  }, [selectedSceneIndex, updateScenes])

  const handleVoiceSelectForAll = useCallback((voiceTemplate: string | null, voiceLabel: string) => {
    updateScenes((prev) => {
      const updated = prev.map((scene) => {
        const newScene = {
          ...scene,
          voiceTemplate,
          voiceLabel,
        }
        return newScene
      })
      return updated
    })
    setHasUnsavedChanges(true)
    setVoicePanelOpen(false)
    setSelectedSceneIndex(null)
  }, [setHasUnsavedChanges, updateScenes])

  const handleVoicePanelClose = useCallback(() => {
    setVoicePanelOpen(false)
    setSelectedSceneIndex(null)
  }, [])

  // 다음 단계 버튼 클릭 핸들러 - 모든 씬에 TTS 합성 수행
  const handleNextStep = useCallback(async () => {
    // 최신 상태를 가져와서 사용
    const latestStoreScenes = useVideoCreateStore.getState().scenes
    const latestScenes: ProScene[] = latestStoreScenes && latestStoreScenes.length > 0
      ? latestStoreScenes.map((s, index) => sceneScriptToProScene(s, index))
      : Array.from({ length: DEFAULT_SCENE_COUNT }, () => ({ id: generateSceneId(), script: '' }))
    
    // 모든 씬에 스크립트와 보이스가 있는지 확인
    const invalidScenes = latestScenes.filter(
      (scene, index) => !scene.script.trim() || !scene.voiceTemplate
    )

    if (invalidScenes.length > 0) {
      const invalidIndices = invalidScenes.map((_, idx) => {
        const sceneIndex = latestScenes.indexOf(invalidScenes[idx]) + 1
        return sceneIndex
      })
      alert(
        `다음 씬들에 스크립트 또는 보이스가 없습니다:\n씬 ${invalidIndices.join(', ')}\n모든 씬에 스크립트와 보이스를 입력해주세요.`
      )
      return
    }

    setIsSynthesizingTts(true)
    setTtsProgress({ completed: 0, total: latestScenes.length })

    try {
      const sceneData = latestScenes.map((scene): { script: string; voiceTemplate: string | null } => ({
        script: scene.script,
        voiceTemplate: scene.voiceTemplate ?? null,
      }))

      const result = await synthesizeAllScenes(sceneData, (completed, total) => {
        setTtsProgress({ completed, total })
      })

      if (!result.success) {
        alert(result.error || 'TTS 합성 중 오류가 발생했습니다.')
        setIsSynthesizingTts(false)
        return
      }

      // TTS 합성 결과의 duration을 store에 저장
      // 최신 상태를 가져와서 업데이트
      const currentStoreScenes = useVideoCreateStore.getState().scenes
      const currentScenes: ProScene[] = currentStoreScenes && currentStoreScenes.length > 0
        ? currentStoreScenes.map((s: SceneScript, index: number) => sceneScriptToProScene(s, index))
        : Array.from({ length: DEFAULT_SCENE_COUNT }, () => ({ id: generateSceneId(), script: '' }))
      
      // TTS 합성 결과를 ProScene에 저장 (duration과 base64 포함)
      const updatedScenes = currentScenes.map((scene, index) => {
        const ttsResult = result.results[index]
        return {
          ...scene,
          ttsDuration: ttsResult?.duration,
          ttsAudioBase64: ttsResult?.audioBase64, // base64도 ProScene에 포함
        }
      })
      
      // ProScene을 SceneScript로 변환 (proSceneToSceneScript가 자동으로 ttsAudioBase64 포함)
      const updatedStoreScenes = updatedScenes.map((scene: ProScene, index: number) => {
        return proSceneToSceneScript(scene, index)
      })
      
      // 상태 변경 전에 autoSaveEnabled 확인 및 설정
      const store = useVideoCreateStore.getState()
      if (!store.autoSaveEnabled) {
        useVideoCreateStore.setState({ autoSaveEnabled: true })
      }
      
      setStoreScenes(updatedStoreScenes)
      setHasUnsavedChanges(true)

      // TTS 합성 완료 후 다음 페이지로 이동
      router.push('/video/create/pro/step2/edit')
    } catch (error) {
      console.error('TTS 합성 오류:', error)
      alert(error instanceof Error ? error.message : 'TTS 합성 중 오류가 발생했습니다.')
      setIsSynthesizingTts(false)
    }
  }, [router, setStoreScenes, setHasUnsavedChanges])

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
                  영상에 사용할 이미지를 선택한 뒤,<br/>
                  상단의 AI 스크립트 버튼을 눌러 전체 흐름에 맞는 장면 별 대본을 한 번에 생성하고 수정할 수 있어요.
                </p>
              </div>

              {/* 공용: 대본 및 스크립트 스타일 선택 */}
              <div className="mb-16">
                <ScriptStyleSection
                  conceptOptions={conceptOptions}
                  selectedScriptStyle={scriptStyle}
                  onStyleSelect={handleScriptStyleSelect}
                />
              </div>

              {/* Pro 전용: 대본 및 스크립트 생성 이하 (Figma node 2422-29540 기준) */}
              {scriptStyle && (
                <section className="mb-16 space-y-12" data-pro-step2-below>
                  <div className="rounded-2xl bg-white/40 border border-white/10 p-6 shadow-(--shadow-container)">
                    <AiScriptGenerateButton onClick={handleGenerateAllScripts} loading={isGeneratingAll} />

                    <div
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDrop(e)
                      }}
                    >
                      {scenes.map((scene, index) => (
                        <ProSceneCard
                          key={scene.id}
                          sceneIndex={index + 1}
                          scriptText={scene.script}
                          onScriptChange={(value) => handleScriptChange(index, value)}
                          voiceLabel={scene.voiceLabel}
                          voiceTemplate={scene.voiceTemplate}
                          onVoiceClick={() => handleVoiceButtonClick(index)}
                          onDelete={() => handleSceneDelete(index)}
                          onDragStart={(e) => {
                            handleDragStart(index)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDrop={(e) => handleDrop(e)}
                          onDragEnd={handleDragEnd}
                          isGenerating={false}
                          draggedIndex={draggedIndex}
                          dragOver={dragOver}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-12">
                    <Link
                      href="/video/create/step1?track=pro"
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
                      onClick={handleNextStep}
                      disabled={isSynthesizingTts}
                      className="flex-1 h-14 rounded-2xl bg-[#5e8790] text-white hover:bg-[#5e8790]/90 transition-all flex items-center justify-center gap-2 font-bold tracking-[-0.48px] shadow-(--shadow-card-default) disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        fontSize: 'var(--font-size-24)',
                        lineHeight: '33.6px',
                      }}
                    >
                      {isSynthesizingTts ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          TTS 합성 중... ({ttsProgress.completed}/{ttsProgress.total})
                        </>
                      ) : (
                        <>
                          다음 단계
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 보이스 선택 패널 */}
      <AnimatePresence>
        {voicePanelOpen && selectedSceneIndex !== null && (
          <>
            {/* 배경 오버레이 */}
            <motion.div
              key="voice-panel-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={handleVoicePanelClose}
            />
            {/* 보이스 선택 패널 */}
            <ProVoicePanel
              key="voice-panel"
              open={voicePanelOpen}
              onOpenChange={handleVoicePanelClose}
              currentVoiceTemplate={scenes[selectedSceneIndex]?.voiceTemplate}
              onVoiceSelect={handleVoiceSelect}
              onVoiceSelectForAll={handleVoiceSelectForAll}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
