'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'

export default function Step6Page() {
  const router = useRouter()
  const { 
    selectedProducts,
    scenes,
    videoTitle,
    videoTitleCandidates,
    setVideoTitle,
    setVideoTitleCandidates,
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null)

  // 제목 후보 생성
  const handleGenerateTitles = async () => {
    if (!selectedProducts[0] || scenes.length === 0) {
      alert('상품과 대본 정보가 필요합니다.')
      return
    }

    setIsGenerating(true)

    try {
      // TODO: 실제 GPT API 호출
      // 현재는 더미 데이터 생성
      const productName = selectedProducts[0].name
      const firstScript = scenes[0]?.script || ''
      
      const dummyCandidates = [
        `이거 쓰고 목 통증 사라짐? ${productName} 후기`,
        `97% 만족! 이건 진짜 미쳤다 - ${productName}`,
        `집에서 마사지샵 느낌 그대로 - ${productName} 사용기`,
        `${productName} 이거 하나면 끝! 솔직 후기`,
        `${productName} 진짜 꿀템인 이유 (직접 사용해봤어요)`,
        `${productName} 이거 안 사면 후회합니다`,
        `이거 하나로 모든 게 해결됐어요 - ${productName}`,
        `${productName} 사용 후기 (솔직 리뷰)`,
      ]

      setVideoTitleCandidates(dummyCandidates)
    } catch (error) {
      console.error('제목 생성 오류:', error)
      alert('제목 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  // 컴포넌트 마운트 시 자동 생성
  useEffect(() => {
    if (videoTitleCandidates.length === 0 && !isGenerating) {
      handleGenerateTitles()
    }
  }, [])

  // 제목 선택
  const handleTitleSelect = (title: string, index: number) => {
    setVideoTitle(title)
    setSelectedTitleIndex(index)
  }

  // 직접 입력
  const handleCustomTitle = (title: string) => {
    setVideoTitle(title)
    setSelectedTitleIndex(null)
  }

  // 다음 단계로 이동 (업로드)
  const handleNext = () => {
    if (!videoTitle) {
      alert('영상 제목을 선택하거나 입력해주세요.')
      return
    }

    // 업로드 페이지로 이동 (기존 step4 - 업로드 페이지)
    // TODO: 새로운 업로드 페이지로 변경 필요 시 수정
    router.push('/video/create/step4')
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
                유튜브 영상 제목 선택
              </h1>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                AI가 추천한 제목 중에서 선택하거나 직접 입력하세요
              </p>
            </div>

            {/* 제목 생성 버튼 */}
            {videoTitleCandidates.length === 0 && !isGenerating && (
              <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleGenerateTitles}
                    size="lg"
                    className="w-full gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    AI 제목 추천 받기
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
                      AI가 제목을 생성하고 있습니다...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 추천 제목 목록 */}
            {videoTitleCandidates.length > 0 && (
              <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                <CardHeader>
                  <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    AI 추천 제목
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {videoTitleCandidates.map((title, index) => (
                      <button
                        key={index}
                        onClick={() => handleTitleSelect(title, index)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedTitleIndex === index
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : theme === 'dark'
                              ? 'border-gray-700 bg-gray-900 hover:border-purple-500'
                              : 'border-gray-200 bg-white hover:border-purple-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {title}
                          </span>
                          {selectedTitleIndex === index && (
                            <CheckCircle2 className="w-5 h-5 text-purple-500" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 직접 입력 */}
            <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
              <CardHeader>
                <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                  직접 입력하기
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={selectedTitleIndex === null ? videoTitle : ''}
                  onChange={(e) => handleCustomTitle(e.target.value)}
                  placeholder="영상 제목을 직접 입력하세요..."
                  rows={3}
                  className={`w-full p-3 rounded-lg border resize-none ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
                <p className={`text-sm mt-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {selectedTitleIndex === null ? videoTitle.length : 0}자
                </p>
              </CardContent>
            </Card>

            {/* 선택된 제목 표시 */}
            {videoTitle && (
              <Card className={theme === 'dark' ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-5 h-5 ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`} />
                    <p className={`font-medium ${
                      theme === 'dark' ? 'text-purple-300' : 'text-purple-800'
                    }`}>
                      선택된 제목: {videoTitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 다음 단계 버튼 */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleNext}
                size="lg"
                className="gap-2"
                disabled={!videoTitle}
              >
                완료 및 업로드
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

