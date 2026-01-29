import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BgmSelector } from '@/components/video-editor/BgmSelector'
import { SoundEffectSelector } from '@/components/video-editor/SoundEffectSelector'
import { SubtitleSettings } from '@/components/video-editor/SubtitleSettings'
import VoiceSelector from '@/components/VoiceSelector'
import { cn } from '@/lib/utils'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { MotionConfig, MotionType } from '@/hooks/video/effects/motion/types'

type EffectsTabId = 'animation' | 'bgm' | 'subtitle' | 'voice' | 'template' | 'sound'

interface EffectsTabConfig {
  id: EffectsTabId
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

// SVG 아이콘 컴포넌트들
const AnimationIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M11.4095 2L14.4865 7.113L20.2995 8.459L16.3885 12.965L16.9045 18.91L11.4095 16.582L5.91553 18.91L6.43153 12.965L2.51953 8.46L8.33253 7.114L11.4095 2Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M19.9593 22.3566L18.8973 21.2966M21.6773 16.2416L20.6173 15.1816M13.3803 22.3566L12.3203 21.2966" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
  </svg>
)

const BgmIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M3 17C3 17.7956 3.31607 18.5587 3.87868 19.1213C4.44129 19.6839 5.20435 20 6 20C6.79565 20 7.55871 19.6839 8.12132 19.1213C8.68393 18.5587 9 17.7956 9 17C9 16.2044 8.68393 15.4413 8.12132 14.8787C7.55871 14.3161 6.79565 14 6 14C5.20435 14 4.44129 14.3161 3.87868 14.8787C3.31607 15.4413 3 16.2044 3 17ZM13 17C13 17.7956 13.3161 18.5587 13.8787 19.1213C14.4413 19.6839 15.2044 20 16 20C16.7956 20 17.5587 19.6839 18.1213 19.1213C18.6839 18.5587 19 17.7956 19 17C19 16.2044 18.6839 15.4413 18.1213 14.8787C17.5587 14.3161 16.7956 14 16 14C15.2044 14 14.4413 14.3161 13.8787 14.8787C13.3161 15.4413 13 16.2044 13 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 17V4H19V17M9 8H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SubtitleIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M5 20C4.45 20 3.97933 19.8043 3.588 19.413C3.19667 19.0217 3.00067 18.5507 3 18V6C3 5.45 3.196 4.97933 3.588 4.588C3.98 4.19667 4.45067 4.00067 5 4H19C19.55 4 20.021 4.196 20.413 4.588C20.805 4.98 21.0007 5.45067 21 6V18C21 18.55 20.8043 19.021 20.413 19.413C20.0217 19.805 19.5507 20.0007 19 20H5ZM5 18H19V6H5V18ZM7 15H10C10.2833 15 10.521 14.904 10.713 14.712C10.905 14.52 11.0007 14.2827 11 14V13H9.5V13.5H7.5V10.5H9.5V11H11V10C11 9.71667 10.904 9.47933 10.712 9.288C10.52 9.09667 10.2827 9.00067 10 9H7C6.71667 9 6.47933 9.096 6.288 9.288C6.09667 9.48 6.00067 9.71733 6 10V14C6 14.2833 6.096 14.521 6.288 14.713C6.48 14.905 6.71733 15.0007 7 15ZM14 15H17C17.2833 15 17.521 14.904 17.713 14.712C17.905 14.52 18.0007 14.2827 18 14V13H16.5V13.5H14.5V10.5H16.5V11H18V10C18 9.71667 17.904 9.47933 17.712 9.288C17.52 9.09667 17.2827 9.00067 17 9H14C13.7167 9 13.4793 9.096 13.288 9.288C13.0967 9.48 13.0007 9.71733 13 10V14C13 14.2833 13.096 14.521 13.288 14.713C13.48 14.905 13.7173 15.0007 14 15Z" fill="currentColor"/>
  </svg>
)

const VoiceIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M8 12.0007C10.28 12.0007 12 10.2807 12 8.00072C12 5.72072 10.28 4.00072 8 4.00072C5.72 4.00072 4 5.72072 4 8.00072C4 10.2807 5.72 12.0007 8 12.0007ZM8 6.00072C9.178 6.00072 10 6.82272 10 8.00072C10 9.17872 9.178 10.0007 8 10.0007C6.822 10.0007 6 9.17872 6 8.00072C6 6.82272 6.822 6.00072 8 6.00072ZM9 13.0007H7C4.243 13.0007 2 15.2437 2 18.0007V19.0007H4V18.0007C4 16.3467 5.346 15.0007 7 15.0007H9C10.654 15.0007 12 16.3467 12 18.0007V19.0007H14V18.0007C14 15.2437 11.757 13.0007 9 13.0007ZM18.364 2.63672L16.95 4.05072C18.271 5.37372 19 7.13172 19 9.00072C19 10.8697 18.271 12.6277 16.95 13.9507L18.364 15.3647C20.064 13.6637 21 11.4037 21 9.00072C21 6.59772 20.064 4.33772 18.364 2.63672Z" fill="currentColor"/>
    <path d="M15.5351 5.46484L14.1211 6.88084C14.6881 7.44584 15.0001 8.19884 15.0001 9.00084C15.0001 9.80284 14.6881 10.5558 14.1211 11.1208L15.5351 12.5368C16.4791 11.5928 17.0001 10.3378 17.0001 9.00084C17.0001 7.66384 16.4791 6.40884 15.5351 5.46484Z" fill="currentColor"/>
  </svg>
)

const SoundIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M7.19989 15.8023H4V8.60078H7.19989M7.19989 15.8023L13.6021 19.4031V5L7.19989 8.60078M7.19989 15.8023V8.60078M16.7948 13.4066C17.0574 13.0594 17.1996 12.6359 17.1998 12.2005C17.1999 11.7651 17.058 11.3415 16.7956 10.9941M19.028 15.0966C19.6583 14.2633 19.9996 13.2472 20 12.2024C20.0004 11.1576 19.66 10.1411 19.0304 9.30733" stroke="currentColor" strokeWidth="1.60035" strokeLinecap="square"/>
  </svg>
)

const TemplateIcon = ({ className }: { className?: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 9.33333V20H10.2222M20 9.33333H4M20 9.33333V4H4V9.33333M20 9.33333H10.2222M10.2222 20H4V9.33333M10.2222 20V9.33333M4 9.33333H10.2222" stroke="currentColor" strokeWidth="1.77778"/>
  </svg>
)

const EFFECTS_TABS: EffectsTabConfig[] = [
  { id: 'animation', label: '전환', Icon: AnimationIcon },
  { id: 'bgm', label: 'BGM', Icon: BgmIcon },
  { id: 'subtitle', label: '자막', Icon: SubtitleIcon },
  { id: 'voice', label: '보이스', Icon: VoiceIcon },
  { id: 'sound', label: '사운드', Icon: SoundIcon },
  { id: 'template', label: '템플릿', Icon: TemplateIcon },
]

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
  const transitionsWithoutNone = displayTransitions.filter((t) => t.value !== 'none')
  
  // 현재 씬의 voiceTemplate 계산 (씬별 voiceTemplate이 있으면 사용, 없으면 전역 voiceTemplate 사용)
  const sceneVoiceTemplate = timeline && currentSceneIndex >= 0
    ? (timeline.scenes[currentSceneIndex]?.voiceTemplate || globalVoiceTemplate)
    : globalVoiceTemplate
  
  return (
    <div className="w-full flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <Tabs
          value={rightPanelTab}
          onValueChange={setRightPanelTab}
          className="h-full flex flex-col"
          style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}
        >
          {/* 탭바와 내용을 하나의 박스로 연결 */}
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            <div className="bg-white/60 rounded-2xl flex flex-col h-full overflow-hidden" style={{ overflowY: 'hidden', overflowX: 'visible' }}>
              {/* 탭바 - 패널과 같은 너비로 상단을 채움 */}
              <div className="px-1 shrink-0 w-full overflow-x-auto overflow-y-visible scrollbar-hide">
                <TabsList
                  className={cn(
                    'w-full h-auto bg-white rounded-b-none scrollbar-hide inline-flex items-center rounded-t-2xl'
                  )}
                  style={{ minWidth: '100%' }}
                >
                  {EFFECTS_TABS.map(({ id, label, Icon }) => {
                    const isActive = rightPanelTab === id
                    return (
                      <TabsTrigger
                        key={id}
                        value={id}
                        className={cn(
                          'relative flex flex-1 min-w-0 items-center justify-center gap-2 py-4 sm:py-5',
                          'transition-all whitespace-nowrap text-[14px] tracking-[-0.14px]',
                          // 기본 상태: 옅은 회색 텍스트
                          'text-[#5d5d5d] font-semibold',
                          // 활성 상태: 텍스트만 조금 더 진하게, 배경/그림자는 투명 유지
                          'data-[state=active]:text-[#000000] data-[state=active]:font-bold',
                          'data-[state=active]:bg-transparent data-[state=active]:shadow-none'
                        )}
                      >
                        <span
                          className={cn(
                            'flex items-center gap-2 transition-transform',
                            isActive && 'scale-[1.03]'
                          )}
                        >
                          {isActive && (
                            <Icon
                              className="h-5 w-5 shrink-0 text-[#000000]"
                            />
                          )}
                          <span
                            className={cn(
                              'leading-[20px]',
                              isActive && 'text-[15px] leading-[22px]'
                            )}
                          >
                            {label}
                          </span>
                        </span>
                        {/* 선택된 탭 하단 표시선 */}
                        <span
                          className={cn(
                            'pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] z-10',
                            'transition-opacity duration-200',
                            isActive ? 'opacity-100 bg-[#5e8790]' : 'opacity-0'
                          )}
                        />
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </div>

              {/* 내용 영역 - 스크롤 가능 */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                <TabsContent value="animation" className="px-6 pt-6 w-full max-w-full overflow-x-hidden">
              {/* 전환 효과 섹션 */}
              {displayTransitions.length > 0 && (
                <div className="space-y-4">
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
                      title="보이스 선택"
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

