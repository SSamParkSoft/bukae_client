'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight } from 'lucide-react'

import AutoImagePicker from '@/components/AutoImagePicker'
import SceneScriptBoard from '@/components/SceneScriptBoard'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/useThemeStore'
import type { AutoScene } from '@/lib/types/video'
import type { ConceptType } from '@/lib/data/templates'
import { conceptOptions, conceptTones } from '@/lib/data/templates'
import {
  crawledImagePool,
  createSceneFromAsset,
  regenerateScenesWithStyle,
  type CrawledImageAsset,
} from '@/lib/data/autoScenes'

const SCENE_LOADING_STEPS = ['이미지 분석 중', '핵심 포인트 추출 중', '톤 맞춤 중']

type SceneStatus = {
  state: 'idle' | 'loading' | 'ready'
  progress: number
  stage: number
}

interface AutoModeSectionProps {
  conceptId: ConceptType
  toneId: string
  minScenes?: number
  maxScenes?: number
  onComplete: (scenes: AutoScene[]) => void
  assets?: CrawledImageAsset[]
  presetAssets?: CrawledImageAsset[]
}

export default function AutoModeSection({
  conceptId,
  toneId,
  minScenes = 5,
  maxScenes,
  onComplete,
  assets,
  presetAssets,
}: AutoModeSectionProps) {
  const theme = useThemeStore((state) => state.theme)
  const [scenes, setScenes] = useState<AutoScene[]>([])
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isSceneGenerating, setIsSceneGenerating] = useState(false)
  const [sceneStatuses, setSceneStatuses] = useState<Record<string, SceneStatus>>({})
  const timeoutRefs = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const sceneBoardRef = useRef<HTMLDivElement>(null)
  const assetPool = assets && assets.length > 0 ? assets : crawledImagePool

  useEffect(() => {
    timeoutRefs.current.forEach((id) => clearTimeout(id))
    timeoutRefs.current = []
    setScenes([])
    setSceneStatuses({})
  }, [conceptId, toneId])

  useEffect(() => {
    if (!presetAssets?.length || scenes.length > 0) return
    const presetScenes = presetAssets.map((asset, index) =>
      createSceneFromAsset(asset, conceptId, toneId, index),
    )
    setScenes(presetScenes)
    setSceneStatuses(
      presetScenes.reduce<Record<string, SceneStatus>>((acc, scene) => {
        acc[scene.id] = {
          state: 'ready',
          progress: 100,
          stage: SCENE_LOADING_STEPS.length - 1,
        }
        return acc
      }, {}),
    )
  }, [presetAssets, conceptId, toneId, scenes.length])

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((id) => clearTimeout(id))
    }
  }, [])

  useEffect(() => {
    if (!isSceneGenerating) return
    if (scenes.length === 0) {
      setIsSceneGenerating(false)
      return
    }
    const allReady = scenes.every((scene) => sceneStatuses[scene.id]?.state === 'ready')
    if (allReady) {
      setIsSceneGenerating(false)
    }
  }, [isSceneGenerating, scenes, sceneStatuses])

  const conceptLabel = useMemo(
    () => conceptOptions.find((option) => option.id === conceptId)?.label ?? '선택된 컨셉',
    [conceptId],
  )
  const toneLabel = useMemo(
    () => conceptTones[conceptId]?.find((tone) => tone.id === toneId)?.label ?? '선택된 말투',
    [conceptId, toneId],
  )

  const handleSelectAsset = (asset: CrawledImageAsset) => {
    setScenes((prev) => {
      if (prev.some((scene) => scene.assetId === asset.id)) return prev
      const nextScene = createSceneFromAsset(asset, conceptId, toneId, prev.length)
      setSceneStatuses((statuses) => ({
        ...statuses,
        [nextScene.id]: { state: 'idle', progress: 0, stage: 0 },
      }))
      return [...prev, nextScene]
    })
  }

  const handleRemoveScene = (sceneId: string) => {
    setScenes((prev) => prev.filter((scene) => scene.id !== sceneId))
    setSceneStatuses((prev) => {
      const { [sceneId]: _, ...rest } = prev
      return rest
    })
  }

  const scheduleTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(() => {
      fn()
      timeoutRefs.current = timeoutRefs.current.filter((stored) => stored !== id)
    }, delay)
    timeoutRefs.current.push(id)
  }

  const simulateSceneLoading = (sceneId: string) => {
    setSceneStatuses((prev) => ({
      ...prev,
      [sceneId]: { state: 'loading', progress: 0, stage: 0 },
    }))

    SCENE_LOADING_STEPS.forEach((_, index) => {
      scheduleTimeout(() => {
        setSceneStatuses((prev) => {
          const current = prev[sceneId]
          if (!current) return prev
          return {
            ...prev,
            [sceneId]: {
              ...current,
              progress: Math.min(((index + 1) / SCENE_LOADING_STEPS.length) * 100, 95),
              stage: index,
            },
          }
        })
      }, (index + 1) * 700)
    })

    scheduleTimeout(() => {
      setSceneStatuses((prev) => ({
        ...prev,
        [sceneId]: { state: 'ready', progress: 100, stage: SCENE_LOADING_STEPS.length - 1 },
      }))
    }, SCENE_LOADING_STEPS.length * 700 + 400)
  }

  const handleSceneChange = (sceneId: string, updates: Partial<AutoScene>) => {
    setScenes((prev) =>
      prev.map((scene) => (scene.id === sceneId ? { ...scene, ...updates } : scene)),
    )
  }

  const handleConfirmAllScenes = () => {
    if (scenes.length === 0) return
    setIsSceneGenerating(true)
    scenes.forEach((scene) => {
      const status = sceneStatuses[scene.id]
      if (!status || status.state === 'idle') {
        simulateSceneLoading(scene.id)
      }
    })
    setTimeout(() => {
      sceneBoardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)
  }

  const handleRegenerateScripts = () => {
    setIsRegenerating(true)
    setTimeout(() => {
      setScenes((prev) => regenerateScenesWithStyle(prev, conceptId, toneId))
      setIsRegenerating(false)
    }, 600)
  }

  const readyScenes = scenes.filter((scene) => sceneStatuses[scene.id]?.state === 'ready')
  const canComplete = readyScenes.length >= minScenes && readyScenes.length === scenes.length

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <AutoImagePicker
        assets={assetPool}
        scenes={scenes}
        minSelection={minScenes}
        maxSelection={maxScenes}
        sceneStatuses={sceneStatuses}
        onSelectAsset={handleSelectAsset}
        onRemoveScene={handleRemoveScene}
        onConfirmAllScenes={handleConfirmAllScenes}
        isGenerating={isSceneGenerating}
      />

      <SceneScriptBoard
        scenes={scenes}
        conceptLabel={conceptLabel}
        toneLabel={toneLabel}
        isRegenerating={isRegenerating}
        minSelection={minScenes}
        sceneStatuses={sceneStatuses}
        onSceneChange={handleSceneChange}
        onRegenerateScripts={handleRegenerateScripts}
        onReorderScenes={(ids) => {
          setScenes((prev) => {
            const map = Object.fromEntries(prev.map((scene) => [scene.id, scene]))
            return ids.map((id) => map[id]).filter(Boolean) as AutoScene[]
          })
        }}
        sectionRef={sceneBoardRef}
        isGenerating={isSceneGenerating}
      />

      <div
        className={`rounded-2xl border p-4 ${
          theme === 'dark' ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-gray-50'
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-full p-2 ${
                theme === 'dark' ? 'bg-gray-800 text-yellow-400' : 'bg-yellow-50 text-yellow-600'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                이미지 선택과 스크립트 수정을 마치면 다음 단계로 이동할 수 있어요.
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                최소 {minScenes}장 이상 선택해야 하며, 컷 순서는 나중에 STEP3에서도 그대로 활용됩니다.
              </p>
            </div>
          </div>

          <Button
            size="lg"
            disabled={!canComplete}
            onClick={() => onComplete(readyScenes)}
            className="gap-2"
          >
            다음 단계로 이동
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </motion.section>
  )
}


