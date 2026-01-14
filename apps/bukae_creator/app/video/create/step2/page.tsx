'use client'

import { motion } from 'framer-motion'
import { useStep2Container } from './hooks/useStep2Container'
import {
  HeaderSection,
  LoadingIndicator,
  ScriptStyleSection,
  ImageSelectionSection,
  SelectedImageList,
  NextStepButton,
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
        <div className="flex w-full max-w-[1194px] mx-auto px-4 sm:px-6 pt-4 pb-8">
          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* 헤더 섹션 */}
              <HeaderSection />

              {/* 대본 및 스크립트 스타일 선택 */}
              <ScriptStyleSection
                conceptOptions={container.conceptOptions}
                selectedScriptStyle={container.selectedScriptStyle}
                onStyleSelect={container.handleScriptStyleSelect}
              />

              {/* 이미지 선택 및 대본 생성 - 대본 스타일 선택 후 표시 */}
              {container.selectedScriptStyle && (
                <>
                  {/* 이미지 선택 섹션 */}
                  <ImageSelectionSection
                    selectedImagesCount={container.selectedImages.length}
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
                    <NextStepButton onClick={container.handleNext} />
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
