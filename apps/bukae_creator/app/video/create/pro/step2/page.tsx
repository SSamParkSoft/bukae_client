'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ScriptStyleSection } from './components/script'
import { conceptOptions } from '@/lib/data/templates'
import type { ConceptType } from '@/lib/data/templates'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'

export default function ProStep2Page() {
  const router = useRouter()
  const {
    scriptStyle,
    setScriptStyle,
    setHasUnsavedChanges,
  } = useVideoCreateStore()

  const handleScriptStyleSelect = useCallback(
    (concept: ConceptType) => {
      const isSameSelection = scriptStyle === concept
      if (isSameSelection) {
        setScriptStyle(null)
      } else {
        setScriptStyle(concept)
        setHasUnsavedChanges(true)
      }
    },
    [scriptStyle, setScriptStyle, setHasUnsavedChanges]
  )

  const handleGoToEdit = useCallback(() => {
    if (!scriptStyle) {
      alert('대본 스타일을 먼저 선택해주세요.')
      return
    }
    router.push('/video/create/pro/step2/edit')
  }, [router, scriptStyle])

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center"
      >
        <div className="flex w-full max-w-[1194px] mx-auto px-4 sm:px-6 pt-4 pb-8">
          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="max-w-5xl mx-auto">
              {/* Pro step2 헤더 */}
              <div className="mb-20 mt-[72px]">
                <div className="flex items-center justify-center mb-4">
                  <span
                    className="font-bold bg-linear-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.56px]"
                    style={{
                      fontSize: 'var(--font-size-28)',
                      lineHeight: 'var(--line-height-28-140)',
                    }}
                  >
                    STEP 2
                  </span>
                </div>
                <h1
                  className="text-center font-bold mb-2 bg-linear-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.64px]"
                  style={{
                    fontSize: 'var(--font-size-32)',
                    lineHeight: 'var(--line-height-32-140)',
                  }}
                >
                  어떤 스타일로 제작할까요?
                </h1>
                <p
                  className="text-center font-semibold text-brand-teal-dark tracking-[-0.36px] mt-4"
                  style={{
                    fontSize: 'var(--font-size-18)',
                    lineHeight: 'var(--line-height-18-140)',
                  }}
                >
                  우리 상품에 어울리는 대본 스타일을 선택한 뒤,<br/>
                  다음 단계에서 AI 스크립트와 촬영 가이드를 한 번에 생성하고 편집할 수 있어요.
                </p>
              </div>

              {/* 대본 및 스크립트 스타일 선택 */}
              <div className="mb-16">
                <ScriptStyleSection
                  conceptOptions={conceptOptions}
                  selectedScriptStyle={scriptStyle}
                  onStyleSelect={handleScriptStyleSelect}
                />
              </div>

              {/* 네비게이션 버튼 */}
              <div className="flex flex-col sm:flex-row gap-4 mt-12">
                <Link
                  href="/video/create/step1"
                  className="flex-1 h-14 rounded-2xl border-2 border-[#5e8790] text-[#5e8790] hover:bg-[#5e8790]/10 transition-all flex items-center justify-center gap-2 font-bold tracking-[-0.48px] shadow-(--shadow-card-default)"
                  style={{
                    fontSize: 'var(--font-size-24)',
                    lineHeight: '33.6px',
                  }}
                >
                  <ArrowLeft className="w-5 h-5" />
                  이전 단계
                </Link>
                <button
                  type="button"
                  onClick={handleGoToEdit}
                  className="flex-1 h-14 rounded-2xl bg-[#5e8790] text-white hover:bg-[#5e8790]/90 transition-all flex items-center justify-center gap-2 font-bold tracking-[-0.48px] shadow-(--shadow-card-default)"
                  style={{
                    fontSize: 'var(--font-size-24)',
                    lineHeight: '33.6px',
                  }}
                >
                  편집 시작하기
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
