'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, GripVertical, X, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ChirpVoiceSelector from '@/components/ChirpVoiceSelector'
import { useStep3Container } from './hooks/useStep3Container'
import { PRODUCT_PLACEHOLDER } from '@/lib/utils/placeholder-image'

export default function Step3Page() {
  const container = useStep3Container()

  // 토큰 검증 중에는 로딩 표시
  if (container.isValidatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className={container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>인증 확인 중...</p>
        </div>
      </div>
    )
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
        <div className="flex w-full max-w-container-xl mx-auto px-6 py-8">
          <div className="flex-1 overflow-y-auto min-w-0">
            <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${
                container.theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                이미지 선택 및 대본 생성
              </h1>
              <p className={`mt-2 ${
                container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                영상에 사용할 이미지를 선택한 뒤, 상단의 AI 스크립트 버튼을 눌러 전체 흐름에 맞는 씬별 대본을 한 번에 생성하고 수정할 수 있어요. (최소 5장 이상 권장)
              </p>
            </div>

            {/* 사용 가능한 이미지 목록 */}
            <Card className={container.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
              <CardHeader>
                <CardTitle className={container.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                  이미지 추가 (5개 이상 선택 가능)
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                {container.availableImages.length === 0 ? (
                  <div className={`text-center py-8 ${
                    container.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    사용 가능한 이미지가 없어요.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {container.availableImages.map((imageUrl) => {
                      const isSelected = container.selectedImages.includes(imageUrl)
                      return (
                        <div
                          key={imageUrl}
                          onClick={() => container.handleImageSelect(imageUrl)}
                          className={`relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            isSelected
                              ? 'border-purple-500 ring-2 ring-purple-500'
                              : container.theme === 'dark'
                                ? 'border-gray-700 hover:border-purple-500'
                                : 'border-gray-200 hover:border-purple-500'
                          }`}
                        >
                          <Image
                            src={imageUrl}
                            alt="Product image"
                            fill
                            sizes="140px"
                            className="object-cover"
                            onError={(e) => {
                              e.currentTarget.src = PRODUCT_PLACEHOLDER
                            }}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                                <span className="text-white text-sm font-bold">
                                  {container.selectedImages.indexOf(imageUrl) + 1}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 선택된 이미지 목록 (드래그 앤 드롭) - 사용 가능한 이미지 아래로 이동 */}
            {container.selectedImages.length > 0 && (
              <Card
                ref={container.selectedListRef}
                className={container.theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
              >
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className={container.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    선택된 이미지 및 대본 ({container.selectedImages.length}장)
                  </CardTitle>
                  {container.selectedImages.length > 0 && (
                    <div className="relative">
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        onClick={container.handleGenerateAllScripts}
                        disabled={container.isGeneratingAll}
                      >
                        <Sparkles className="w-4 h-4" />
                        {container.isGeneratingAll ? 'AI 스크립트 생성 중...' : 'AI 스크립트 생성'}
                      </Button>
                      
                      {/* 말풍선 UI */}
                      {container.showTooltip && container.selectedImages.length < 5 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 z-50"
                        >
                          <div className={`relative px-4 py-2 rounded-lg shadow-lg ${
                            container.theme === 'dark' 
                              ? 'bg-yellow-600 text-white' 
                              : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                          }`}>
                            <p className="text-sm font-medium whitespace-nowrap">
                              최소 5장 이상의 이미지를 선택해주세요 ({container.selectedImages.length}/5)
                            </p>
                            {/* 말풍선 꼬리 (아래쪽을 가리킴) */}
                            <div className={`absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 ${
                              container.theme === 'dark'
                                ? 'border-t-yellow-600'
                                : 'border-t-yellow-100'
                            }`} />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-4 space-y-2">
                    <ChirpVoiceSelector theme={container.theme} title="목소리 선택" />
                  </div>

                  <div className="space-y-4">
                    {container.selectedImages.map((imageUrl, index) => {
                      const script = container.sceneScripts.get(index)
                      const isGenerating = container.generatingScenes.has(index)
                      const editedScript = container.editedScripts.get(index) ?? script?.script ?? ''
                      
                      return (
                        <div key={`${imageUrl}-${index}`} className="space-y-2">
                          {container.dragOver && container.dragOver.index === index && container.dragOver.position === 'before' && (
                            <div className="h-0.5 bg-blue-500 rounded-full" />
                          )}
                          <div
                            draggable
                            onDragStart={() => container.handleDragStart(index)}
                            onDragOver={(e) => container.handleDragOver(e, index)}
                            onDrop={container.handleDrop}
                            onDragLeave={() => container.handleDragEnd()}
                            onDragEnd={container.handleDragEnd}
                            className={`p-4 rounded-lg border transition-all ${
                              container.draggedIndex === index
                                ? 'opacity-50 border-purple-500'
                                : container.theme === 'dark'
                                  ? 'bg-gray-900 border-gray-700 hover:border-purple-500'
                                  : 'bg-gray-50 border-gray-200 hover:border-purple-500'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <GripVertical className={`w-5 h-5 mt-2 cursor-move ${
                                container.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`} />
                              
                              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                <Image
                                  src={imageUrl}
                                  alt={`Image ${index + 1}`}
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = PRODUCT_PLACEHOLDER
                                  }}
                                />
                              </div>
                              
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-medium ${
                                    container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    Scene {index + 1}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => container.handleSceneDelete(index)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                                
                                {isGenerating ? (
                                  <div className="flex items-center gap-2 py-2">
                                    <Loader2 className={`w-4 h-4 animate-spin ${
                                      container.theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                                    }`} />
                                    <p className={`text-sm ${
                                      container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                      AI가 대본을 생성하고 있어요...
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {script?.isAiGenerated && (
                                      <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/60 dark:text-purple-200">
                                        <Sparkles className="w-3 h-3" />
                                        AI 생성 스크립트
                                      </div>
                                    )}
                                    <textarea
                                      value={editedScript}
                                      onChange={(e) => container.handleScriptEdit(index, e.target.value)}
                                      rows={3}
                                      className={`w-full p-2 rounded-lg border resize-none text-sm ${
                                        container.theme === 'dark'
                                          ? 'bg-gray-800 border-gray-700 text-white'
                                          : 'bg-white border-gray-300 text-gray-900'
                                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                    placeholder="이 씬에서 말할 내용을 자유롭게 입력하거나, 이미지 선택 영역 우측 하단의 AI 스크립트 생성 버튼을 눌러 자동으로 만들어보세요."
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {container.dragOver && container.dragOver.index === index && container.dragOver.position === 'after' && (
                            <div className="h-0.5 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
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
                >
                  다음 단계
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {/* 안내 메시지 */}
            {container.selectedImages.length < 5 && (
              <div className={`p-4 rounded-lg ${
                container.theme === 'dark'
                  ? 'bg-yellow-900/20 border border-yellow-700'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className={`text-sm ${
                  container.theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'
                }`}>
                  💡 최소 5장 이상의 이미지를 선택해주세요. ({container.selectedImages.length}/5)
                </p>
              </div>
            )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
