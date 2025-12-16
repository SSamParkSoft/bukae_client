'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown, Camera, Bot, MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, type CreationMode } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { conceptOptions, conceptTones, toneExamples, type ConceptType } from '@/lib/data/templates'

export default function Step2Page() {
  const router = useRouter()
  const { 
    creationMode, 
    scriptStyle, 
    tone,
    setScriptStyle, 
    setTone,
    setCreationMode,
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [expandedConceptId, setExpandedConceptId] = useState<ConceptType | null>(null)
  const [selectedScriptStyle, setSelectedScriptStyle] = useState<ConceptType | null>(scriptStyle)
  const [selectedTone, setSelectedTone] = useState<string | null>(tone)
  const [isStyleConfirmed, setIsStyleConfirmed] = useState(false)
  const [expandedToneId, setExpandedToneId] = useState<string | null>(null)

  // 제작 방식 선택
  const handleModeSelect = (mode: CreationMode) => {
    setCreationMode(mode)
  }

  // 대본 스타일 선택
  const handleScriptStyleSelect = (concept: ConceptType, toneId: string) => {
    if (isStyleConfirmed) return

    const isSameSelection = selectedScriptStyle === concept && selectedTone === toneId

    if (isSameSelection) {
      // 같은 것을 다시 클릭하면 선택 해제
      setSelectedScriptStyle(null)
      setSelectedTone(null)
      setScriptStyle(null)
      setTone(null)
      setExpandedConceptId(null)
      return
    }

    setSelectedScriptStyle(concept)
    setSelectedTone(toneId)
    setScriptStyle(concept)
    setTone(toneId)
    setExpandedConceptId(concept)
  }

  // 토글 열기
  const handleConceptToggle = (conceptId: ConceptType) => {
    if (isStyleConfirmed) return
    setExpandedConceptId((prev) => (prev === conceptId ? null : conceptId))
  }

  // 톤 예시 토글
  const handleToneExampleToggle = (e: React.MouseEvent, toneId: string) => {
    e.stopPropagation()
    setExpandedToneId((prev) => (prev === toneId ? null : toneId))
  }

  const handleConfirmStyle = () => {
    if (!selectedScriptStyle || !selectedTone) {
      alert('대본 스타일과 말투를 선택해주세요.')
      return
    }
    setIsStyleConfirmed(true)
    setExpandedConceptId(null)
  }

  const handleCancelConfirm = () => {
    setIsStyleConfirmed(false)
    setExpandedConceptId(selectedScriptStyle)
  }

  // 다음 단계로 이동
  const handleNext = () => {
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
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen justify-center"
    >
      <div className="flex w-full max-w-[1600px]">
        <StepIndicator />
        <div className="flex-1 p-4 md:p-8 overflow-y-auto min-w-0">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* 제작 방식 선택 */}
            <section className="space-y-4">
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  제작 방식 선택
                </h1>
                <p className={`mt-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  직접 촬영하거나, AI에게 모두 맡겨 자동 제작할 수 있습니다.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 직접 촬영하기 */}
                <Card
                  onClick={() => handleModeSelect('manual')}
                  className={`cursor-pointer transition-all ${
                    creationMode === 'manual'
                      ? 'border-2 border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : theme === 'dark'
                        ? 'border-gray-700 bg-gray-900 hover:border-teal-500'
                        : 'border-gray-200 bg-white hover:border-teal-500'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Camera className={`h-6 w-6 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`} />
                      <CardTitle className="text-xl">직접 촬영하기</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      AI가 대본을 만들어 주고, 사용자가 직접 촬영한 영상을 업로드하여 제작합니다.
                    </CardDescription>
                  </CardContent>
                </Card>

                {/* AI에게 모두 맡기기 */}
                <Card
                  onClick={() => handleModeSelect('auto')}
                  className={`cursor-pointer transition-all ${
                    creationMode === 'auto'
                      ? 'border-2 border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : theme === 'dark'
                        ? 'border-gray-700 bg-gray-900 hover:border-teal-500'
                        : 'border-gray-200 bg-white hover:border-teal-500'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Bot className={`h-6 w-6 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`} />
                      <CardTitle className="text-xl">AI에게 모두 맡기기</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      AI가 대본과 장면을 구성하고, 이미지 기반으로 자동으로 영상을 제작합니다.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* 제작 방식을 선택한 뒤 노출 */}
            {!creationMode && (
              <Card className={theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}>
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">대본 및 스크립트 스타일 선택</CardTitle>
                      <CardDescription className="mt-2">
                        제작 방식을 먼저 선택하면 대본 및 스크립트 스타일을 고를 수 있어요.
                      </CardDescription>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {creationMode && (
              <section className="space-y-6">
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    대본 및 스크립트 스타일 선택
                  </h2>
                  <p className={`mt-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    원하는 대본 및 스크립트 스타일과 말투를 선택해주세요
                  </p>
                </div>

                <div className="space-y-6">
                {conceptOptions.map((conceptOption) => {
                  const tones = conceptTones[conceptOption.id]
                  const toneTiers = Array.from(new Set(tones.map((tone) => tone.tier)))
                  const isConceptSelected = selectedScriptStyle === conceptOption.id
                  const isDimmed = selectedScriptStyle !== null && !isConceptSelected
                  const selectedToneLabel =
                    isConceptSelected
                      ? tones.find((tone) => tone.id === selectedTone)?.label
                      : null
                  const cardBaseClass =
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-gray-200'
                  return (
                    <Card
                      key={conceptOption.id}
                      className={`transition-all ${
                        cardBaseClass
                      } ${isDimmed ? 'opacity-40' : ''}`}
                    >
                      <CardHeader
                        onClick={() => handleConceptToggle(conceptOption.id)}
                      className={`cursor-pointer ${isStyleConfirmed ? 'pointer-events-none' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{conceptOption.label}</CardTitle>
                            <div className="flex gap-2 flex-wrap mt-2">
                              {toneTiers.map((tier) => (
                                <Badge
                                  key={tier}
                                  variant={tier === 'LIGHT' ? 'default' : 'secondary'}
                                >
                                  {tier}
                                </Badge>
                              ))}
                            </div>
                            {selectedToneLabel && (
                              <p className="mt-2 text-sm text-purple-500">
                                선택된 스타일: {selectedToneLabel}
                              </p>
                            )}
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 transition-transform ${
                              expandedConceptId === conceptOption.id ? 'rotate-180' : ''
                            } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                          />
                        </div>
                      </CardHeader>
                      {expandedConceptId === conceptOption.id && (
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {tones.map((toneOption) => {
                              const isToneSelected = selectedScriptStyle === conceptOption.id && selectedTone === toneOption.id
                              const isExampleExpanded = expandedToneId === toneOption.id
                              const exampleText = toneExamples[toneOption.id] || '예시 텍스트가 준비 중입니다.'
                              return (
                                <div key={toneOption.id} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => handleToneExampleToggle(e, toneOption.id)}
                                      className={`p-1.5 rounded transition-colors ${
                                        isExampleExpanded
                                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                          : theme === 'dark'
                                            ? 'text-gray-400 hover:text-purple-400 hover:bg-purple-900/20'
                                            : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
                                      }`}
                                      disabled={isStyleConfirmed}
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </button>
                                    <Button
                                      variant="outline"
                                      disabled={isStyleConfirmed}
                                      onClick={() => handleScriptStyleSelect(conceptOption.id, toneOption.id)}
                                      className={`flex-1 justify-start ${
                                        isToneSelected
                                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                          : ''
                                      }`}
                                    >
                                      <span className="flex-1 text-left">{toneOption.label}</span>
                                      <Badge variant={toneOption.tier === 'LIGHT' ? 'default' : 'secondary'} className="ml-2">
                                        {toneOption.tier}
                                      </Badge>
                                    </Button>
                                  </div>
                                  {isExampleExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className={`rounded-lg border p-4 ${
                                        theme === 'dark'
                                          ? 'bg-gray-800 border-gray-700'
                                          : 'bg-blue-50 border-blue-200'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <span className={`text-sm font-semibold ${
                                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                                        }`}>
                                          {conceptOption.label}
                                        </span>
                                        <button
                                          onClick={(e) => handleToneExampleToggle(e, toneOption.id)}
                                          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                          }`}
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                      <p className={`text-sm whitespace-pre-line ${
                                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                      }`}>
                                        {exampleText}
                                      </p>
                                    </motion.div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
                </div>
              </section>
            )}

            {selectedScriptStyle && selectedTone && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-end pt-4 gap-3 flex-wrap"
              >

                <Button
                  onClick={handleNext}
                  size="lg"
                  className="gap-2"
                >
                  다음 단계
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
