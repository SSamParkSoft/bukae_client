'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PenTool, Bot, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import ConceptToneDialog from '@/components/ConceptToneDialog'

export default function ScriptMethodPage() {
  const router = useRouter()
  const { scriptMethod, setScriptMethod } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [showConceptDialog, setShowConceptDialog] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'edit' | 'auto'>(scriptMethod || 'edit')

  const handleMethodChange = (value: string) => {
    const method = value as 'edit' | 'auto'
    setSelectedMethod(method)
    if (method === 'auto') {
      setShowConceptDialog(true)
    }
  }

  const handleNext = () => {
    setScriptMethod(selectedMethod)
    router.push('/video/create/step2')
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
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <h1 className={`text-3xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  대본 생성 방법 선택
                </h1>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                  UPDATE
                </Badge>
              </div>
            </div>

            <RadioGroup value={selectedMethod} onValueChange={handleMethodChange} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 옵션 1: AI로 생성하고 직접 편집 */}
              <Card className={`cursor-pointer transition-all ${
                selectedMethod === 'edit'
                  ? 'border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : theme === 'dark'
                    ? 'border-gray-700 bg-gray-800'
                    : 'border-gray-200 bg-white'
              }`}>
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
              <Card className={`cursor-pointer transition-all ${
                selectedMethod === 'auto'
                  ? 'border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : theme === 'dark'
                    ? 'border-gray-700 bg-gray-800'
                    : 'border-gray-200 bg-white'
              }`}>
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
                  {selectedMethod === 'auto' && (
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
                        onClick={() => setShowConceptDialog(true)}
                        className="ml-auto"
                      >
                        선택 &gt;
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </RadioGroup>

            <div className="flex justify-end mt-8">
              <Button onClick={handleNext} size="lg" className="gap-2">
                <span>다음 단계</span>
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

