'use client'

import { Check } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import classNames from 'classnames'
import { useThemeStore } from '../store/useThemeStore'

const steps = [
  { number: 1, label: '상품 선택', path: '/video/create/step1' },
  { number: 2, label: '영상 제작', path: '/video/create/step2' },
  { number: 3, label: '영상 편집', path: '/video/create/step3' },
  { number: 4, label: '업로드', path: '/video/create/step4' },
]

export default function StepIndicator() {
  const pathname = usePathname()
  const router = useRouter()
  const theme = useThemeStore((state) => state.theme)

  const getCurrentStep = () => {
    if (pathname.includes('/step4')) return 4
    if (pathname.includes('/step3')) return 3
    if (pathname.includes('/step2')) return 2
    return 1
  }

  const currentStep = getCurrentStep()

  const handleStepClick = (stepPath: string) => {
    router.push(stepPath)
  }

  return (
    <div className={`sticky top-0 w-48 h-screen flex flex-col py-6 transition-colors z-10 ${
      theme === 'dark'
        ? 'bg-gray-900 border-gray-800'
        : 'bg-white border-gray-200'
    }`}>
      <div className="px-6 mb-6">
        <h2 className={`text-lg font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          영상 제작 단계
        </h2>
      </div>

      <nav className="flex-1 px-6 space-y-6 overflow-y-auto">
        {steps.map((step, index) => {
          const isActive = currentStep === step.number
          const isCompleted = currentStep > step.number

          return (
            <button
              key={step.number}
              onClick={() => handleStepClick(step.path)}
              className="w-full text-left"
            >
              <div className="flex items-center gap-4">
                <div
                  className={classNames(
                    'flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all',
                    isActive
                      ? theme === 'dark'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-500 text-white'
                      : isCompleted
                        ? theme === 'dark'
                          ? 'bg-purple-900/30 text-purple-300'
                          : 'bg-purple-100 text-purple-700'
                        : theme === 'dark'
                          ? 'bg-gray-800 text-gray-400'
                          : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={classNames(
                      'text-sm font-medium',
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
                    )}
                  >
                    {step.label}
                  </div>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={classNames(
                    'ml-5 mt-4 h-8 w-0.5',
                    isCompleted
                      ? theme === 'dark'
                        ? 'bg-purple-600'
                        : 'bg-purple-500'
                      : theme === 'dark'
                        ? 'bg-gray-800'
                        : 'bg-gray-200'
                  )}
                />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

