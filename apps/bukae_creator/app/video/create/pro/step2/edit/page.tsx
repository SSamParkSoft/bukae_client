'use client'

import { useCallback, useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ProVideoEditSection } from '../components'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'

const DEFAULT_SCENE_COUNT = 6

// Pro step2에서 사용하는 확장된 Scene 타입
type ProScene = {
  id: string // 고유 ID (드래그 앤 드롭 시 안정적인 key를 위해)
  script: string
  voiceLabel?: string
  voiceTemplate?: string | null
  ttsDuration?: number // TTS duration (초)
}

// 확장된 SceneScript 타입
type ExtendedSceneScript = SceneScript & { 
  id?: string // 고유 ID (드래그 앤 드롭 시 안정적인 key를 위해)
  voiceLabel?: string
  voiceTemplate?: string | null
  ttsDuration?: number // TTS duration (초)
}

// 고유 ID 생성 헬퍼 함수
function generateSceneId(): string {
  return `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// SceneScript를 ProScene으로 변환
function sceneScriptToProScene(s: SceneScript, _index: number): ProScene {
  const extended = s as ExtendedSceneScript
  return {
    id: extended.id || generateSceneId(), // 기존 ID가 없으면 새로 생성
    script: s.script || '',
    voiceLabel: extended.voiceLabel,
    voiceTemplate: extended.voiceTemplate,
    ttsDuration: extended.ttsDuration,
  }
}

// ProScene을 SceneScript로 변환
function proSceneToSceneScript(s: ProScene, index: number): ExtendedSceneScript {
  return {
    sceneId: index + 1,
    id: s.id, // 고유 ID 유지
    script: s.script,
    voiceLabel: s.voiceLabel,
    voiceTemplate: s.voiceTemplate,
    ttsDuration: s.ttsDuration,
  }
}

export default function ProStep2EditPage() {
  const { 
    setHasUnsavedChanges,
    scenes: storeScenes,
    setScenes: setStoreScenes
  } = useVideoCreateStore()
  
  // store의 scenes를 현재 형식으로 변환하여 사용
  const scenes: ProScene[] = 
    storeScenes && storeScenes.length > 0
      ? storeScenes.map((s, index) => sceneScriptToProScene(s, index))
      : Array.from({ length: DEFAULT_SCENE_COUNT }, () => ({ id: generateSceneId(), script: '' }))
  
  // store의 scenes가 비어있으면 기본값으로 초기화 (한 번만)
  useEffect(() => {
    if (!storeScenes || storeScenes.length === 0) {
      const defaultScenes: ExtendedSceneScript[] = 
        Array.from({ length: DEFAULT_SCENE_COUNT }, (_, i) => ({ 
          sceneId: i + 1,
          id: generateSceneId(), // 고유 ID 생성
          script: '' 
        }))
      setStoreScenes(defaultScenes)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  // scenes 업데이트 함수 - store에 직접 저장
  const updateScenes = useCallback((updater: (prev: ProScene[]) => ProScene[]) => {
    const currentScenes: ProScene[] = storeScenes && storeScenes.length > 0
      ? storeScenes.map((s, index) => sceneScriptToProScene(s, index))
      : Array.from({ length: DEFAULT_SCENE_COUNT }, () => ({ id: generateSceneId(), script: '' }))
    
    const updated = updater(currentScenes)
    // store에 저장 (localStorage에 자동 저장됨)
    setStoreScenes(updated.map((s, index) => proSceneToSceneScript(s, index)))
  }, [storeScenes, setStoreScenes])

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)
  // 촬영가이드 텍스트 상태 관리
  const [guideTexts, setGuideTexts] = useState<Record<string, string>>({})

  const handleScriptChange = useCallback((index: number, value: string) => {
    updateScenes((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], script: value }
      return next
    })
    setHasUnsavedChanges(true)
  }, [setHasUnsavedChanges, updateScenes])

  const handleGuideChange = useCallback((index: number, value: string) => {
    const sceneId = scenes[index]?.id
    if (sceneId) {
      setGuideTexts((prev) => ({
        ...prev,
        [sceneId]: value,
      }))
      setHasUnsavedChanges(true)
    }
  }, [scenes, setHasUnsavedChanges])

  const handleVideoUpload = useCallback((index: number) => {
    // TODO: 영상 업로드 로직 구현
    console.log('영상 업로드', index)
  }, [])

  const handleAiGuideGenerateAll = useCallback(() => {
    // TODO: AI 촬영가이드 생성 로직 구현
    console.log('AI 촬영가이드 생성')
  }, [])

  const handleAiScriptClick = useCallback((index: number) => {
    // TODO: 개별 씬 AI 스크립트 생성 로직 구현
    console.log('AI 스크립트 생성', index)
  }, [])

  const handleAiGuideClick = useCallback((index: number) => {
    // TODO: 개별 씬 AI 촬영가이드 생성 로직 구현
    console.log('AI 촬영가이드 생성', index)
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
    setHasUnsavedChanges(true)
    setDraggedIndex(null)
    setDragOver(null)
  }, [draggedIndex, dragOver, updateScenes, setHasUnsavedChanges])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOver(null)
  }, [])

  // 두 번째 화면용 scenes 데이터 (TTS duration 포함)
  const videoEditScenes = scenes.map((scene) => ({
    id: scene.id,
    script: scene.script,
    ttsDuration: scene.ttsDuration || 10, // 실제 TTS duration 값 사용 (없으면 기본값 10초)
    guideText: guideTexts[scene.id] || '', // 촬영가이드 텍스트 가져오기
    voiceLabel: scene.voiceLabel, // 적용된 보이스 라벨
  }))

  // 각 씬의 TTS duration 콘솔 출력
  useEffect(() => {
    console.log('=== 각 씬의 TTS Duration ===')
    scenes.forEach((scene, index) => {
      console.log(`씬 ${index + 1}: ${scene.ttsDuration?.toFixed(2) || '없음'}초`)
    })
    console.log('===========================')
  }, [scenes])

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
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    draggedIndex={draggedIndex}
                    dragOver={dragOver}
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
