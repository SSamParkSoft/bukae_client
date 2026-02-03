'use client'

import { useCallback, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ScriptStyleSection, AiScriptGenerateButton } from '@/app/video/create/_components'
import { ProSceneCard, ProVoicePanel } from './components'
import { conceptOptions } from '@/lib/data/templates'
import type { ConceptType } from '@/lib/data/templates'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { studioScriptApi } from '@/lib/api/studio-script'
import { convertProductToProductResponse } from '@/lib/utils/converters/product-to-response'

const DEFAULT_SCENE_COUNT = 6

// Pro step2에서 사용하는 확장된 Scene 타입
type ProScene = {
  script: string
  voiceLabel?: string
  voiceTemplate?: string | null
}

// 확장된 SceneScript 타입
type ExtendedSceneScript = SceneScript & { 
  voiceLabel?: string
  voiceTemplate?: string | null 
}

// SceneScript를 ProScene으로 변환
function sceneScriptToProScene(s: SceneScript): ProScene {
  const extended = s as ExtendedSceneScript
  return {
    script: s.script || '',
    voiceLabel: extended.voiceLabel,
    voiceTemplate: extended.voiceTemplate,
  }
}

// ProScene을 SceneScript로 변환
function proSceneToSceneScript(s: ProScene, index: number): ExtendedSceneScript {
  return {
    sceneId: index + 1,
    script: s.script,
    voiceLabel: s.voiceLabel,
    voiceTemplate: s.voiceTemplate,
  }
}

export default function ProStep2Page() {
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
      ? storeScenes.map(sceneScriptToProScene)
      : Array.from({ length: DEFAULT_SCENE_COUNT }, () => ({ script: '' }))
  
  // store의 scenes가 비어있으면 기본값으로 초기화 (한 번만)
  useEffect(() => {
    if (!storeScenes || storeScenes.length === 0) {
      const defaultScenes: ExtendedSceneScript[] = 
        Array.from({ length: DEFAULT_SCENE_COUNT }, (_, i) => ({ 
          sceneId: i + 1,
          script: '' 
        }))
      setStoreScenes(defaultScenes)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // scenes 업데이트 함수 - store에 직접 저장
  const updateScenes = useCallback((updater: (prev: ProScene[]) => ProScene[]) => {
    const currentScenes: ProScene[] = storeScenes && storeScenes.length > 0
      ? storeScenes.map(sceneScriptToProScene)
      : Array.from({ length: DEFAULT_SCENE_COUNT }, () => ({ script: '' }))
    
    const updated = updater(currentScenes)
    // store에 저장 (localStorage에 자동 저장됨)
    setStoreScenes(updated.map((s, index) => proSceneToSceneScript(s, index)))
  }, [storeScenes, setStoreScenes])
  const { selectedImages, selectedProducts } = useVideoCreateStore()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)
  const [voicePanelOpen, setVoicePanelOpen] = useState(false)
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)

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
    setHasUnsavedChanges(true)
  }, [setHasUnsavedChanges, updateScenes])

  const handleSceneDelete = useCallback((index: number) => {
    updateScenes((prev) => prev.filter((_, i) => i !== index))
    setHasUnsavedChanges(true)
  }, [setHasUnsavedChanges, updateScenes])

  const handleUpload = useCallback((index: number) => {
    // 추후 영상 업로드 연동 시 index 사용
    void index
  }, [])

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
        alert('상품을 먼저 선택해주세요.')
        return
      }

      // Product를 ProductResponse 형태로 변환
      const productResponse = convertProductToProductResponse(product)

      const data = await studioScriptApi.generateScripts({
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

      setHasUnsavedChanges(true)
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
    setHasUnsavedChanges(true)
    setDraggedIndex(null)
    setDragOver(null)
  }, [draggedIndex, dragOver, updateScenes, setHasUnsavedChanges])

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
    setHasUnsavedChanges(true)
    setVoicePanelOpen(false)
    setSelectedSceneIndex(null)
  }, [selectedSceneIndex, setHasUnsavedChanges, updateScenes])

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
                          key={index}
                          sceneIndex={index + 1}
                          scriptText={scene.script}
                          onScriptChange={(value) => handleScriptChange(index, value)}
                          voiceLabel={scene.voiceLabel}
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
