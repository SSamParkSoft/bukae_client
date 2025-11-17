'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/useThemeStore'
import type { AutoScene } from '@/lib/types/video'
import type { CrawledImageAsset } from '@/lib/data/autoScenes'

interface SceneStatus {
  state: 'idle' | 'loading' | 'ready'
  progress: number
  stage: number
}

interface AutoImagePickerProps {
  assets: CrawledImageAsset[]
  scenes: AutoScene[]
  minSelection?: number
  maxSelection?: number
  sceneStatuses: Record<string, SceneStatus>
  onSelectAsset: (asset: CrawledImageAsset) => void
  onRemoveScene: (sceneId: string) => void
  onConfirmAllScenes: () => void
  isGenerating?: boolean
}

export default function AutoImagePicker({
  assets,
  scenes,
  minSelection = 5,
  maxSelection,
  sceneStatuses,
  onSelectAsset,
  onRemoveScene,
  onConfirmAllScenes,
  isGenerating = false,
}: AutoImagePickerProps) {
  const theme = useThemeStore((state) => state.theme)
  const selectedAssetIds = useMemo(() => new Set(scenes.map((scene) => scene.assetId)), [scenes])
  const selectionLimit = typeof maxSelection === 'number' ? maxSelection : null
  const canSelectMore = selectionLimit ? scenes.length < selectionLimit : true
  const hasMinSelection = scenes.length >= minSelection
  const idleSceneCount = scenes.filter((scene) => (sceneStatuses[scene.id]?.state ?? 'idle') === 'idle').length

  const handleCardClick = (asset: CrawledImageAsset) => {
    if (selectedAssetIds.has(asset.id)) {
      const targetScene = scenes.find((scene) => scene.assetId === asset.id)
      if (targetScene) onRemoveScene(targetScene.id)
      return
    }
    if (!canSelectMore) return
    onSelectAsset(asset)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>1. 이미지 선택 및 순서 설정</h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          크롤링된 이미지를 선택하면 좌측에서 우측 순서대로 장면이 구성됩니다. 최소 {minSelection}장 이상 선택해주세요
          {selectionLimit ? ` (최대 ${selectionLimit}장).` : '.'}
        </p>
      </div>

      <div className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-gray-200 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              선택된 장면 {scenes.length}
            </p>
            <p className={`text-xs ${hasMinSelection ? 'text-green-500' : 'text-yellow-500'}`}>
              {hasMinSelection ? '최소 조건을 충족했어요' : `최소 ${minSelection}장 이상 필요해요`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className={
                hasMinSelection
                  ? 'bg-green-500 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-800 text-gray-300'
                    : 'bg-gray-200 text-gray-600'
              }
            >
              {scenes.length} Scene
            </Badge>
            <div className="flex flex-col gap-1">
              {isGenerating && (
                <span className="text-xs font-semibold text-purple-500">AI가 대본을 생성중이에요...</span>
              )}
              <Button
                size="sm"
                disabled={idleSceneCount === 0 || isGenerating}
                onClick={onConfirmAllScenes}
                className={`bg-purple-600 text-white hover:bg-purple-500 disabled:bg-gray-500 disabled:text-white`}
              >
                대본 생성하기
              </Button>
            </div>
          </div>
        </div>
        <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
          ‘대본 생성하기’ 버튼을 누르면 아직 분석하지 않은 장면에 대해 AI 추천 대본이 한 번에 생성돼요.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {assets.map((asset) => {
          const selected = selectedAssetIds.has(asset.id)
          const disabled = !selected && !canSelectMore

          return (
            <Card
              key={asset.id}
              onClick={() => handleCardClick(asset)}
              className={`cursor-pointer transition-all ${
                selected
                  ? 'border-2 border-purple-500 shadow-lg'
                  : disabled
                    ? 'opacity-50'
                    : theme === 'dark'
                      ? 'border-gray-200 hover:border-gray-200'
                      : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CardContent className="p-2">
                <div className="relative aspect-square overflow-hidden rounded-lg">
                  <img src={asset.url} alt={asset.label} className="h-full w-full object-cover" />
                  {selected && (
                    <div className="absolute inset-0 bg-black/40">
                      <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-purple-600">
                        선택됨
                      </div>
                    </div>
                  )}
                </div>
                <p className={`mt-2 text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{asset.label}</p>
                <p className={`text-[11px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{asset.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {scenes.length === 0 && (
        <div
          className={`rounded-xl border border-dashed p-6 text-center ${
            theme === 'dark' ? 'border-gray-200 text-gray-400' : 'border-gray-300 text-gray-500'
          }`}
        >
          아직 선택된 장면이 없어요. 위의 이미지에서 마음에 드는 사진을 골라 추가해주세요.
        </div>
      )}
    </div>
  )
}

