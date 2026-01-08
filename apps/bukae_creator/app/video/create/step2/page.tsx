'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown, Camera, Bot, MessageSquare, X, Clock, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import StepIndicator from '@/components/StepIndicator'
import { useStep2Container } from './hooks/useStep2Container'
import type { ConceptType } from '@/lib/data/templates'

export default function Step2Page() {
  const container = useStep2Container()

  // 토큰 검증 중에는 로딩 표시
  if (container.isValidatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className={container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>인증 확인 중...</p>
        </div>
      </div>
    )
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
                  container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  제작 방식 선택
                </h1>
                <p className={`mt-2 ${
                  container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  직접 촬영하거나, AI에게 모두 맡겨 자동 제작할 수 있어요.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 직접 촬영하기 - 준비 중 */}
                <Card
                  className={`relative transition-all overflow-hidden ${
                    container.theme === 'dark'
                      ? 'border-gray-700 bg-gray-900'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* 준비 중 오버레이 */}
                  <div className={`absolute inset-0 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6 ${
                    container.theme === 'dark'
                      ? 'bg-gradient-to-br from-gray-950/1 via-gray-900/30 to-gray-950/30'
                      : 'bg-gradient-to-br from-white/1 via-gray-50/40 to-white/40'
                  }`}>
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="relative">
                        <div className={`absolute inset-0 rounded-full blur-md animate-pulse ${
                          container.theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-400/30'
                        }`} />
                        <div className={`relative p-4 rounded-full ${
                          container.theme === 'dark' 
                            ? 'bg-purple-900/50' 
                            : 'bg-purple-100 border-2 border-purple-200'
                        }`}>
                          <Clock className={`w-8 h-8 ${
                            container.theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                          }`} />
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className={`flex items-center justify-center gap-2 mb-2 ${
                          container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          <Sparkles className={`w-5 h-5 ${
                            container.theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                          }`} />
                          <span className="text-lg font-semibold">준비 중</span>
                        </div>
                        <p className={`text-sm text-center ${
                          container.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          열심히 제작중이에요!
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Camera className={`h-6 w-6 ${
                        container.theme === 'dark' ? 'text-gray-500' : 'text-gray-300'
                      }`} />
                      <CardTitle className={`text-xl ${
                        container.theme === 'dark' ? 'text-gray-500' : 'text-gray-300'
                      }`}>
                        직접 촬영하기
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className={`text-base ${
                      container.theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      AI가 대본을 만들어 주고, 사용자가 직접 촬영한 영상을 업로드하여 제작합니다.
                    </CardDescription>
                  </CardContent>
                </Card>

                {/* AI에게 모두 맡기기 */}
                <Card
                  onClick={() => container.handleModeSelect('auto')}
                  className={`cursor-pointer transition-all ${
                    container.creationMode === 'auto'
                      ? 'border-2 border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : container.theme === 'dark'
                        ? 'border-gray-700 bg-gray-900 hover:border-teal-500'
                        : 'border-gray-200 bg-white hover:border-teal-500'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Bot className={`h-6 w-6 ${
                        container.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`} />
                      <CardTitle className="text-xl">3분이내 영상 제작하기</CardTitle>
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
            {!container.creationMode && (
              <Card className={container.theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}>
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

            {container.creationMode && (
              <section className="space-y-6">
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${
                    container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    대본 및 스크립트 스타일 선택
                  </h2>
                  <p className={`mt-2 ${
                    container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    원하는 대본 및 스크립트 스타일과 말투를 선택해주세요
                  </p>
                </div>

                <div className="space-y-6">
                {container.conceptOptions.map((conceptOption) => {
                  const tones = container.conceptTones[conceptOption.id]
                  const toneTiers = Array.from(new Set(tones.map((tone) => tone.tier)))
                  const isConceptSelected = container.selectedScriptStyle === conceptOption.id
                  const isDimmed = container.selectedScriptStyle !== null && !isConceptSelected
                  const selectedToneLabel =
                    isConceptSelected
                      ? tones.find((tone) => tone.id === container.selectedTone)?.label
                      : null
                  const cardBaseClass =
                    container.theme === 'dark'
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
                        onClick={() => container.handleConceptToggle(conceptOption.id)}
                        className="cursor-pointer"
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
                              container.expandedConceptId === conceptOption.id ? 'rotate-180' : ''
                            } ${container.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                          />
                        </div>
                      </CardHeader>
                      {container.expandedConceptId === conceptOption.id && (
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {tones.map((toneOption) => {
                              const isToneSelected = container.selectedScriptStyle === conceptOption.id && container.selectedTone === toneOption.id
                              const isExampleOpen = container.openToneExampleId === toneOption.id
                              const exampleText = container.toneExamples[toneOption.id] || '예시 텍스트가 준비 중입니다.'
                              return (
                                <div key={toneOption.id} className="flex items-center gap-2">
                                  <Popover 
                                    open={isExampleOpen} 
                                    onOpenChange={(open) => container.handleToneExampleToggle(toneOption.id, open)}
                                  >
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={(e) => e.stopPropagation()}
                                        className={`p-1.5 rounded transition-colors ${
                                          isExampleOpen
                                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                            : container.theme === 'dark'
                                              ? 'text-gray-400 hover:text-purple-400 hover:bg-purple-900/20'
                                              : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
                                        }`}
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                      </button>
                                    </PopoverTrigger>
                                    
                                    {/* 말풍선 Popover */}
                                    <PopoverContent
                                      side="top"
                                      align="start"
                                      sideOffset={12}
                                      className={`w-80 p-4 relative ${container.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                          <span className={`text-sm font-semibold ${
                                            container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                                          }`}>
                                            {conceptOption.label}
                                          </span>
                                          <button
                                            onClick={() => container.setOpenToneExampleId(null)}
                                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                                              container.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                            }`}
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                        <div className={`rounded-md border p-3 text-sm whitespace-pre-line ${
                                          container.theme === 'dark' 
                                            ? 'border-gray-700 bg-gray-900 text-gray-200' 
                                            : 'border-gray-200 bg-gray-50 text-gray-900'
                                        }`}>
                                          {exampleText}
                                        </div>
                                      </div>
                                      
                                      {/* 말풍선 화살표 (아래쪽을 향함) */}
                                      <div
                                        className="absolute left-4 -translate-x-0 w-0 h-0"
                                        style={{
                                          bottom: '-8px',
                                          borderLeft: '8px solid transparent',
                                          borderRight: '8px solid transparent',
                                          borderTop: `8px solid ${container.theme === 'dark' ? '#1f2937' : '#ffffff'}`,
                                        }}
                                      />
                                      <div
                                        className="absolute left-4 -translate-x-0 w-0 h-0"
                                        style={{
                                          bottom: '-9px',
                                          borderLeft: '9px solid transparent',
                                          borderRight: '9px solid transparent',
                                          borderTop: `8px solid ${container.theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  
                                  <div className="relative flex-1">
                                    <Popover 
                                      open={container.showConfirmPopover && isToneSelected && container.confirmPopoverToneId === toneOption.id} 
                                      onOpenChange={(open) => {
                                        if (!open) {
                                          container.setShowConfirmPopover(false)
                                          container.setConfirmPopoverToneId(null)
                                        }
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          onClick={() => container.handleScriptStyleSelect(conceptOption.id, toneOption.id)}
                                          className={`w-full justify-start ${
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
                                      </PopoverTrigger>
                                      
                                      {/* 확정하시겠어요? 말풍선 (위쪽으로 표시) */}
                                      <PopoverContent
                                        side="top"
                                        align="center"
                                        sideOffset={12}
                                        className={`w-80 p-5 relative ${container.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="space-y-4">
                                          {/* 메인 질문 */}
                                          <div className={`text-base font-semibold ${
                                            container.theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
                                          }`}>
                                            이 스타일로 확정하시겠어요?
                                          </div>
                                          
                                          {/* 선택된 스타일 표시 입력 필드 */}
                                          <Input
                                            value={toneOption.label}
                                            readOnly
                                            disabled
                                            className={`${
                                              container.theme === 'dark' 
                                                ? 'bg-gray-900 border-gray-700 text-gray-100' 
                                                : 'bg-gray-50 border-gray-200 text-gray-900'
                                            } cursor-default pointer-events-none`}
                                            onClick={(e) => e.preventDefault()}
                                            onFocus={(e) => e.target.blur()}
                                          />
                                          
                                          {/* 버튼들 */}
                                          <div className="flex gap-2 pt-1">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={container.handleReselect}
                                              className={`flex-1 ${
                                                container.theme === 'dark'
                                                  ? 'bg-white border-gray-300 text-gray-900 hover:bg-gray-100'
                                                  : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                                              }`}
                                            >
                                              다시 선택하기
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={container.handleConfirmStyle}
                                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                                            >
                                              확정하기
                                            </Button>
                                          </div>
                                        </div>
                                        
                                        {/* 말풍선 화살표 (아래쪽을 향함) */}
                                        <div
                                          className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
                                          style={{
                                            bottom: '-8px',
                                            borderLeft: '8px solid transparent',
                                            borderRight: '8px solid transparent',
                                            borderTop: `8px solid ${container.theme === 'dark' ? '#1f2937' : '#ffffff'}`,
                                          }}
                                        />
                                        <div
                                          className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
                                          style={{
                                            bottom: '-9px',
                                            borderLeft: '9px solid transparent',
                                            borderRight: '9px solid transparent',
                                            borderTop: `8px solid ${container.theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                          }}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
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

            {container.selectedScriptStyle && container.selectedTone && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-end pt-4 gap-3 flex-wrap"
              >

                <Button
                  onClick={container.handleNext}
                  size="lg"
                  className="gap-2"
                  data-next-step-button
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
