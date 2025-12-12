import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BgmSelector } from '@/components/video-editor/BgmSelector'
import { SubtitleSettings } from '@/components/video-editor/SubtitleSettings'
import type { TimelineData } from '@/store/useVideoCreateStore'

type AdvancedEffectKey = 'glow' | 'glitch' | 'particles'

type GlowEffect = {
  enabled: boolean
  distance?: number
  outerStrength?: number
  innerStrength?: number
  color?: number
}

type GlitchEffect = {
  enabled: boolean
  intensity?: number
}

type ParticlesEffect = {
  enabled: boolean
  type?: 'sparkle' | 'snow' | 'confetti' | 'stars'
  count?: number
  duration?: number
}

type AdvancedEffectValue = GlowEffect | GlitchEffect | ParticlesEffect

interface EffectsPanelProps {
  theme: string | undefined
  rightPanelTab: string
  setRightPanelTab: (value: string) => void
  timeline: TimelineData | null
  currentSceneIndex: number
  allTransitions: Array<{ value: string; label: string }>
  onTransitionChange: (sceneIndex: number, value: string) => void
  onAdvancedEffectChange: (
    sceneIndex: number,
    effect: AdvancedEffectKey,
    value: AdvancedEffectValue
  ) => void
  bgmTemplate: string | null
  setBgmTemplate: (value: string | null) => void
  setTimeline: (value: TimelineData) => void
}

export function EffectsPanel({
  theme,
  rightPanelTab,
  setRightPanelTab,
  timeline,
  currentSceneIndex,
  allTransitions,
  onTransitionChange,
  onAdvancedEffectChange,
  bgmTemplate,
  setBgmTemplate,
  setTimeline,
}: EffectsPanelProps) {
  return (
    <div
      className="w-[30%] flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: theme === 'dark' ? '#111827' : '#ffffff' }}
    >
      <div
        className="p-4 border-b shrink-0 flex items-center"
        style={{
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          minHeight: '64px',
          marginTop: '7px',
        }}
      >
        <div className="flex items-center justify-between w-full">
          <h2
            className="text-lg font-semibold"
            style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}
          >
            효과
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="p-4">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="animation">애니메이션</TabsTrigger>
            <TabsTrigger value="bgm">배경음악</TabsTrigger>
            <TabsTrigger value="subtitle">자막</TabsTrigger>
          </TabsList>

          <TabsContent value="animation" className="space-y-4">
            <div>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}
              >
                전환 효과
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {allTransitions.map((transition) => {
                  const isSelected = timeline?.scenes[currentSceneIndex]?.transition === transition.value
                  return (
                    <button
                      key={transition.value}
                      onClick={() => {
                        if (timeline && currentSceneIndex >= 0) {
                          onTransitionChange(currentSceneIndex, transition.value)
                        }
                      }}
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        isSelected
                          ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500'
                          : 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
                      }`}
                      style={{
                        borderColor: isSelected
                          ? '#8b5cf6'
                          : theme === 'dark'
                            ? '#374151'
                            : '#e5e7eb',
                        color: theme === 'dark' ? '#d1d5db' : '#374151',
                      }}
                    >
                      {transition.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}
              >
                고급 효과
              </h3>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                    후광 효과
                  </label>
                  <input
                    type="checkbox"
                    checked={timeline?.scenes[currentSceneIndex]?.advancedEffects?.glow?.enabled || false}
                    onChange={(e) => {
                      if (timeline && currentSceneIndex >= 0) {
                        onAdvancedEffectChange(
                          currentSceneIndex,
                          'glow',
                          e.target.checked
                            ? { enabled: true, distance: 10, outerStrength: 4, innerStrength: 0, color: 0xffffff }
                            : { enabled: false },
                        )
                      }
                    }}
                    className="w-4 h-4"
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                    글리치 효과
                  </label>
                  <input
                    type="checkbox"
                    checked={timeline?.scenes[currentSceneIndex]?.advancedEffects?.glitch?.enabled || false}
                    onChange={(e) => {
                      if (timeline && currentSceneIndex >= 0) {
                        onAdvancedEffectChange(
                          currentSceneIndex,
                          'glitch',
                          e.target.checked ? { enabled: true, intensity: 10 } : { enabled: false },
                        )
                      }
                    }}
                    className="w-4 h-4"
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                    파티클 효과
                  </label>
                  <select
                    value={timeline?.scenes[currentSceneIndex]?.advancedEffects?.particles?.type || 'none'}
                    onChange={(e) => {
                      if (timeline && currentSceneIndex >= 0) {
                        const value = e.target.value
                        onAdvancedEffectChange(
                          currentSceneIndex,
                          'particles',
                          value !== 'none'
                            ? {
                                enabled: true,
                                type: value as 'sparkle' | 'snow' | 'confetti' | 'stars',
                                count: 50,
                                duration: 2,
                              }
                            : { enabled: false },
                        )
                      }
                    }}
                    className="px-2 py-1 rounded border text-xs"
                    style={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                      borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                      color: theme === 'dark' ? '#ffffff' : '#111827',
                    }}
                  >
                    <option value="none">없음</option>
                    <option value="sparkle">반짝임</option>
                    <option value="snow">눈송이</option>
                    <option value="confetti">컨페티</option>
                    <option value="stars">별</option>
                  </select>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bgm" className="space-y-4">
            <BgmSelector bgmTemplate={bgmTemplate} theme={theme} setBgmTemplate={setBgmTemplate} />
          </TabsContent>

          <TabsContent value="subtitle" className="space-y-4">
            <SubtitleSettings
              timeline={timeline}
              currentSceneIndex={currentSceneIndex}
              theme={theme}
              setTimeline={setTimeline}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

