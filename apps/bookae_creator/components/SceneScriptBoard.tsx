'use client'

import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { AutoScene } from '@/lib/types/video'
import { useThemeStore } from '@/store/useThemeStore'

interface SceneScriptBoardProps {
  scenes: AutoScene[]
  conceptLabel: string
  toneLabel: string
  isRegenerating: boolean
  minSelection?: number
  sceneStatuses: Record<
    string,
    {
      state: 'idle' | 'loading' | 'ready'
      progress: number
      stage: number
    }
  >
  loadingStages: string[]
  onSceneChange: (sceneId: string, updates: Partial<AutoScene>) => void
  onRegenerateScripts: () => void
}

export default function SceneScriptBoard({
  scenes,
  conceptLabel,
  toneLabel,
  isRegenerating,
  minSelection = 4,
  sceneStatuses,
  loadingStages,
  onSceneChange,
  onRegenerateScripts,
}: SceneScriptBoardProps) {
  const theme = useThemeStore((state) => state.theme)
  const canRenderScenes = scenes.length >= minSelection

  const totalCharacters = useMemo(
    () =>
      scenes.reduce((sum, scene) => {
        const status = sceneStatuses[scene.id]
        if (status?.state !== 'ready') return sum
        return sum + scene.editedScript.length
      }, 0),
    [scenes, sceneStatuses],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            2. 장면별 AI 추천 대본
          </p>
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            선택한 스타일 · 말투를 기준으로 이미지마다 적합한 대본이 자동 생성돼요.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">{conceptLabel}</Badge>
            <Badge variant="secondary">{toneLabel}</Badge>
            <Badge variant="outline">총 {totalCharacters}자</Badge>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onRegenerateScripts}
          disabled={isRegenerating || !canRenderScenes}
          className="gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
          AI 추천 다시 받기
        </Button>
      </div>

      {!canRenderScenes && (
        <div
          className={`rounded-2xl border border-dashed p-6 text-center ${
            theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600'
          }`}
        >
          최소 {minSelection}장 이상 이미지를 선택하면 장면별 스크립트가 자동으로 생성됩니다.
        </div>
      )}

      {canRenderScenes &&
        scenes.map((scene, index) => (
          <Card key={scene.id} className={theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-500">Scene {index + 1}</p>
                  <CardTitle className="text-xl">{scene.imageLabel}</CardTitle>
                </div>
                <Badge variant="secondary">
                  {sceneStatuses[scene.id]?.state === 'ready' ? '대본 준비 완료' : '대기 중'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                <div className="overflow-hidden rounded-xl border">
                  <img src={scene.imageUrl} alt={scene.imageLabel} className="h-full w-full object-cover" />
                </div>
                {sceneStatuses[scene.id]?.state === 'ready' ? (
                  <div className="space-y-4">
                    <textarea
                      value={scene.editedScript}
                      onChange={(e) => onSceneChange(scene.id, { editedScript: e.target.value })}
                      rows={6}
                      className={`w-full rounded-xl border p-3 text-sm leading-relaxed ${
                        theme === 'dark'
                          ? 'border-gray-700 bg-gray-900 text-white placeholder-gray-500'
                          : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      placeholder="장면에 어울리는 스크립트를 입력하세요."
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{scene.editedScript.length}자</span>
                      <button
                        type="button"
                        className="text-purple-500 underline"
                        onClick={() => onSceneChange(scene.id, { editedScript: scene.recommendedScript })}
                      >
                        추천 문장으로 되돌리기
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center ${
                      theme === 'dark' ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    <p className="text-sm font-semibold">
                      {sceneStatuses[scene.id]?.state === 'loading'
                        ? `${loadingStages[sceneStatuses[scene.id]?.stage ?? 0]}`
                        : '이 사진으로 진행하기 버튼을 눌러주세요'}
                    </p>
                    {sceneStatuses[scene.id]?.state === 'loading' && (
                      <div className="w-full">
                        <div className={`h-2 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                          <div
                            className="h-full rounded-full bg-purple-500 transition-all"
                            style={{ width: `${sceneStatuses[scene.id]?.progress ?? 0}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-purple-400">
                          {Math.round(sceneStatuses[scene.id]?.progress ?? 0)}% 완료
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}


