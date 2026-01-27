import { Tabs, TabsContent } from '@/components/ui/tabs'
import { BgmSelector } from '@/components/video-editor/BgmSelector'
import { SoundEffectSelector } from '@/components/video-editor/SoundEffectSelector'
import { SubtitleSettings } from '@/components/video-editor/SubtitleSettings'
import VoiceSelector from '@/components/VoiceSelector'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { MotionConfig, MotionType } from '@/hooks/video/effects/motion/types'

interface EffectsPanelProps {
  theme: string | undefined
  rightPanelTab: string
  setRightPanelTab: (value: string) => void
  timeline: TimelineData | null
  currentSceneIndex: number
  allTransitions: Array<{ value: string; label: string }>
  transitions?: Array<{ value: string; label: string }>
  movements?: Array<{ value: string; label: string }>
  onTransitionChange: (sceneIndex: number, value: string) => void
  bgmTemplate: string | null
  setBgmTemplate: (value: string | null) => void
  confirmedBgmTemplate: string | null
  onBgmConfirm: (templateId: string | null) => void
  soundEffect: string | null
  setSoundEffect: (effectId: string | null) => void
  confirmedSoundEffect: string | null
  onSoundEffectConfirm: (effectId: string | null) => void
  setTimeline: (value: TimelineData) => void
  showVoiceRequiredMessage?: boolean
  scenesWithoutVoice?: number[]
  globalVoiceTemplate?: string | null
  onVoiceTemplateChange?: (sceneIndex: number, voiceTemplate: string | null) => void
  onMotionChange?: (sceneIndex: number, motion: MotionConfig | null) => void
}

export function EffectsPanel({
  theme,
  rightPanelTab,
  setRightPanelTab,
  timeline,
  currentSceneIndex,
  allTransitions,
  transitions,
  movements,
  onTransitionChange,
  bgmTemplate,
  setBgmTemplate,
  confirmedBgmTemplate,
  onBgmConfirm,
  soundEffect,
  setSoundEffect,
  onSoundEffectConfirm,
  setTimeline,
  showVoiceRequiredMessage = false,
  scenesWithoutVoice = [],
  globalVoiceTemplate,
  onVoiceTemplateChange,
  onMotionChange,
}: EffectsPanelProps) {
  // transitions와 movements가 제공되면 사용, 아니면 allTransitions 사용 (하위 호환성)
  const displayTransitions = transitions || allTransitions
  const displayMovements = movements || []
  const transitionsWithoutNone = displayTransitions.filter((t) => t.value !== 'none')
  
  // 현재 씬의 voiceTemplate 계산 (씬별 voiceTemplate이 있으면 사용, 없으면 전역 voiceTemplate 사용)
  const sceneVoiceTemplate = timeline && currentSceneIndex >= 0
    ? (timeline.scenes[currentSceneIndex]?.voiceTemplate || globalVoiceTemplate)
    : globalVoiceTemplate
  
  return (
    <div className="w-full flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="h-full flex flex-col" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {/* 탭바와 내용을 하나의 박스로 연결 */}
          <div className="px-4 pt-0 pb-0 flex-1 overflow-hidden min-h-0 flex flex-col">
            <div className="bg-white/60 rounded-2xl flex flex-col h-full" style={{ overflowY: 'hidden', overflowX: 'visible' }}>
              {/* 탭바 */}
              <div className="p-1 shrink-0 -mx-1" style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                <div className="bg-white rounded-2xl p-1 scrollbar-hide" style={{ minWidth: 'max-content' }}>
                  <div className="flex items-center gap-1 md:flex">
                <button
                  type="button"
                  onClick={() => setRightPanelTab('animation')}
                  className={`shrink-0 md:flex-1 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 transition-all font-bold tracking-[-0.14px] whitespace-nowrap ${
                    rightPanelTab === 'animation'
                      ? 'bg-[#5e8790] text-white'
                      : 'text-[#5d5d5d] font-medium'
                  }`}
                  style={{ 
                    fontSize: 'var(--font-size-14)',
                    lineHeight: rightPanelTab === 'animation' ? '22.4px' : '19.6px'
                  }}
                >
                  애니메이션
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('bgm')}
                  className={`shrink-0 md:flex-1 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 transition-all font-bold tracking-[-0.14px] whitespace-nowrap ${
                    rightPanelTab === 'bgm'
                      ? 'bg-[#5e8790] text-white'
                      : 'text-[#5d5d5d] font-medium'
                  }`}
                  style={{ 
                    fontSize: 'var(--font-size-14)',
                    lineHeight: rightPanelTab === 'bgm' ? '22.4px' : '19.6px'
                  }}
                >
                  배경음악
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('subtitle')}
                  className={`shrink-0 md:flex-1 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 transition-all font-bold tracking-[-0.14px] whitespace-nowrap ${
                    rightPanelTab === 'subtitle'
                      ? 'bg-[#5e8790] text-white'
                      : 'text-[#5d5d5d] font-medium'
                  }`}
                  style={{ 
                    fontSize: 'var(--font-size-14)',
                    lineHeight: rightPanelTab === 'subtitle' ? '22.4px' : '19.6px'
                  }}
                >
                  자막
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('voice')}
                  className={`shrink-0 md:flex-1 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 transition-all font-bold tracking-[-0.14px] whitespace-nowrap ${
                    rightPanelTab === 'voice'
                      ? 'bg-[#5e8790] text-white'
                      : 'text-[#5d5d5d] font-medium'
                  }`}
                  style={{ 
                    fontSize: 'var(--font-size-14)',
                    lineHeight: rightPanelTab === 'voice' ? '22.4px' : '19.6px'
                  }}
                >
                  음성
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('template')}
                  className={`shrink-0 md:flex-1 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 transition-all font-bold tracking-[-0.14px] whitespace-nowrap ${
                    rightPanelTab === 'template'
                      ? 'bg-[#5e8790] text-white'
                      : 'text-[#5d5d5d] font-medium'
                  }`}
                  style={{ 
                    fontSize: 'var(--font-size-14)',
                    lineHeight: rightPanelTab === 'template' ? '22.4px' : '19.6px'
                  }}
                >
                  템플릿
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('sound')}
                  className={`shrink-0 md:flex-1 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 transition-all font-bold tracking-[-0.14px] whitespace-nowrap ${
                    rightPanelTab === 'sound'
                      ? 'bg-[#5e8790] text-white'
                      : 'text-[#5d5d5d] font-medium'
                  }`}
                  style={{ 
                    fontSize: 'var(--font-size-14)',
                    lineHeight: rightPanelTab === 'sound' ? '22.4px' : '19.6px'
                  }}
                >
                  효과음
                </button>
                  </div>
                </div>
              </div>

              {/* 내용 영역 */}
              <div className="flex-1 overflow-y-auto min-h-0" style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}>
                <TabsContent value="animation" className="px-6 pt-6 w-full max-w-full overflow-x-hidden">
              {/* 전환 효과 섹션 */}
              {displayTransitions.length > 0 && (
                <div className="space-y-4">
                  <h3 
                    className="font-bold text-text-dark mb-4 tracking-[-0.4px]"
                    style={{ 
                      fontSize: 'var(--font-size-20)',
                      lineHeight: '28px'
                    }}
                  >
                    애니메이션 선택
                  </h3>
                  <div className="h-0.5 bg-[#bbc9c9]" />
                  <div className="space-y-6">
                    {/* 전환 효과 섹션 */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 
                          className="font-bold text-text-dark tracking-[-0.4px]"
                          style={{ 
                            fontSize: 'var(--font-size-20)',
                            lineHeight: '28px'
                          }}
                        >
                          전환 효과
                        </h3>
                        <span 
                          className="text-[#5d5d5d] tracking-[-0.14px] mt-2"
                          style={{ 
                            fontSize: 'var(--font-size-12)',
                            lineHeight: '19.2px'
                          }}
                        >
                          씬 간에 효과를 나타내요!
                        </span>
                      </div>
                      <div className="h-0.5 bg-[#bbc9c9]" />
                      
                      {/* 전환 효과 없음 옵션 */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            if (timeline && currentSceneIndex >= 0) {
                              onTransitionChange(currentSceneIndex, 'none')
                            }
                          }}
                          className={`h-[38px] rounded-lg border transition-all font-bold tracking-[-0.14px] ${
                            timeline?.scenes[currentSceneIndex]?.transition === 'none' || !timeline?.scenes[currentSceneIndex]?.transition
                              ? 'bg-[#5e8790] text-white border-[#5e8790]'
                              : 'bg-white text-[#2c2c2c] border-[#88a9ac] hover:bg-gray-50'
                          }`}
                          style={{ 
                            fontSize: 'var(--font-size-14)',
                            lineHeight: '22.4px'
                          }}
                        >
                          없음
                        </button>
                      </div>
                      
                      {/* 전환 효과 리스트 */}
                      {transitionsWithoutNone.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {transitionsWithoutNone
                            .filter((transition) => transition.value !== 'ripple')
                            .map((transition) => {
                              const isSelected = timeline?.scenes[currentSceneIndex]?.transition === transition.value
                              return (
                                <button
                                  key={transition.value}
                                  onClick={() => {
                                    if (timeline && currentSceneIndex >= 0) {
                                      onTransitionChange(currentSceneIndex, transition.value)
                                    }
                                  }}
                                  className={`h-[38px] rounded-lg border transition-all font-bold tracking-[-0.14px] ${
                                    isSelected
                                      ? 'bg-[#5e8790] text-white border-[#5e8790]'
                                      : 'bg-white text-[#2c2c2c] border-[#88a9ac] hover:bg-gray-50'
                                  }`}
                                  style={{ 
                                    fontSize: 'var(--font-size-14)',
                                    lineHeight: '22.4px'
                                  }}
                                >
                                  {transition.label}
                                </button>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 움직임 (Motion) 섹션 */}
              {onMotionChange && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center gap-2">
                    <h3 
                      className="font-bold text-text-dark tracking-[-0.4px]"
                      style={{ 
                        fontSize: 'var(--font-size-20)',
                        lineHeight: '28px'
                      }}
                    >
                      움직임
                    </h3>
                    <span 
                      className="text-[#5d5d5d] tracking-[-0.14px] mt-2"
                      style={{ 
                        fontSize: 'var(--font-size-12)',
                        lineHeight: '19.2px'
                      }}
                    >
                      이미지 움직임 효과
                    </span>
                  </div>
                  <div className="h-0.5 bg-[#bbc9c9]" />
                  
                  {/* Motion 없음 옵션 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        if (timeline && currentSceneIndex >= 0) {
                          onMotionChange(currentSceneIndex, null)
                        }
                      }}
                      className={`h-[38px] rounded-lg border transition-all font-bold tracking-[-0.14px] ${
                        !timeline?.scenes[currentSceneIndex]?.motion
                          ? 'bg-[#5e8790] text-white border-[#5e8790]'
                          : 'bg-white text-[#2c2c2c] border-[#88a9ac] hover:bg-gray-50'
                      }`}
                      style={{ 
                        fontSize: 'var(--font-size-14)',
                        lineHeight: '22.4px'
                      }}
                    >
                      없음
                    </button>
                  </div>

                  {/* Motion 타입 옵션 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {([
                      { type: 'slide-left' as MotionType, label: '왼쪽으로' },
                      { type: 'slide-right' as MotionType, label: '오른쪽으로' },
                      { type: 'slide-up' as MotionType, label: '위로' },
                      { type: 'slide-down' as MotionType, label: '아래로' },
                      { type: 'zoom-in' as MotionType, label: '확대' },
                      { type: 'zoom-out' as MotionType, label: '축소' },
                    ]).map((motionOption) => {
                      const currentMotion = timeline?.scenes[currentSceneIndex]?.motion
                      const isSelected = currentMotion?.type === motionOption.type
                      return (
                        <button
                          key={motionOption.type}
                          onClick={() => {
                            if (timeline && currentSceneIndex >= 0) {
                              const motionConfig: MotionConfig = {
                                type: motionOption.type,
                                startSecInScene: 0,
                                durationSec: 2,
                                easing: 'ease-out',
                                params: motionOption.type.startsWith('slide')
                                  ? { distance: 200 }
                                  : motionOption.type.startsWith('zoom')
                                  ? { scaleFrom: motionOption.type === 'zoom-in' ? 1 : 1.2, scaleTo: motionOption.type === 'zoom-in' ? 1.2 : 1 }
                                  : {},
                              }
                              onMotionChange(currentSceneIndex, motionConfig)
                            }
                          }}
                          className={`h-[38px] rounded-lg border transition-all font-bold tracking-[-0.14px] ${
                            isSelected
                              ? 'bg-[#5e8790] border-[#5e8790] text-white'
                              : 'bg-white text-[#2c2c2c] border-[#88a9ac] hover:bg-gray-50'
                          }`}
                          style={{ 
                            fontSize: 'var(--font-size-14)',
                            lineHeight: '22.4px'
                          }}
                        >
                          {motionOption.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 고급 효과 - 주석처리 */}
              {/* <div>
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
            </div> */}
                </TabsContent>

                <TabsContent value="bgm" className="px-6 pt-6 w-full max-w-full overflow-x-hidden">
                  <div className="w-full max-w-full overflow-x-hidden box-border">
                    <BgmSelector 
                      bgmTemplate={bgmTemplate} 
                      theme={theme ?? 'light'} 
                      setBgmTemplate={setBgmTemplate}
                      confirmedBgmTemplate={confirmedBgmTemplate}
                      onBgmConfirm={onBgmConfirm}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="subtitle" className="px-6 pt-6 space-y-4" style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}>
                  <div style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                    <SubtitleSettings
                      timeline={timeline}
                      currentSceneIndex={currentSceneIndex}
                      theme={theme ?? 'light'}
                      setTimeline={setTimeline}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="voice" className="px-6 pt-6 space-y-4 w-full max-w-full overflow-x-hidden relative">
                  {/* 음성 선택 안 했을 때 말풍선 UI */}
                  {showVoiceRequiredMessage && rightPanelTab === 'voice' && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50 animate-bounce">
                      {scenesWithoutVoice.length > 0 
                        ? `씬 ${scenesWithoutVoice.join(', ')}에 음성을 선택해주세요`
                        : '음성을 먼저 선택해주세요'}
                    </div>
                  )}
                  <div className="w-full max-w-full overflow-x-hidden box-border">
                    <VoiceSelector
                      theme={theme ?? 'light'}
                      title="목소리 선택"
                      disabled={!timeline || currentSceneIndex < 0}
                      layout="panel"
                      sceneVoiceTemplate={sceneVoiceTemplate}
                      onSceneVoiceTemplateChange={onVoiceTemplateChange ? (voiceTemplate: string | null) => {
                        if (currentSceneIndex >= 0) {
                          onVoiceTemplateChange(currentSceneIndex, voiceTemplate)
                        }
                      } : undefined}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="sound" className="px-6 pt-6 w-full max-w-full overflow-x-hidden">
                  <div className="w-full max-w-full overflow-x-hidden box-border">
                    <SoundEffectSelector 
                      soundEffect={soundEffect} 
                      theme={theme ?? 'light'} 
                      setSoundEffect={setSoundEffect}
                      onSoundEffectConfirm={onSoundEffectConfirm}
                      timeline={timeline}
                      currentSceneIndex={currentSceneIndex}
                      setTimeline={setTimeline}
                    />
                  </div>
                </TabsContent>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

