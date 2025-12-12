'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, SceneScript } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'

export default function Step4Page() {
  const router = useRouter()
  const { 
    selectedProducts,
    scriptStyle,
    tone,
    selectedImages,
    scenes,
    setScenes
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScenes, setGeneratedScenes] = useState<SceneScript[]>([])

  // 대본 생성
  const handleGenerateScript = async () => {
    if (!scriptStyle || !tone || selectedImages.length === 0) {
      alert('대본 스타일, 톤, 이미지가 모두 필요합니다.')
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scriptStyle: scriptStyle,
          tone: tone,
          images: selectedImages,
          product: selectedProducts[0] ? {
            name: selectedProducts[0].name,
            price: selectedProducts[0].price,
            description: selectedProducts[0].description,
          } : null,
        }),
      })

      if (!response.ok) {
        throw new Error('대본 생성에 실패했습니다.')
      }

      const data = await response.json()
      const sceneScripts: SceneScript[] = data.scenes.map(
        (scene: { sceneId?: number; script: string }, index: number) => ({
        sceneId: scene.sceneId || index + 1,
        script: scene.script,
        imageUrl: selectedImages[index] || undefined,
        })
      )

      setGeneratedScenes(sceneScripts)
      setScenes(sceneScripts)
    } catch (error) {
      console.error('대본 생성 오류:', error)
      alert('대본 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  // 컴포넌트 마운트 시 자동 생성
  useEffect(() => {
    if (scenes.length === 0 && !isGenerating) {
      handleGenerateScript()
    } else if (scenes.length > 0) {
      setGeneratedScenes(scenes)
    }
  }, [])

  // 다음 단계로 이동
  const handleNext = () => {
    if (generatedScenes.length === 0) {
      alert('대본을 먼저 생성해주세요.')
      return
    }

    router.push('/video/create/step5')
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
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                대본 생성하기
              </h1>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                AI가 선택한 이미지와 스타일에 맞춰 씬별 대본을 생성합니다
              </p>
            </div>

            {/* 대본 생성 버튼 */}
            {generatedScenes.length === 0 && !isGenerating && (
              <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleGenerateScript}
                    size="lg"
                    className="w-full gap-2"
                  >
                    대본 생성하기
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* 생성 중 */}
            {isGenerating && (
              <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className={`w-12 h-12 animate-spin ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`} />
                    <p className={`text-lg font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      AI가 대본을 생성하고 있습니다...
                    </p>
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      잠시만 기다려주세요
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 생성된 대본 목록 */}
            {generatedScenes.length > 0 && (
              <div className="space-y-4">
                {generatedScenes.map((scene) => (
                  <Card
                    key={scene.sceneId}
                    className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-5 h-5 ${
                          theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        }`} />
                        <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          씬 {scene.sceneId}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        {scene.imageUrl && (
                          <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                            <img
                              src={scene.imageUrl}
                              alt={`Scene ${scene.sceneId}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200'
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className={`whitespace-pre-wrap ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {scene.script}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 다음 단계 버튼 */}
            {generatedScenes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end pt-4"
              >
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="gap-2"
                >
                  다음 단계
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
