'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown, Camera, Bot, MessageSquare, X, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
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
  const [isStyleConfirmed] = useState(false)
  const [openToneExampleId, setOpenToneExampleId] = useState<string | null>(null)

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
  const handleToneExampleToggle = (toneId: string, open: boolean) => {
    setOpenToneExampleId(open ? toneId : null)
  }

  // const handleConfirmStyle = () => {
  //   if (!selectedScriptStyle || !selectedTone) {
  //     alert('대본 스타일과 말투를 선택해주세요.')
  //     return
  //   }
  //   setIsStyleConfirmed(true)
  //   setExpandedConceptId(null)
  // }

  // const handleCancelConfirm = () => {
  //   setIsStyleConfirmed(false)
  //   setExpandedConceptId(selectedScriptStyle)
  // }

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
                  직접 촬영하거나, AI에게 모두 맡겨 자동 제작할 수 있어요.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 직접 촬영하기 - 준비 중 */}
                <Card
                  className={`relative transition-all overflow-hidden ${
                    theme === 'dark'
                      ? 'border-gray-700 bg-gray-900'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* 준비 중 오버레이 */}
                  <div className={`absolute inset-0 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6 ${
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-gray-950/1 via-gray-900/30 to-gray-950/30'
                      : 'bg-gradient-to-br from-white/1 via-gray-50/40 to-white/40'
                  }`}>
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="relative">
                        <div className={`absolute inset-0 rounded-full blur-md animate-pulse ${
                          theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-400/30'
                        }`} />
                        <div className={`relative p-4 rounded-full ${
                          theme === 'dark' 
                            ? 'bg-purple-900/50' 
                            : 'bg-purple-100 border-2 border-purple-200'
                        }`}>
                          <Clock className={`w-8 h-8 ${
                            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                          }`} />
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className={`flex items-center justify-center gap-2 mb-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          <Sparkles className={`w-5 h-5 ${
                            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                          }`} />
                          <span className="text-lg font-semibold">준비 중</span>
                        </div>
                        <p className={`text-sm text-center ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          열심히 제작중이에요!
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Camera className={`h-6 w-6 ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-300'
                      }`} />
                      <CardTitle className={`text-xl ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-300'
                      }`}>
                        직접 촬영하기
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className={`text-base ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
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
                      <CardTitle className="text-xl">3분안에 영상 제작하기</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      AI가 대본과 장면을 구성하고, 이미지 기반 자동으로 영상을 제작합니다.
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
                              const isExampleOpen = openToneExampleId === toneOption.id
                              const exampleText = toneExamples[toneOption.id] || '예시 텍스트가 준비 중입니다.'
                              return (
                                <div key={toneOption.id} className="flex items-center gap-2">
                                  <Popover 
                                    open={isExampleOpen} 
                                    onOpenChange={(open) => handleToneExampleToggle(toneOption.id, open)}
                                  >
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => e.stopPropagation()}
                                        className={`p-1.5 rounded transition-colors ${
                                          isExampleOpen
                                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                            : theme === 'dark'
                                              ? 'text-gray-400 hover:text-purple-400 hover:bg-purple-900/20'
                                              : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
                                        }`}
                                        disabled={isStyleConfirmed}
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                      </button>
                                    </PopoverTrigger>
                                    
                                    {/* 말풍선 Popover */}
                                    <PopoverContent
                                      side="bottom"
                                      align="start"
                                      sideOffset={12}
                                      className={`w-80 p-4 relative ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                          <span className={`text-sm font-semibold ${
                                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                                          }`}>
                                            {conceptOption.label}
                                          </span>
                                          <button
                                            onClick={() => setOpenToneExampleId(null)}
                                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                            }`}
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                        <div className={`rounded-md border p-3 text-sm whitespace-pre-line ${
                                          theme === 'dark' 
                                            ? 'border-gray-700 bg-gray-900 text-gray-200' 
                                            : 'border-gray-200 bg-gray-50 text-gray-900'
                                        }`}>
                                          {exampleText}
                                        </div>
                                      </div>
                                      
                                      {/* 말풍선 화살표 */}
                                      <div
                                        className="absolute left-4 -translate-x-0 w-0 h-0"
                                        style={{
                                          top: '-8px',
                                          borderLeft: '8px solid transparent',
                                          borderRight: '8px solid transparent',
                                          borderBottom: `8px solid ${theme === 'dark' ? '#1f2937' : '#ffffff'}`,
                                        }}
                                      />
                                      <div
                                        className="absolute left-4 -translate-x-0 w-0 h-0"
                                        style={{
                                          top: '-9px',
                                          borderLeft: '9px solid transparent',
                                          borderRight: '9px solid transparent',
                                          borderBottom: `9px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  
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
