'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Camera, Bot, ArrowRight, Loader2, CheckCircle2, Video, FileText, Image as ImageIcon, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, Step2Mode } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import ConceptToneDialog from '@/components/ConceptToneDialog'
import ScriptTypingEffect from '@/components/ScriptTypingEffect'
import ImageSelectionPanel from '@/components/ImageSelectionPanel'
import VideoUploader from '@/components/VideoUploader'
import { conceptOptions, conceptTones, type ConceptType } from '@/lib/data/templates'

export default function Step2Page() {
  const router = useRouter()
  const { selectedProducts, setStep2Result, concept, tone, setConcept, setTone } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  
  const [mode, setMode] = useState<Step2Mode | null>(null)
  const [selectedScriptStyle, setSelectedScriptStyle] = useState<ConceptType | null>(null)
  const [selectedTone, setSelectedTone] = useState<string | null>(null)
  const [generatedScript, setGeneratedScript] = useState<string>('')
  const [finalScript, setFinalScript] = useState<string>('')
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([])
  const [isCreatingVideo, setIsCreatingVideo] = useState(false)
  const [showConceptDialog, setShowConceptDialog] = useState(false)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false)
  const [draftVideoUrl, setDraftVideoUrl] = useState<string | null>(null)
  const [creationProgress, setCreationProgress] = useState(0)
  const [freeRegenerateUsed, setFreeRegenerateUsed] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)

  // 각 단계의 활성화 상태
  const [activeSteps, setActiveSteps] = useState({
    modeSelection: true,
    scriptStyleSelection: false,
    scriptGenerating: false,
    scriptEditing: false,
    shootingGuide: false, // manual only
    videoUpload: false, // manual only
    imageSelection: false, // auto only
    videoCreating: false,
  })

  // 섹션 refs
  const scriptStyleRef = useRef<HTMLDivElement>(null)
  const scriptGeneratingRef = useRef<HTMLDivElement>(null)
  const scriptEditingRef = useRef<HTMLDivElement>(null)
  const shootingGuideRef = useRef<HTMLDivElement>(null)
  const videoUploadRef = useRef<HTMLDivElement>(null)
  const imageSelectionRef = useRef<HTMLDivElement>(null)
  const videoCreatingRef = useRef<HTMLDivElement>(null)

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
    setActiveSteps((prev) => ({ ...prev, scriptGenerating: true, isGeneratingScript: true }))
    setIsGeneratingScript(true)
    // 스크롤
    setTimeout(() => {
      scriptGeneratingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
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
    if (mode === 'manual') {
      setActiveSteps((prev) => ({ ...prev, shootingGuide: true }))
      setTimeout(() => {
        shootingGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } else {
      setActiveSteps((prev) => ({ ...prev, imageSelection: true }))
      setTimeout(() => {
        imageSelectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
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

  // 이미지 선택 변경
  const handleImageSelectionChange = (images: string[]) => {
    setSelectedImages(images)
  }

  // 영상 초안 생성 시작
  const handleCreateDraftVideo = () => {
    setIsCreatingVideo(true)
    setCreationProgress(0)
    setDraftVideoUrl(null)
    setActiveSteps((prev) => ({ ...prev, videoCreating: true }))

    // 스크롤
    setTimeout(() => {
      videoCreatingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)

    // 더미 영상 생성 시뮬레이션 (진행률 표시)
    const progressInterval = setInterval(() => {
      setCreationProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 300)

    // 더미 영상 생성 시뮬레이션 (3~5초)
    setTimeout(() => {
      clearInterval(progressInterval)
      const videoUrl = 'https://example.com/draft-video.mp4' // 더미 URL
      setDraftVideoUrl(videoUrl)
      setCreationProgress(100)
      setIsCreatingVideo(false)
      
      const result = {
        mode: mode!,
        finalScript,
        draftVideo: videoUrl,
        ...(mode === 'auto' ? { selectedImages } : uploadedVideos.length > 0 ? { uploadedVideo: uploadedVideos[0] } : {}),
      }

      setStep2Result(result)
    }, 3500)
  }

  // 영상 다시 만들기 버튼 클릭
  const handleRegenerateVideo = () => {
    // 무료 재생성이 남아있으면 바로 실행
    if (!freeRegenerateUsed) {
      executeRegenerate()
      return
    }

    // 크레딧 소모인 경우 확인 팝업 표시
    setShowRegenerateDialog(true)
  }

  // 실제 초기화 실행
  const executeRegenerate = () => {
    // 무료 재생성 사용 여부 체크
    if (!freeRegenerateUsed) {
      setFreeRegenerateUsed(true)
    }

    // 모든 상태 초기화
    setMode(null)
    setSelectedScriptStyle(null)
    setSelectedTone(null)
    setGeneratedScript('')
    setFinalScript('')
    setSelectedImages([])
    setUploadedVideos([])
    setDraftVideoUrl(null)
    setCreationProgress(0)
    setIsCreatingVideo(false)
    setIsGeneratingScript(false)
    
    // 모든 단계 비활성화하고 첫 단계로
    setActiveSteps({
      modeSelection: true,
      scriptStyleSelection: false,
      scriptGenerating: false,
      scriptEditing: false,
      shootingGuide: false,
      videoUpload: false,
      imageSelection: false,
      videoCreating: false,
    })

    // 팝업 닫기
    setShowRegenerateDialog(false)

    // 맨 위로 스크롤
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  // 다음 단계로 이동
  const handleNextStep = () => {
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

            {/* 3. 대본 생성 중 */}
            {activeSteps.scriptGenerating && isGeneratingScript && (
              <motion.section
                ref={scriptGeneratingRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <ScriptTypingEffect onComplete={handleScriptGenerated} mode={mode || 'manual'} />
              </motion.section>
            )}

            {/* 4. 대본 편집 */}
            {activeSteps.scriptEditing && (
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

                {((mode === 'manual' && activeSteps.shootingGuide) || (mode === 'auto' && activeSteps.imageSelection)) && (
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
                    onClick={handleCreateDraftVideo}
                    className="gap-2"
                  >
                    영상 제작하기 (초안 생성)
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.section>
            )}

            {/* 7. 이미지 선택 (auto only) */}
            {mode === 'auto' && activeSteps.imageSelection && (
              <motion.section
                ref={imageSelectionRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className={`text-2xl font-bold mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    이미지 선택
                  </h2>
                  <p className={`mt-2 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    영상에 사용할 이미지를 선택해주세요 (4~5장)
                  </p>
                </div>

                <ImageSelectionPanel
                  onSelectionChange={handleImageSelectionChange}
                  minSelection={4}
                  maxSelection={5}
                />

                <div className="flex justify-end">
                  <Button
                    size="lg"
                    onClick={handleCreateDraftVideo}
                    disabled={selectedImages.length < 4 || selectedImages.length > 5}
                    className="gap-2"
                  >
                    영상 제작하기 (초안 생성)
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </motion.section>
            )}

            {/* 8. 영상 초안 생성 중/완료 */}
            {activeSteps.videoCreating && (
              <motion.section
                ref={videoCreatingRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {isCreatingVideo ? (
                  // 로딩 중
                  <div className="text-center space-y-8 py-12">
                    <div className="space-y-6">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Loader2 className={`w-16 h-16 mx-auto animate-spin ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                      </motion.div>
                      <div>
                        <h2 className={`text-2xl font-bold mb-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          AI가 영상 초안을 생성하고 있어요
                        </h2>
                        <p className={`text-lg ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          잠시만 기다려주세요...
                        </p>
                      </div>

                      {/* 진행률 표시 */}
                      <div className="space-y-2 max-w-md mx-auto">
                        <div className={`w-full h-3 rounded-full overflow-hidden ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                        }`}>
                          <motion.div
                            className={`h-full transition-colors ${
                              theme === 'dark' ? 'bg-purple-500' : 'bg-purple-600'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(creationProgress, 100)}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <motion.p
                          className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}
                          key={Math.round(creationProgress)}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                        >
                          {Math.round(creationProgress)}% 완료
                        </motion.p>
                      </div>

                      {/* 생성 중 단계 표시 */}
                      <div className={`rounded-lg p-6 max-w-md mx-auto ${
                        theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                      }`}>
                        <div className="space-y-3 text-left">
                          <motion.div
                            className={`flex items-center gap-3 transition-all ${
                              creationProgress >= 30 ? 'opacity-100' : 'opacity-50'
                            }`}
                            animate={creationProgress >= 30 ? { x: 0 } : { x: -10 }}
                          >
                            {creationProgress >= 30 ? (
                              <CheckCircle2 className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-green-400' : 'text-green-600'
                              }`} />
                            ) : (
                              <div className={`w-2 h-2 rounded-full ${
                                theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'
                              }`} />
                            )}
                            <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                              {creationProgress >= 30 ? '영상 구성 완료' : '영상 구성 중...'}
                            </span>
                          </motion.div>
                          <motion.div
                            className={`flex items-center gap-3 transition-all ${
                              creationProgress >= 60 ? 'opacity-100' : 'opacity-50'
                            }`}
                            animate={creationProgress >= 60 ? { x: 0 } : { x: -10 }}
                          >
                            {creationProgress >= 60 ? (
                              <CheckCircle2 className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-green-400' : 'text-green-600'
                              }`} />
                            ) : (
                              <div className={`w-2 h-2 rounded-full ${
                                theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'
                              }`} />
                            )}
                            <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                              {creationProgress >= 60 ? '효과 적용 완료' : '효과 적용 중...'}
                            </span>
                          </motion.div>
                          <motion.div
                            className={`flex items-center gap-3 transition-all ${
                              creationProgress >= 90 ? 'opacity-100' : 'opacity-50'
                            }`}
                            animate={creationProgress >= 90 ? { x: 0 } : { x: -10 }}
                          >
                            {creationProgress >= 90 ? (
                              <CheckCircle2 className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-green-400' : 'text-green-600'
                              }`} />
                            ) : (
                              <div className={`w-2 h-2 rounded-full ${
                                theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'
                              }`} />
                            )}
                            <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                              {creationProgress >= 90 ? '최종 렌더링 완료' : '최종 렌더링 중...'}
                            </span>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : draftVideoUrl ? (
                  // 영상 초안 완료
                  <div className="space-y-6">
                    <div>
                      <h2 className={`text-2xl font-bold mb-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        영상 초안 생성 완료
                      </h2>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        생성된 영상 초안을 확인해주세요
                      </p>
                    </div>

                    <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="w-full">
                            <video
                              src={draftVideoUrl}
                              controls
                              className="w-full rounded-lg"
                              style={{ maxHeight: '500px' }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-4 justify-end">
                      <Button
                        variant="outline"
                        onClick={handleRegenerateVideo}
                        size="lg"
                      >
                        {freeRegenerateUsed ? '다시 만들기 (크레딧 소모)' : '다시 만들기 (무료)'}
                      </Button>
                      <Button
                        onClick={handleNextStep}
                        size="lg"
                        className="gap-2"
                      >
                        다음 단계
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </motion.section>
            )}
          </div>
        </div>
      </div>

      {/* 다시 만들기 확인 팝업 */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className={theme === 'dark' ? 'bg-gray-800' : 'bg-white'}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              정말 다시 만드시겠습니까?
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              모든 작업 내용이 초기화되고 처음부터 다시 시작됩니다.
              <br />
              크레딧이 소모됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegenerateDialog(false)}
            >
              취소
            </Button>
            <Button
              onClick={executeRegenerate}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
