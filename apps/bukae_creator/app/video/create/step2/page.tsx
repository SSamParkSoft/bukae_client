'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { conceptOptions, conceptTones, type ConceptType } from '@/lib/data/templates'

export default function Step2Page() {
  const router = useRouter()
  const { 
    creationMode, 
    scriptStyle, 
    tone,
    setScriptStyle, 
    setTone 
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [expandedConceptId, setExpandedConceptId] = useState<ConceptType | null>(null)
  const [selectedScriptStyle, setSelectedScriptStyle] = useState<ConceptType | null>(scriptStyle)
  const [selectedTone, setSelectedTone] = useState<string | null>(tone)

  // 대본 스타일 선택
  const handleScriptStyleSelect = (concept: ConceptType, toneId: string) => {
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
    setExpandedConceptId((prev) => (prev === conceptId ? null : conceptId))
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
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                대본 및 스크립트 스타일 선택
              </h1>
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
                    aria-disabled={isDimmed || undefined}
                    className={`transition-all ${
                      cardBaseClass
                    } ${isDimmed ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                    <CardHeader
                      onClick={() => handleConceptToggle(conceptOption.id)}
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
                            expandedConceptId === conceptOption.id ? 'rotate-180' : ''
                          } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                        />
                      </div>
                    </CardHeader>
                    {expandedConceptId === conceptOption.id && (
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {tones.map((toneOption) => (
                            <Button
                              key={toneOption.id}
                              variant="outline"
                              onClick={() => handleScriptStyleSelect(conceptOption.id, toneOption.id)}
                              className={`justify-start ${
                                selectedScriptStyle === conceptOption.id && selectedTone === toneOption.id
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : ''
                              }`}
                            >
                              <span className="flex-1 text-left">{toneOption.label}</span>
                              <Badge variant={toneOption.tier === 'LIGHT' ? 'default' : 'secondary'} className="ml-2">
                                {toneOption.tier}
                              </Badge>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>

            {selectedScriptStyle && selectedTone && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end pt-4"
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
