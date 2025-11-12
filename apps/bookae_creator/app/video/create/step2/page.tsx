'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, CheckCircle } from 'lucide-react'
import { useVideoCreateStore } from '../../../../store/useVideoCreateStore'
import { useThemeStore } from '../../../../store/useThemeStore'
import StepIndicator from '../../../../components/StepIndicator'

const creationSteps = [
  { id: 1, message: 'AI가 스크립트를 생성중입니다...', duration: 2000 },
  { id: 2, message: 'AI가 영상 콘텐츠를 분석중입니다...', duration: 2000 },
  { id: 3, message: 'AI가 영상을 제작중입니다...', duration: 3000 },
  { id: 4, message: '최종 검토 중입니다...', duration: 1000 },
]

export default function Step2Page() {
  const router = useRouter()
  const { setIsCreating, setCreationProgress } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  useEffect(() => {
    setIsCreating(true)
    let stepIndex = 0

    const processSteps = () => {
      if (stepIndex < creationSteps.length) {
        const step = creationSteps[stepIndex]
        setCurrentStep(step.id)
        setCreationProgress(((stepIndex + 1) / creationSteps.length) * 100)

        setTimeout(() => {
          setCompletedSteps((prev) => [...prev, step.id])
          stepIndex++
          if (stepIndex < creationSteps.length) {
            processSteps()
          } else {
            setIsCreating(false)
            setTimeout(() => {
              router.push('/video/create/step3')
            }, 500)
          }
        }, step.duration)
      }
    }

    processSteps()

    return () => {
      setIsCreating(false)
    }
  }, [router, setIsCreating, setCreationProgress])

  const currentStepData = creationSteps.find((s) => s.id === currentStep)

  return (
    <div className="flex min-h-screen">
      <StepIndicator />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-full">
          <div className={`text-center mb-8 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            <h1 className="text-3xl font-bold mb-2">영상 제작 중</h1>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              AI가 영상을 제작하고 있습니다. 잠시만 기다려주세요.
            </p>
          </div>

          {/* 진행 단계 표시 */}
          <div className={`w-full rounded-lg shadow-sm border p-8 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="space-y-6">
              {creationSteps.map((step) => {
                const isActive = currentStep === step.id
                const isCompleted = completedSteps.includes(step.id)
                const isPending = !isActive && !isCompleted

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                      isActive
                        ? theme === 'dark'
                          ? 'bg-purple-900/30 border-2 border-purple-600'
                          : 'bg-purple-50 border-2 border-purple-500'
                        : theme === 'dark'
                          ? 'bg-gray-900 border border-gray-700'
                          : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : isActive ? (
                        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                      ) : (
                        <div className={`w-6 h-6 rounded-full border-2 ${
                          theme === 'dark'
                            ? 'border-gray-600'
                            : 'border-gray-300'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        isActive
                          ? theme === 'dark'
                            ? 'text-purple-300'
                            : 'text-purple-700'
                          : isCompleted
                            ? theme === 'dark'
                              ? 'text-gray-300'
                              : 'text-gray-700'
                            : theme === 'dark'
                              ? 'text-gray-500'
                              : 'text-gray-400'
                      }`}>
                        {step.message}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 진행률 바 */}
          <div className={`w-full mt-8 rounded-lg shadow-sm border p-6 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-center gap-4 mb-4">
              <Sparkles className={`w-6 h-6 ${
                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
              }`} />
              <span className={`font-medium ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                AI가 열심히 작업 중입니다...
              </span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{
                  width: `${((currentStep - 1) / creationSteps.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

