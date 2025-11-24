'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Camera, Bot, ArrowRight, Video, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, Step2Mode } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import ConceptToneDialog from '@/components/ConceptToneDialog'
import ScriptTypingEffect from '@/components/ScriptTypingEffect'
import VideoUploader from '@/components/VideoUploader'
import { conceptOptions, conceptTones, type ConceptType } from '@/lib/data/templates'
import AutoModeSection from '@/components/AutoModeSection'
import type { AutoScene } from '@/lib/types/video'
import { useMediaAssets } from '@/lib/hooks/useMediaAssets'
import { mapMediaAssetsToSpaelScenario } from '@/lib/data/spaelAssets'
import { isSpaelProduct } from '@/lib/data/spaelProduct'

export default function Step2Page() {
  const router = useRouter()
  const { selectedProducts, setStep2Result, concept, tone, setConcept, setTone } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const { data: mediaAssets, isLoading: isLoadingMediaAssets, error: mediaAssetsError } = useMediaAssets()
  const selectedProduct = selectedProducts[0]
  const isSpaelSelected = isSpaelProduct(selectedProduct)
  const spaelScenario = useMemo(() => {
    if (!isSpaelSelected || !mediaAssets) return null
    // 빈 배열이어도 시나리오 객체는 생성 (이미지가 없을 수도 있음)
    const scenario = mapMediaAssetsToSpaelScenario(mediaAssets)
    // 이미지가 하나도 없으면 null 반환 (로딩 실패로 간주)
    return scenario.images.length > 0 ? scenario : null
  }, [isSpaelSelected, mediaAssets])
  const spaelReferenceVideo = spaelScenario?.finalVideo?.url
  
  const [mode, setMode] = useState<Step2Mode | null>(null)
  const [selectedScriptStyle, setSelectedScriptStyle] = useState<ConceptType | null>(null)
  const [selectedTone, setSelectedTone] = useState<string | null>(null)
  const [generatedScript, setGeneratedScript] = useState<string>('')
  const [finalScript, setFinalScript] = useState<string>('')
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([])
  const [showConceptDialog, setShowConceptDialog] = useState(false)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)

  // 각 단계의 활성화 상태
  const [activeSteps, setActiveSteps] = useState({
    modeSelection: true,
    scriptStyleSelection: false,
    scriptGenerating: false,
    scriptEditing: false,
    shootingGuide: false, // manual only
    videoUpload: false, // manual only
      imageSelection: false, // auto only
  })

  const showNextStepCue =
    (mode === 'manual' && activeSteps.shootingGuide) ||
    (mode === 'auto' && activeSteps.imageSelection)

  // 섹션 refs
  const scriptStyleRef = useRef<HTMLDivElement>(null)
  const scriptGeneratingRef = useRef<HTMLDivElement>(null)
  const scriptEditingRef = useRef<HTMLDivElement>(null)
  const shootingGuideRef = useRef<HTMLDivElement>(null)
  const videoUploadRef = useRef<HTMLDivElement>(null)
  const imageSelectionRef = useRef<HTMLDivElement>(null)

  // 모드 선택
  const handleModeSelect = (selectedMode: Step2Mode) => {
    setMode(selectedMode)
    setActiveSteps((prev) => ({ ...prev, scriptStyleSelection: true }))
    // 스크롤
    setTimeout(() => {
      scriptStyleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // 대본 스타일 선택
  const handleScriptStyleSelect = (concept: ConceptType, toneId: string) => {
    setSelectedScriptStyle(concept)
    setSelectedTone(toneId)
    setConcept(concept)
    setTone(toneId)
    if (mode === 'manual') {
      setActiveSteps((prev) => ({ ...prev, scriptGenerating: true }))
      setIsGeneratingScript(true)
      setTimeout(() => {
        scriptGeneratingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } else if (mode === 'auto') {
      setActiveSteps((prev) => ({ ...prev, imageSelection: true }))
      setTimeout(() => {
        imageSelectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    }
  }

  // 대본 생성 완료
  const handleScriptGenerated = (script: string) => {
    setGeneratedScript(script)
    setFinalScript(script)
    setIsGeneratingScript(false)
    setActiveSteps((prev) => ({ ...prev, scriptEditing: true }))
    // 스크롤
    setTimeout(() => {
      scriptEditingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // 대본 다시 만들기
  const handleRegenerateScript = () => {
    setGeneratedScript('')
    setFinalScript('')
    setSelectedScriptStyle(null)
    setSelectedTone(null)
    setActiveSteps((prev) => ({
      ...prev,
      scriptGenerating: false,
      scriptEditing: false,
      shootingGuide: false,
      videoUpload: false,
      imageSelection: false,
    }))
    // 스크롤
    setTimeout(() => {
      scriptStyleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // 대본 확정
  const handleConfirmScript = () => {
    if (mode !== 'manual') return
    setActiveSteps((prev) => ({ ...prev, shootingGuide: true }))
    setTimeout(() => {
      shootingGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // 촬영 안내 후 업로드로 이동
  const handleGoToUpload = () => {
    setActiveSteps((prev) => ({ ...prev, videoUpload: true }))
    setTimeout(() => {
      videoUploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  // 영상 업로드 완료
  const handleVideoUploaded = (files: File[]) => {
    setUploadedVideos(files)
  }

  // STEP3로 이동 (영상 편집 단계)
  const handleGoToStep3 = () => {
    if (mode !== 'manual') return
    // STEP2 결과 저장
    const result = {
      mode: mode!,
      finalScript,
      ...(uploadedVideos.length > 0 ? { uploadedVideo: uploadedVideos[0] } : {}),
      draftVideo: '', // STEP3에서 생성할 예정
    }

    setStep2Result(result)
    router.push('/video/create/step3')
  }

  const handleAutoScenesComplete = (scenes: AutoScene[]) => {
    if (!selectedScriptStyle || !selectedTone) return
    const finalAutoScript = scenes.map((scene) => scene.editedScript.trim()).join('\n\n')
    const result = {
      mode: 'auto' as const,
      finalScript: finalAutoScript,
      selectedImages: scenes.map((scene) => scene.imageUrl),
      scenes,
      draftVideo: '',
      referenceVideo: spaelReferenceVideo,
    }
    setStep2Result(result)
    router.push('/video/create/step3')
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
          <div className="max-w-5xl mx-auto space-y-12">
            {/* 1. 모드 선택 */}
            <section className="space-y-6">
              <div>
                <h1 className={`text-3xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  영상 제작 방식 선택
                </h1>
                <p className={`mt-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  원하는 제작 방식을 선택해주세요
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 직접 촬영하기 */}
                <Card
                  onClick={() => handleModeSelect('manual')}
                  className={`cursor-pointer transition-all ${
                    mode === 'manual'
                      ? 'border-2 border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : theme === 'dark'
                        ? 'border-gray-700 bg-gray-900 hover:border-teal-500'
                        : 'border-gray-200 bg-white hover:border-teal-500'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Camera className={`h-6 w-6 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`} />
                      <CardTitle className="text-xl">직접 촬영하기</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      AI가 스크립트를 생성하고, 직접 촬영한 영상을 업로드하여 영상을 제작합니다.
                    </CardDescription>
                  </CardContent>
                </Card>

                {/* AI에게 모두 맡기기 */}
                <Card
                  onClick={() => handleModeSelect('auto')}
                  className={`cursor-pointer transition-all ${
                    mode === 'auto'
                      ? 'border-2 border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : theme === 'dark'
                        ? 'border-gray-700 bg-gray-900 hover:border-teal-500'
                        : 'border-gray-200 bg-white hover:border-teal-500'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <Bot className={`h-6 w-6 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`} />
                      <CardTitle className="text-xl">AI에게 모두 맡기기</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      AI가 대본을 생성하고, 이미지를 선택하면 자동으로 영상을 제작합니다.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>

              {mode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center pt-4"
                >
                  <ChevronDown className={`w-8 h-8 animate-bounce ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                </motion.div>
              )}
            </section>

            {/* 2. 대본 스타일 선택 */}
            {activeSteps.scriptStyleSelection && (
              <motion.section
                ref={scriptStyleRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    대본 및 스크립트 스타일 선택
                  </h2>
                  <p className={`mt-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    원하는 대본 및 스크립트 스타일과 말투를 선택해주세요
                  </p>
                </div>

                <ConceptToneDialog
                  open={showConceptDialog}
                  onOpenChange={setShowConceptDialog}
                />

                <div className="space-y-6">
                  {conceptOptions.map((conceptOption) => {
                    const tones = conceptTones[conceptOption.id]
                    return (
                      <Card
                        key={conceptOption.id}
                        className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{conceptOption.label}</CardTitle>
                            <Badge variant={conceptOption.tier === 'LIGHT' ? 'default' : 'secondary'}>
                              {conceptOption.tier}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-3">
                            {tones.map((toneOption) => (
                              <Button
                                key={toneOption.id}
                                variant="outline"
                                onClick={() => handleScriptStyleSelect(conceptOption.id, toneOption.id)}
                                className={`justify-start ${
                                  selectedScriptStyle === conceptOption.id && selectedTone === toneOption.id
                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                    : ''
                                }`}
                              >
                                <span className="flex-1 text-left">{toneOption.label}</span>
                                <Badge variant={toneOption.tier === 'LIGHT' ? 'default' : 'secondary'} className="ml-2">
                                  {toneOption.tier}
                                </Badge>
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {isGeneratingScript && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center pt-4"
                  >
                    <ChevronDown className={`w-8 h-8 animate-bounce ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                  </motion.div>
                )}
              </motion.section>
            )}

            {/* 3. 대본 생성 중 (manual) */}
            {mode === 'manual' && activeSteps.scriptGenerating && isGeneratingScript && (
              <motion.section
                ref={scriptGeneratingRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <ScriptTypingEffect onComplete={handleScriptGenerated} mode={mode || 'manual'} />
              </motion.section>
            )}

            {/* 4. 대본 편집 (manual) */}
            {mode === 'manual' && activeSteps.scriptEditing && (
              <motion.section
                ref={scriptEditingRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    대본 및 스크립트 확인 및 수정
                  </h2>
                  <p className={`mt-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    생성된 대본 및 스크립트를 확인하고 필요시 수정해주세요
                  </p>
                </div>

                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader>
                    <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      대본 및 스크립트 편집
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <textarea
                      value={finalScript}
                      onChange={(e) => setFinalScript(e.target.value)}
                      rows={10}
                      className={`w-full p-3 rounded-md border resize-none ${
                        theme === 'dark'
                          ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      placeholder="대본 및 스크립트를 입력하세요..."
                    />
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {finalScript.length}자
                    </p>
                  </CardContent>
                </Card>

                <div className="flex gap-4 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleRegenerateScript}
                  >
                    대본 및 스크립트 다시 만들기 (크레딧 소모)
                  </Button>
                  <Button onClick={handleConfirmScript}>
                    대본 및 스크립트 확정하기
                  </Button>
                </div>

                {showNextStepCue && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center pt-4"
                  >
                    <ChevronDown className={`w-8 h-8 animate-bounce ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                  </motion.div>
                )}
              </motion.section>
            )}

            {/* 5. 촬영 안내 (manual only) */}
            {mode === 'manual' && activeSteps.shootingGuide && (
              <motion.section
                ref={shootingGuideRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="text-center space-y-4">
                  <Video className={`w-16 h-16 mx-auto ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                  <h2 className={`text-2xl font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    영상 촬영 안내
                  </h2>
                  <p className={`text-lg ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    이 대본 및 스크립트를 참고하여 영상을 직접 촬영해주세요!
                  </p>
                </div>

                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader>
                    <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      확정된 대본 및 스크립트
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`p-4 rounded-md ${
                      theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
                    }`}>
                      <p className={`whitespace-pre-wrap ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {finalScript}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                  <Button size="lg" onClick={handleGoToUpload} className="gap-2">
                    <Video className="w-5 h-5" />
                    촬영한 영상 업로드하기
                  </Button>
                </div>

                {activeSteps.videoUpload && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center pt-4"
                  >
                    <ChevronDown className={`w-8 h-8 animate-bounce ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                  </motion.div>
                )}
              </motion.section>
            )}

            {/* 6. 영상 업로드 (manual only) */}
            {mode === 'manual' && activeSteps.videoUpload && (
              <motion.section
                ref={videoUploadRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    영상 업로드
                  </h2>
                  <p className={`mt-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    촬영한 영상 파일을 업로드해주세요
                  </p>
                </div>

                <VideoUploader onVideoSelect={handleVideoUploaded} />

                <div className="flex justify-end">
                  <Button
                    size="lg"
                    onClick={handleGoToStep3}
                    className="gap-2"
                  >
                    다음 단계
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.section>
            )}

            {/* Auto mode integrated flow */}
            {mode === 'auto' && selectedScriptStyle && selectedTone && (
              <motion.section
                ref={imageSelectionRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {isSpaelSelected && (isLoadingMediaAssets || !spaelScenario) ? (
                  <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                    <CardHeader>
                      <CardTitle>
                        {isLoadingMediaAssets 
                          ? '스파알 전용 시나리오 불러오는 중...' 
                          : mediaAssetsError 
                            ? '시나리오 로딩 실패' 
                            : '시나리오 데이터를 찾을 수 없습니다'}
                      </CardTitle>
                      <CardDescription>
                        {isLoadingMediaAssets 
                          ? 'DB에 저장된 이미지와 대본을 로딩하고 있습니다.' 
                          : mediaAssetsError 
                            ? '미디어 데이터를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.' 
                            : 'DB에 시나리오 이미지가 없습니다. seed-demo 스크립트를 실행해주세요.'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : (
                  <AutoModeSection
                    conceptId={selectedScriptStyle}
                    toneId={selectedTone}
                    minScenes={5}
                    assets={isSpaelSelected && spaelScenario ? spaelScenario.images : undefined}
                    onComplete={handleAutoScenesComplete}
                  />
                )}
              </motion.section>
            )}

          </div>
        </div>
      </div>

    </motion.div>
  )
}
