'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStep2Container } from './hooks/useStep2Container'
import {
  HeaderSection,
  LoadingIndicator,
  ConceptCard,
  ImageSelector,
  SelectedImageList,
} from './components'

export default function Step2Page() {
  const container = useStep2Container()

  // 토큰 검증 중에는 로딩 표시
  if (container.isValidatingToken) {
    return <LoadingIndicator />
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center"
      >
        <div className="flex w-full max-w-[1194px] mx-auto px-6 py-8">
          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* 헤더 섹션 */}
              <HeaderSection />

              {/* 대본 및 스크립트 스타일 선택 */}
              <section className="space-y-6">
                <div className="flex gap-4">
                  <h1 
                    className="font-bold mb-2 text-text-dark tracking-[-0.48px]"
                    style={{ 
                      fontSize: 'var(--font-size-24)',
                      lineHeight: 'var(--line-height-24-140)'
                    }}
                  >
                    대본 및 스크립트 스타일 선택
                  </h1>
                  <p 
                    className="mt-2 font-bold text-text-dark tracking-[-0.32px]"
                    style={{ 
                      fontSize: 'var(--font-size-16)',
                      lineHeight: 'var(--line-height-16-140)'
                    }}
                  >
                    원하는 대본 및 스크립트 스타일과 말투를 선택해주세요
                  </p>
                </div>

                <div className="rounded-2xl bg-white/40 border border-white/10 p-6 shadow-[var(--shadow-container)]">
                  <div className="space-y-6">
                    {container.conceptOptions.map((conceptOption) => {
                      const tones = container.conceptTones[conceptOption.id]
                      return (
                        <ConceptCard
                          key={conceptOption.id}
                          conceptOption={conceptOption}
                          tones={tones}
                          selectedScriptStyle={container.selectedScriptStyle}
                          selectedTone={container.selectedTone}
                          expandedConceptId={container.expandedConceptId}
                          openToneExampleId={container.openToneExampleId}
                          showConfirmPopover={container.showConfirmPopover}
                          confirmPopoverToneId={container.confirmPopoverToneId}
                          toneExamples={container.toneExamples}
                          onConceptToggle={container.handleConceptToggle}
                          onToneSelect={container.handleScriptStyleSelect}
                          onToneExampleToggle={container.handleToneExampleToggle}
                          onConfirm={container.handleConfirmStyle}
                          onReselect={container.handleReselect}
                          onConfirmPopoverChange={(open) => {
                            if (!open) {
                              container.setShowConfirmPopover(false)
                              container.setConfirmPopoverToneId(null)
                            }
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </section>

              {/* 이미지 선택 및 대본 생성 - 대본 스타일 선택 후 표시 */}
              {container.selectedScriptStyle && container.selectedTone && (
                <>
                  {/* 이미지 선택 섹션 */}
                  <div className="mt-20">
                    <div className="flex items-center gap-4 mb-4">
                      <h2 
                        className="font-bold text-text-dark tracking-[-0.64px]"
                        style={{ 
                          fontSize: 'var(--font-size-24)',
                          lineHeight: 'var(--line-height-32-140)'
                        }}
                      >
                        이미지 선택
                      </h2>
                      <p 
                        className="font-bold text-text-primary tracking-[-0.32px]"
                        style={{ 
                          fontSize: 'var(--font-size-16)',
                          lineHeight: 'var(--line-height-16-140)'
                        }}
                      >
                        5개 이상 선택 가능해요
                      </p>
                    </div>
                    <p 
                      className="font-bold text-text-primary tracking-[-0.32px] mb-6"
                      style={{ 
                        fontSize: 'var(--font-size-16)',
                        lineHeight: 'var(--line-height-16-140)'
                      }}
                    >
                      💡 최소 5장 이상의 이미지를 선택해주세요. ({container.selectedImages.length}/5)
                    </p>
                  </div>

                  {/* 사용 가능한 이미지 목록 */}
                  <ImageSelector
                    availableImages={container.availableImages}
                    selectedImages={container.selectedImages}
                    onImageSelect={container.handleImageSelect}
                    onImageUpload={container.handleImageUpload}
                  />

                  {/* 선택된 이미지 목록 (드래그 앤 드롭) */}
                  {container.selectedImages.length > 0 && (
                    <SelectedImageList
                      selectedImages={container.selectedImages}
                      sceneScripts={container.sceneScripts}
                      editedScripts={container.editedScripts}
                      generatingScenes={container.generatingScenes}
                      isGeneratingAll={container.isGeneratingAll}
                      draggedIndex={container.draggedIndex}
                      dragOver={container.dragOver}
                      selectedListRef={container.selectedListRef}
                      onGenerateAllScripts={container.handleGenerateAllScripts}
                      onDragStart={container.handleDragStart}
                      onDragOver={container.handleDragOver}
                      onDrop={container.handleDrop}
                      onDragEnd={container.handleDragEnd}
                      onScriptEdit={container.handleScriptEdit}
                      onSceneDelete={container.handleSceneDelete}
                    />
                  )}

                {/* 다음 단계 버튼 */}
                {container.selectedImages.length >= 5 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end pt-4"
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

              </>
            )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
