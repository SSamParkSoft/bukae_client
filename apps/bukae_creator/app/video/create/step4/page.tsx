'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Play, Pause, Settings, Type, Music, Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, TimelineData } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import SubtitleSelectionDialog from '@/components/SubtitleSelectionDialog'
import BgmSelectionDialog from '@/components/BgmSelectionDialog'
import TransitionEffectDialog from '@/components/TransitionEffectDialog'
import VoiceSelectionDialog from '@/components/VoiceSelectionDialog'

export default function Step4Page() {
  const router = useRouter()
  const { 
    scenes,
    selectedImages,
    timeline,
    setTimeline,
    subtitlePosition,
    subtitleFont,
    subtitleColor,
    bgmTemplate,
    transitionTemplate,
    voiceTemplate,
    setSubtitlePosition,
    setSubtitleFont,
    setSubtitleColor,
    setBgmTemplate,
    setTransitionTemplate,
    setVoiceTemplate,
    setScenes,
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const animationFrameRef = useRef<number>()

  // 씬 썸네일 계산
  const sceneThumbnails = useMemo(
    () =>
      scenes.map((scene, index) => scene.imageUrl || selectedImages[index] || ''),
    [scenes, selectedImages],
  )

  // 타임라인 초기화 및 갱신
  useEffect(() => {
    if (scenes.length === 0) return

    const nextTimeline: TimelineData = {
      fps: 30,
      resolution: '1080x1920',
      scenes: scenes.map((scene, index) => ({
        sceneId: scene.sceneId,
        duration: 2.5, // 기본 2.5초
        transition: 'fade',
        image: scene.imageUrl || selectedImages[index] || '',
        text: {
          content: scene.script,
          font: subtitleFont || 'Pretendard-Bold',
          color: subtitleColor || '#ffffff',
          position: subtitlePosition || 'center',
          fontSize: 32,
        },
      })),
    }
    setTimeline(nextTimeline)
  }, [scenes, selectedImages, subtitleFont, subtitleColor, subtitlePosition, setTimeline])

  // Canvas 렌더링
  useEffect(() => {
    if (!canvasRef.current || !timeline) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 해상도 설정
    canvas.width = 1080
    canvas.height = 1920

    const renderScene = (sceneIndex: number) => {
      if (sceneIndex >= timeline.scenes.length) return

      const scene = timeline.scenes[sceneIndex]
      
      // 배경 이미지 그리기
      if (scene.image) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // 이미지 그리기 (비율 유지)
          const imgAspect = img.width / img.height
          const canvasAspect = canvas.width / canvas.height
          
          let drawWidth = canvas.width
          let drawHeight = canvas.height
          let drawX = 0
          let drawY = 0
          
          if (imgAspect > canvasAspect) {
            drawHeight = canvas.width / imgAspect
            drawY = (canvas.height - drawHeight) / 2
          } else {
            drawWidth = canvas.height * imgAspect
            drawX = (canvas.width - drawWidth) / 2
          }
          
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
          
          // 텍스트 오버레이
          if (scene.text.content) {
            ctx.fillStyle = scene.text.color
            ctx.font = `${scene.text.fontSize || 32}px ${scene.text.font}`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            
            // 텍스트 위치 계산
            let textX = canvas.width / 2
            let textY = canvas.height / 2
            
            if (scene.text.position === 'top') {
              textY = 200
            } else if (scene.text.position === 'bottom') {
              textY = canvas.height - 200
            }
            
            // 텍스트 그림자
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
            ctx.shadowBlur = 10
            ctx.shadowOffsetX = 2
            ctx.shadowOffsetY = 2
            
            ctx.fillText(scene.text.content, textX, textY)
            
            // 그림자 초기화
            ctx.shadowColor = 'transparent'
            ctx.shadowBlur = 0
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 0
          }
        }
        img.src = scene.image
      }
    }

    renderScene(currentSceneIndex)
  }, [timeline, currentSceneIndex])

  // 재생/일시정지
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  // Scene 클릭 시 해당 씬으로 이동
  const handleSceneSelect = (index: number) => {
    if (!timeline) return
    setCurrentSceneIndex(index)

    // 선택한 씬의 시작 시점으로 currentTime 이동
    const timeUntilScene = timeline.scenes
      .slice(0, index)
      .reduce((acc, scene) => acc + scene.duration, 0)
    setCurrentTime(timeUntilScene)
  }

  // 재생 루프
  useEffect(() => {
    if (!isPlaying || !timeline) return

    const totalDuration = timeline.scenes.reduce(
      (acc, scene) => acc + scene.duration,
      0,
    )

    let lastTimestamp: number | null = null

    const tick = (timestamp: number) => {
      if (!lastTimestamp) {
        lastTimestamp = timestamp
      }
      const deltaSeconds = (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp

      setCurrentTime((prev) => {
        let next = prev + deltaSeconds

        if (next >= totalDuration) {
          setIsPlaying(false)
          next = totalDuration
        }

        // 현재 시간에 해당하는 씬 인덱스 계산
        let accumulated = 0
        let sceneIndex = 0
        for (let i = 0; i < timeline.scenes.length; i++) {
          accumulated += timeline.scenes[i].duration
          if (next <= accumulated) {
            sceneIndex = i
            break
          }
        }
        setCurrentSceneIndex(sceneIndex)

        return next
      })

      if (animationFrameRef.current !== undefined && isPlaying) {
        animationFrameRef.current = requestAnimationFrame(tick)
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, timeline])

  // 전체 재생 길이와 현재 위치 비율
  const progressRatio = useMemo(() => {
    if (!timeline || timeline.scenes.length === 0) return 0
    const total = timeline.scenes.reduce(
      (acc, scene) => acc + scene.duration,
      0,
    )
    if (total === 0) return 0
    return Math.min(1, currentTime / total)
  }, [timeline, currentTime])

  // 씬 스크립트 수정
  const handleSceneScriptChange = (index: number, value: string) => {
    const updatedScenes = scenes.map((scene, i) =>
      i === index ? { ...scene, script: value } : scene,
    )
    setScenes(updatedScenes)
  }

  // 씬 전환 효과 수정
  const handleSceneTransitionChange = (index: number, value: string) => {
    if (!timeline) return
    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) =>
        i === index ? { ...scene, transition: value } : scene,
      ),
    }
    setTimeline(nextTimeline)
  }

  // 최종 영상 생성
  const handleGenerateVideo = async () => {
    if (!timeline) {
      alert('타임라인 데이터가 없습니다.')
      return
    }

    // TODO: 서버로 타임라인 데이터 전송
    // 서버에서 ffmpeg로 영상 생성
    alert('영상 생성 기능은 추후 구현 예정입니다.')
  }

  // 다음 단계로 이동
  const handleNext = () => {
    router.push('/video/create/step6')
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
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                미리보기 및 효과 선택
              </h1>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                왼쪽 미리보기에서 전체 흐름을 확인하고, 오른쪽에서 각 Scene의 자막과 효과를 편집하세요.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
              {/* 좌측: Canvas 미리보기 + 효과 */}
              <div className="space-y-4">
                {/* Canvas 미리보기 */}
                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader>
                    <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      실시간 미리보기
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="relative border-2 border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden self-center">
                        <canvas
                          ref={canvasRef}
                          className="w-full max-w-[540px] h-auto bg-black"
                          style={{ aspectRatio: '9/16' }}
                        />
                      </div>
                      {/* 재생 바 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Scene {currentSceneIndex + 1} / {scenes.length || 0}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all"
                            style={{ width: `${progressRatio * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handlePlayPause}
                          variant="outline"
                          size="sm"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              일시정지
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              재생
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleGenerateVideo}
                          size="sm"
                        >
                          최종 영상 만들기
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 효과 선택 */}
                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader>
                    <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      효과 선택
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 자막 선택 */}
                      <SubtitleSelectionDialog>
                        <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 text-base ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              <Type className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              자막 선택
                            </CardTitle>
                          </CardHeader>
                        </Card>
                      </SubtitleSelectionDialog>

                      {/* 배경음악 선택 */}
                      <BgmSelectionDialog>
                        <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 text-base ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              <Music className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              배경음악 선택
                            </CardTitle>
                          </CardHeader>
                        </Card>
                      </BgmSelectionDialog>

                      {/* 전환 효과 */}
                      <TransitionEffectDialog>
                        <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 text-base ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              <Shuffle className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              전환 효과
                            </CardTitle>
                          </CardHeader>
                        </Card>
                      </TransitionEffectDialog>

                      {/* 목소리 선택 */}
                      <VoiceSelectionDialog>
                        <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <CardHeader>
                            <CardTitle className={`flex items-center gap-2 text-base ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              <Settings className={`w-5 h-5 ${
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              }`} />
                              목소리 선택
                            </CardTitle>
                          </CardHeader>
                        </Card>
                      </VoiceSelectionDialog>
                    </div>
                  </CardContent>
                </Card>

                {/* 다음 단계 버튼 */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleNext}
                    size="lg"
                    className="gap-2"
                  >
                    다음 단계
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* 우측: Scene 리스트 */}
              <div className="space-y-3">
                <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                  <CardHeader>
                    <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      Scene 리스트
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {scenes.length === 0 ? (
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Step3에서 이미지와 스크립트를 먼저 생성해주세요.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {scenes.map((scene, index) => {
                          const thumb = sceneThumbnails[index]
                          const isActive = currentSceneIndex === index
                          const sceneTransition =
                            timeline?.scenes[index]?.transition ?? 'fade'
                          return (
                            <div
                              key={scene.sceneId ?? index}
                              className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                isActive
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : theme === 'dark'
                                    ? 'border-gray-700 bg-gray-900 hover:border-purple-500'
                                    : 'border-gray-200 bg-white hover:border-purple-500'
                              }`}
                              onClick={() => handleSceneSelect(index)}
                            >
                              <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt={`Scene ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-semibold uppercase ${
                                    theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
                                  }`}>
                                    Scene {index + 1}
                                  </span>
                                  <select
                                    value={sceneTransition}
                                    onChange={(e) =>
                                      handleSceneTransitionChange(index, e.target.value)
                                    }
                                    className={`text-xs rounded-md border px-2 py-1 bg-transparent ${
                                      theme === 'dark'
                                        ? 'border-gray-700 text-gray-200'
                                        : 'border-gray-300 text-gray-700'
                                    } focus:outline-none focus:ring-1 focus:ring-purple-500`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="fade">Fade</option>
                                    <option value="slide">Slide</option>
                                    <option value="zoom">Zoom</option>
                                  </select>
                                </div>
                                <textarea
                                  rows={3}
                                  value={scene.script}
                                  onChange={(e) =>
                                    handleSceneScriptChange(index, e.target.value)
                                  }
                                  className={`w-full text-sm rounded-md border px-2 py-1 resize-none ${
                                    theme === 'dark'
                                      ? 'bg-gray-800 border-gray-700 text-white'
                                      : 'bg-white border-gray-300 text-gray-900'
                                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

