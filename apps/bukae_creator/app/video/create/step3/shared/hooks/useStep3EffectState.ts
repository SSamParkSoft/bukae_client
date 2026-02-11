'use client'

import { useCallback, useState } from 'react'

export function useStep3EffectState() {
  const [rightPanelTab, setRightPanelTab] = useState<string>('animation')
  const [confirmedBgmTemplate, setConfirmedBgmTemplate] = useState<string | null>(null)
  const [soundEffect, setSoundEffect] = useState<string | null>(null)
  const [confirmedSoundEffect, setConfirmedSoundEffect] = useState<string | null>(null)

  const handleBgmConfirm = useCallback((templateId: string | null) => {
    setConfirmedBgmTemplate(templateId)
  }, [])

  const handleSoundEffectConfirm = useCallback((effectId: string | null) => {
    setConfirmedSoundEffect(effectId)
  }, [])

  return {
    rightPanelTab,
    setRightPanelTab,
    confirmedBgmTemplate,
    setConfirmedBgmTemplate,
    soundEffect,
    setSoundEffect,
    confirmedSoundEffect,
    setConfirmedSoundEffect,
    handleBgmConfirm,
    handleSoundEffectConfirm,
  }
}
