'use client'

import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useThemeStore } from '../store/useThemeStore'
import { useVideoCreateStore } from '../store/useVideoCreateStore'
import { motion, AnimatePresence } from 'framer-motion'

const steps = [
  { number: 1, label: '상품 선택', path: '/video/create/step1' },
  { number: 2, label: '대본 및 이미지', path: '/video/create/step2' },
  { number: 3, label: '미리보기 및 편집', path: '/video/create/step3' },
  { number: 4, label: '영상 생성', path: '/video/create/step4' },
]

export default function StepIndicator() {
  const pathname = usePathname()
  const router = useRouter()
  const theme = useThemeStore((state) => state.theme)
  const isCollapsed = useVideoCreateStore((state) => state.isStepIndicatorCollapsed)
  const setIsCollapsed = useVideoCreateStore((state) => state.setIsStepIndicatorCollapsed)

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

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <motion.div
      initial={false}
      animate={{
        width: isCollapsed ? 48 : 208, // 접었을 때: 버튼만 보이도록 48px, 펼쳤을 때: w-52 = 208px
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1], // ease-in-out
      }}
      className={cn(
        'sticky top-0 h-screen flex flex-col py-4 md:py-6 transition-all z-10 shrink-0 overflow-visible',
        theme === 'dark'
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-200',
        isCollapsed 
          ? theme === 'dark'
            ? 'shadow-[4px_0_16px_rgba(0,0,0,0.4)]'
            : 'shadow-[4px_0_16px_rgba(0,0,0,0.2)]'
          : ''
      )}
    >
      <div className="px-6 mb-6">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'text-lg font-semibold whitespace-nowrap',
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              )}
            >
              영상 제작 단계
            </motion.h2>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex flex-col relative">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.nav
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 px-6 space-y-6 overflow-y-auto"
            >
            {steps.map((step, index) => {
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number

              return (
                <div key={step.number} className="w-full">
                  <Button
                    variant="ghost"
                    onClick={() => handleStepClick(step.path)}
                    className="w-full justify-start p-0 h-auto"
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div
                        className={cn(
                          'flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all shrink-0',
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
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'text-sm font-medium truncate',
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
                  </Button>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
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
                </div>
              )
            })}
            </motion.nav>
          )}
        </AnimatePresence>

        {/* 오른쪽 가장자리에 토글 버튼 배치 - 미리보기와 겹치지 않도록 충분히 오른쪽으로 */}
        <div 
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full z-30"
          style={{ 
            marginRight: '32px',
            minWidth: '48px',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Button
            variant="ghost"
            onClick={toggleCollapse}
            className={cn(
              'h-12 w-12 p-0 rounded-full flex items-center justify-center shrink-0',
              'hover:bg-opacity-80 transition-all relative',
              isCollapsed
                ? theme === 'dark'
                  ? 'bg-purple-600 hover:bg-purple-700 border-2 border-purple-500 shadow-lg'
                  : 'bg-purple-500 hover:bg-purple-600 border-2 border-purple-400 shadow-lg'
                : theme === 'dark'
                  ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700 shadow-lg'
                  : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-lg'
            )}
            aria-label={isCollapsed ? '펼치기' : '접기'}
            style={{ flexShrink: 0 }}
            title={isCollapsed ? '펼치기' : '접기'}
          >
            {isCollapsed ? (
              <>
                <ChevronRight className="w-7 h-7 text-white" strokeWidth={2.5} />
                {/* 접혀 있을 때 펄스 애니메이션 효과 */}
                <motion.div
                  className={cn(
                    'absolute inset-0 rounded-full',
                    theme === 'dark' ? 'bg-purple-500' : 'bg-purple-400'
                  )}
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{ zIndex: -1 }}
                />
              </>
            ) : (
              <ChevronLeft className={cn(
                'w-7 h-7',
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              )} strokeWidth={2.5} />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

