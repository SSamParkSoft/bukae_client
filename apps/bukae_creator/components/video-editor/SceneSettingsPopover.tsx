'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { TimelineScene } from '@/lib/types/domain/timeline'
import { transitionLabels } from '@/lib/data/transitions'
import { findSoundEffectMetadataByPath } from '@/lib/data/sound-effects'
import { voiceTemplateHelpers } from '@/store/useVideoCreateStore'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'

export interface SceneSettingsContentProps {
  scene: TimelineScene | undefined
  globalVoiceTemplate: string | null
  isGrouped?: boolean
  groupFirstScene?: TimelineScene
}

/** 씬 설정 정보(애니메이션/자막/음성/효과음) - Popover·드롭다운 등에서 공용 */
export function SceneSettingsContent({
  scene,
  globalVoiceTemplate,
  isGrouped = false,
  groupFirstScene,
}: SceneSettingsContentProps) {
  if (!scene) {
    return null
  }

  const sceneVoiceTemplate = scene.voiceTemplate || globalVoiceTemplate
  const voiceName = sceneVoiceTemplate
    ? (() => {
        const voiceInfo = voiceTemplateHelpers.getVoiceInfo(sceneVoiceTemplate)
        return voiceInfo?.displayName || sceneVoiceTemplate
      })()
    : '선택 안 됨'
  const transitionName = transitionLabels[scene.transition] || scene.transition || '없음'
  const soundEffectName = scene.soundEffect
    ? (() => {
        const metadata = findSoundEffectMetadataByPath(scene.soundEffect)
        return metadata?.label || scene.soundEffect
      })()
    : '없음'
  const textSettings = scene.text
  const fontFamily = textSettings?.font ? resolveSubtitleFontFamily(textSettings.font) : '기본'
  const fontSize = textSettings?.fontSize || 80
  const color = textSettings?.color || '#ffffff'
  const fontWeight = textSettings?.fontWeight || (textSettings?.style?.bold ? 700 : 400)
  const displayTransition = isGrouped && groupFirstScene
    ? transitionLabels[groupFirstScene.transition] || groupFirstScene.transition || '없음'
    : transitionName

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-1">애니메이션</div>
        <div className="text-sm text-gray-900">{displayTransition}</div>
      </div>
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-1">자막 설정</div>
        <div className="space-y-1 text-sm text-gray-900">
          <div>폰트: {fontFamily}</div>
          <div>크기: {fontSize}px</div>
          <div>색상: <span className="inline-block w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: color }} /> {color}</div>
          <div>굵기: {fontWeight}</div>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-1">음성</div>
        <div className="text-sm text-gray-900">{voiceName}</div>
      </div>
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-1">효과음</div>
        <div className="text-sm text-gray-900">{soundEffectName}</div>
      </div>
    </div>
  )
}

interface SceneSettingsPopoverProps {
  scene: TimelineScene | undefined
  globalVoiceTemplate: string | null
  isGrouped?: boolean
  groupFirstScene?: TimelineScene // 그룹의 첫 번째 씬 (애니메이션 공통 표시용)
  children: React.ReactNode
}

export function SceneSettingsPopover({
  scene,
  globalVoiceTemplate,
  isGrouped = false,
  groupFirstScene,
  children,
}: SceneSettingsPopoverProps) {
  if (!scene) {
    return <>{children}</>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <SceneSettingsContent
          scene={scene}
          globalVoiceTemplate={globalVoiceTemplate}
          isGrouped={isGrouped}
          groupFirstScene={groupFirstScene}
        />
      </PopoverContent>
    </Popover>
  )
}
