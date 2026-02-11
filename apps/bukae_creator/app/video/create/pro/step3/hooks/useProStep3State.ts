'use client'

import { useStep3EffectState } from '@/app/video/create/_hooks/step3'

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
  return useStep3EffectState()
}
