'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PenTool, Bot, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import ConceptToneDialog from '@/components/ConceptToneDialog'

export default function Step2Page() {
  const router = useRouter()
  const { scriptMethod, setScriptMethod, setIsCreating, setCreationProgress } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [showConceptDialog, setShowConceptDialog] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'edit' | 'auto'>(scriptMethod || 'edit')
  const [hasSelected, setHasSelected] = useState(false)
  const [localProgress, setLocalProgress] = useState(0)

  const handleMethodChange = (value: string) => {
    const method = value as 'edit' | 'auto'
    setSelectedMethod(method)
  }

  const handleStart = () => {
    setScriptMethod(selectedMethod)
    setHasSelected(true)
    setLocalProgress(0)
    
    // AI 생성 시작
    setIsCreating(true)
    setCreationProgress(0)
  }

  // 진행률 시뮬레이션 및 3초 후 step3로 이동
  useEffect(() => {
    if (hasSelected) {
      // 초기 진행률을 0으로 설정
      setLocalProgress(0)
      setCreationProgress(0)
      
      // 각 단계별로 30%씩 증가
      // 1초 후: 대본 생성 완료 → 30%
      const timer1 = setTimeout(() => {
        setLocalProgress(30)
        setCreationProgress(30)
      }, 1000)

      // 2초 후: 영상 편집 완료 → 60%
      const timer2 = setTimeout(() => {
        setLocalProgress(60)
        setCreationProgress(60)
      }, 2000)

      // 3초 후: 최종 검토 완료 → 90%
      const timer3 = setTimeout(() => {
        setLocalProgress(90)
        setCreationProgress(90)
      }, 3000)

      // 3.5초 후: 전체 완료 → 100% 및 step3로 이동
      const timer4 = setTimeout(() => {
        setLocalProgress(100)
        setCreationProgress(100)
        setIsCreating(false)
        router.push('/video/create/step3')
      }, 3500)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearTimeout(timer4)
      }
    }
  }, [hasSelected, router, setIsCreating, setCreationProgress])

  // AI 생성 중 UI
  if (hasSelected) {
    const isComplete = localProgress >= 100
    
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
          <div className="flex-1 p-4 md:p-8 overflow-y-auto min-w-0 flex items-center justify-center">
            <div className="max-w-2xl mx-auto text-center space-y-8">
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isComplete ? (
                    <CheckCircle2 className={`w-16 h-16 mx-auto ${
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    }`} />
                  ) : (
                    <Loader2 className={`w-16 h-16 mx-auto animate-spin ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`} />
                  )}
                </motion.div>
                <motion.h1 
                  key={isComplete ? 'complete' : 'creating'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-3xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {isComplete ? '생성 완료!' : 'AI가 영상을 생성하고 있어요'}
                </motion.h1>
                <motion.p 
                  key={isComplete ? 'complete-desc' : 'creating-desc'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-lg ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {isComplete ? '영상 생성이 완료되었습니다!' : '잠시만 기다려주세요...'}
                </motion.p>
              </div>

              {/* 진행률 표시 */}
              <div className="space-y-2">
                <div className={`w-full h-3 rounded-full overflow-hidden ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <motion.div
                    className={`h-full transition-colors ${
                      isComplete
                        ? theme === 'dark' ? 'bg-green-500' : 'bg-green-600'
                        : theme === 'dark' ? 'bg-purple-500' : 'bg-purple-600'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(localProgress, 100)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <motion.p 
                  className={`text-sm font-medium ${
                    isComplete
                      ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}
                  key={Math.round(localProgress)}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                >
                  {Math.round(localProgress)}% 완료
                </motion.p>
              </div>

              {/* 생성 중 단계 표시 */}
              <div className={`rounded-lg p-6 ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
              }`}>
                <div className="space-y-3 text-left">
                  <motion.div 
                    className={`flex items-center gap-3 transition-all ${
                      localProgress >= 30 ? 'opacity-100' : 'opacity-50'
                    }`}
                    animate={localProgress >= 30 ? { x: 0 } : { x: -10 }}
                  >
                    {localProgress >= 30 ? (
                      <CheckCircle2 className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`} />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${
                        theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'
                      }`} />
                    )}
                    <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      {localProgress >= 30 ? '대본 생성 완료' : '대본 생성 중...'}
                    </span>
                  </motion.div>
                  <motion.div 
                    className={`flex items-center gap-3 transition-all ${
                      localProgress >= 60 ? 'opacity-100' : 'opacity-50'
                    }`}
                    animate={localProgress >= 60 ? { x: 0 } : { x: -10 }}
                  >
                    {localProgress >= 60 ? (
                      <CheckCircle2 className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`} />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${
                        theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'
                      }`} />
                    )}
                    <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      {localProgress >= 60 ? '영상 편집 완료' : '영상 편집 중...'}
                    </span>
                  </motion.div>
                  <motion.div 
                    className={`flex items-center gap-3 transition-all ${
                      localProgress >= 90 ? 'opacity-100' : 'opacity-50'
                    }`}
                    animate={localProgress >= 90 ? { x: 0 } : { x: -10 }}
                  >
                    {localProgress >= 90 ? (
                      <CheckCircle2 className={`w-5 h-5 ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`} />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${
                        theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'
                      }`} />
                    )}
                    <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      {localProgress >= 90 ? '최종 검토 완료' : '최종 검토 중...'}
                    </span>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // 선택 UI
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
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <h1 className={`text-3xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  대본 생성 방법 선택
                </h1>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  UPDATE
                </Badge>
              </div>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                AI에게 모두 맡길지, 생성 후 편집할지 선택하세요
              </p>
            </div>

            <RadioGroup value={selectedMethod} onValueChange={handleMethodChange} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 옵션 1: AI로 생성하고 직접 편집 */}
              <Card 
                onClick={() => handleMethodChange('edit')}
                className={`cursor-pointer transition-all ${
                  selectedMethod === 'edit'
                    ? 'border-2 border-teal-500 bg-teal-50 shadow-md dark:bg-teal-900/20'
                    : theme === 'dark'
                      ? 'border-gray-700 bg-gray-900'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <RadioGroupItem value="edit" id="edit" className="mt-1" />
                    <PenTool className={`h-5 w-5 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`} />
                    <CardTitle className="text-xl">AI로 생성하고, 내가 직접 편집하기</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    AI가 생성한 400자 내외의 상품 리뷰 대본을 직접 확인하고 수정할 수 있어요. 내가 직접 편집한 대본으로 스타일에 맞게 완성하고 싶을 때 선택하세요!
                  </CardDescription>
                </CardContent>
              </Card>

              {/* 옵션 2: AI에게 모두 맡기기 */}
              <Card 
                onClick={() => handleMethodChange('auto')}
                className={`cursor-pointer transition-all ${
                  selectedMethod === 'auto'
                    ? 'border-2 border-teal-500 bg-teal-50 shadow-md dark:bg-teal-900/20'
                    : theme === 'dark'
                      ? 'border-gray-700 bg-gray-900'
                      : 'border-gray-200 bg-white'
                }`}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <RadioGroupItem value="auto" id="auto" className="mt-1" />
                    <Bot className={`h-5 w-5 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`} />
                    <CardTitle className="text-xl">AI에게 모두 맡기기</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base mb-4">
                    컨셉과 말투만 선택 해놓으면, AI가 대본을 자동으로 작성하고, 편집 없이 바로 영상에 적용합니다. 빠르게 제작하고 싶을 때 추천해요!
                  </CardDescription>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      컨셉 바이럴형
                    </Badge>
                    <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      말투 이걸 나만 모르고 있었네
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedMethod('auto')
                        setShowConceptDialog(true)
                      }}
                      className="ml-auto"
                    >
                      선택 &gt;
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>

            <div className="flex justify-end mt-8">
              <Button onClick={handleStart} size="lg" className="gap-2">
                <span>시작하기</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConceptToneDialog
        open={showConceptDialog}
        onOpenChange={setShowConceptDialog}
      />
    </motion.div>
  )
}
