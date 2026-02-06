'use client'

import { useState, useCallback } from 'react'

/**
 * Pro step3 효과 패널 및 사운드 상태 관리 훅
 * 
 * rightPanelTab, confirmedBgmTemplate, soundEffect, confirmedSoundEffect 등
 * 효과 패널/사운드 관련 상태를 묶어서 관리합니다.
 * 
 * @returns rightPanelTab - 현재 선택된 효과 패널 탭
 * @returns setRightPanelTab - 효과 패널 탭 설정 함수
 * @returns confirmedBgmTemplate - 확정된 BGM 템플릿
 * @returns setConfirmedBgmTemplate - BGM 템플릿 확정 함수
 * @returns soundEffect - 선택된 사운드 효과
 * @returns setSoundEffect - 사운드 효과 설정 함수
 * @returns confirmedSoundEffect - 확정된 사운드 효과
 * @returns setConfirmedSoundEffect - 사운드 효과 확정 함수
 * @returns handleBgmConfirm - BGM 확인 핸들러
 * @returns handleSoundEffectConfirm - 사운드 효과 확인 핸들러
 */
export function useProStep3State() {
  const [rightPanelTab, setRightPanelTab] = useState<string>('animation')
  const [confirmedBgmTemplate, setConfirmedBgmTemplate] = useState<string | null>(null)
  const [soundEffect, setSoundEffect] = useState<string | null>(null)
  const [confirmedSoundEffect, setConfirmedSoundEffect] = useState<string | null>(null)

  // BGM 확인 핸들러
  const handleBgmConfirm = useCallback((templateId: string | null) => {
    setConfirmedBgmTemplate(templateId)
  }, [])

  // 사운드 효과 확인 핸들러
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
