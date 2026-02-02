'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { ScriptStyleSection } from '@/app/video/create/_components'
import { conceptOptions } from '@/lib/data/templates'
import type { ConceptType } from '@/lib/data/templates'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'

export default function ProStep2Page() {
  const { scriptStyle, setScriptStyle, setHasUnsavedChanges } = useVideoCreateStore()

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
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Pro step2 헤더 */}
              <div className="mb-20 mt-[72px]">
                <div className="flex items-center justify-center mb-4">
                  <span
                    className="font-bold bg-gradient-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.56px]"
                    style={{
                      fontSize: 'var(--font-size-28)',
                      lineHeight: 'var(--line-height-28-140)',
                    }}
                  >
                    STEP 2
                  </span>
                </div>
                <h1
                  className="text-center font-bold mb-2 bg-gradient-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.64px]"
                  style={{
                    fontSize: 'var(--font-size-32)',
                    lineHeight: 'var(--line-height-32-140)',
                  }}
                >
                  어떻게 제작해볼까요?
                </h1>
                <p
                  className="text-center font-semibold text-brand-teal-dark tracking-[-0.36px] mt-4"
                  style={{
                    fontSize: 'var(--font-size-18)',
                    lineHeight: 'var(--line-height-18-140)',
                  }}
                >
                  영상에 사용할 이미지를 선택한 뒤,<br/>
                  상단의 AI 스크립트 버튼을 눌러 전체 흐름에 맞는 장면 별 대본을 한 번에 생성하고 수정할 수 있어요.
                </p>
              </div>

              {/* 공용: 대본 및 스크립트 스타일 선택 */}
              <ScriptStyleSection
                conceptOptions={conceptOptions}
                selectedScriptStyle={scriptStyle}
                onStyleSelect={handleScriptStyleSelect}
              />

              {/* Pro 전용: 대본 및 스크립트 생성 이하 (Figma node 2422-29540 기준) */}
              {scriptStyle && (
                <section className="space-y-6" data-pro-step2-below>
                  <h2
                    className="font-bold text-text-dark tracking-[-0.48px]"
                    style={{
                      fontSize: 'var(--font-size-24)',
                      lineHeight: 'var(--line-height-24-140)',
                    }}
                  >
                    촬영 가이드 생성
                  </h2>
                  <p
                    className="text-text-secondary"
                    style={{
                      fontSize: 'var(--font-size-16)',
                      lineHeight: 'var(--line-height-16-140)',
                    }}
                  >
                    AI 촬영 가이드를 생성하고, 원하는 영상 간격을 설정하세요.
                  </p>
                  <div className="rounded-2xl bg-white/40 border border-white/10 p-6 shadow-(--shadow-container) min-h-[200px]">
                    {/* Pro 전용 UI: Figma 2422-29540 기준으로 추후 구현 */}
                    <p className="text-text-tertiary text-sm">
                      Pro 전용 하단 UI (촬영 가이드, 장면별 영상 업로드 등) — Figma 디자인 반영 예정
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
