'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import type { CreationMode } from '@/lib/types/domain/video'
import { useThemeStore } from '@/store/useThemeStore'
import { conceptOptions, conceptTones, toneExamples, type ConceptType } from '@/lib/data/templates'
import { useVideoCreateAuth } from '@/hooks/useVideoCreateAuth'

export function useStep2Container() {
  const router = useRouter()
  const { 
    creationMode, 
    scriptStyle, 
    tone,
    setScriptStyle, 
    setTone,
    setCreationMode,
    setHasUnsavedChanges,
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [expandedConceptId, setExpandedConceptId] = useState<ConceptType | null>(null)
  const [selectedScriptStyle, setSelectedScriptStyle] = useState<ConceptType | null>(scriptStyle)
  const [selectedTone, setSelectedTone] = useState<string | null>(tone)
  const [isStyleConfirmed, setIsStyleConfirmed] = useState(false)
  const [openToneExampleId, setOpenToneExampleId] = useState<string | null>(null)
  const [showConfirmPopover, setShowConfirmPopover] = useState(false)
  const [confirmPopoverToneId, setConfirmPopoverToneId] = useState<string | null>(null)

  // 토큰 검증
  const { isValidatingToken } = useVideoCreateAuth()

  // store의 값이 복원되면 로컬 state 동기화
  useEffect(() => {
    if (scriptStyle) {
      setTimeout(() => {
        setSelectedScriptStyle(scriptStyle)
        setSelectedTone(tone)
        setExpandedConceptId(scriptStyle)
      }, 0)
    }
  }, [scriptStyle, tone]) // eslint-disable-line react-hooks/exhaustive-deps

  // 제작 방식 선택
  const handleModeSelect = useCallback((mode: CreationMode) => {
    setCreationMode(mode)
    setHasUnsavedChanges(true)
  }, [setCreationMode, setHasUnsavedChanges])

  // 대본 스타일 선택
  const handleScriptStyleSelect = useCallback((concept: ConceptType, toneId: string) => {
    const isSameSelection = selectedScriptStyle === concept && selectedTone === toneId

    if (isSameSelection) {
      // 같은 것을 다시 클릭하면 선택 해제
      setSelectedScriptStyle(null)
      setSelectedTone(null)
      setScriptStyle(null)
      setTone(null)
      setExpandedConceptId(null)
      setShowConfirmPopover(false)
      setConfirmPopoverToneId(null)
      setIsStyleConfirmed(false)
      return
    }

    setSelectedScriptStyle(concept)
    setSelectedTone(toneId)
    setScriptStyle(concept)
    setTone(toneId)
    setExpandedConceptId(concept)
    setHasUnsavedChanges(true)
    
    // 새로운 선택 시 확정 상태 해제
    setIsStyleConfirmed(false)
    
    // 확정 말풍선 표시 (위쪽으로)
    setShowConfirmPopover(true)
    setConfirmPopoverToneId(toneId)
  }, [selectedScriptStyle, selectedTone, setScriptStyle, setTone, setHasUnsavedChanges])

  // 토글 열기 (확정 후에도 다시 열 수 있도록)
  const handleConceptToggle = useCallback((conceptId: ConceptType) => {
    setExpandedConceptId((prev) => (prev === conceptId ? null : conceptId))
  }, [])

  // 톤 예시 토글
  const handleToneExampleToggle = useCallback((toneId: string, open: boolean) => {
    setOpenToneExampleId(open ? toneId : null)
  }, [])

  // 스타일 확정하기
  const handleConfirmStyle = useCallback(() => {
    if (!selectedScriptStyle || !selectedTone) {
      alert('대본 스타일과 말투를 선택해주세요.')
      return
    }
    setIsStyleConfirmed(true)
    setShowConfirmPopover(false)
    setExpandedConceptId(null)
    
    // 다음 단계 버튼으로 스크롤
    setTimeout(() => {
      const nextButton = document.querySelector('[data-next-step-button]') as HTMLElement
      if (nextButton) {
        nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }, [selectedScriptStyle, selectedTone])

  // 다시 선택하기
  const handleReselect = useCallback(() => {
    setIsStyleConfirmed(false)
    setShowConfirmPopover(false)
    setConfirmPopoverToneId(null)
    // 토글은 열어두지 않고 닫음 (사용자가 다시 클릭할 수 있도록)
  }, [])

  // 다음 단계로 이동
  const handleNext = useCallback(() => {
    if (!selectedScriptStyle || !selectedTone) {
      alert('대본 스타일과 톤을 선택해주세요.')
      return
    }

    if (creationMode === 'auto') {
      // AI 모드면 Step3 (이미지 선택)로 이동
      router.push('/video/create/step3')
    } else {
      // Manual 모드면 기존 플로우로 (Step3는 편집 단계)
      router.push('/video/create/step3')
    }
  }, [selectedScriptStyle, selectedTone, creationMode, router])

  return {
    // State
    theme,
    isValidatingToken,
    
    // Creation Mode
    creationMode,
    handleModeSelect,
    
    // Script Style
    selectedScriptStyle,
    selectedTone,
    isStyleConfirmed,
    expandedConceptId,
    handleScriptStyleSelect,
    handleConceptToggle,
    handleConfirmStyle,
    handleReselect,
    
    // Tone Examples
    openToneExampleId,
    handleToneExampleToggle,
    
    // Confirm Popover
    showConfirmPopover,
    confirmPopoverToneId,
    setShowConfirmPopover,
    setConfirmPopoverToneId,
    setOpenToneExampleId,
    
    // Navigation
    handleNext,
    
    // Data
    conceptOptions,
    conceptTones,
    toneExamples,
  }
}
