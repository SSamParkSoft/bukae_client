'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { studioTitleApi } from '@/lib/api/studio-title'

export default function Step6Page() {
  const router = useRouter()
  const { 
    selectedProducts,
    scenes,
    videoTitle,
    videoTitleCandidates,
    videoDescription,
    videoHashtags,
    setVideoTitle,
    setVideoTitleCandidates,
    setVideoDescription,
    setVideoHashtags,
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [isGenerating, setIsGenerating] = useState(false)
  const product = selectedProducts[0]
  const descriptionInitialized = useRef(false)
  const hashtagsInitialized = useRef(false)
  const initialHashtags = useRef(videoHashtags)

  const recommendedDescription = useMemo(() => {
    const productName = product?.name || '제품명'
    const productUrl = product?.url || 'https://link.coupang.com/'
    const priceText = product?.price
      ? `🔥특가 : ${product.price.toLocaleString()}원 (업로드 시점 기준)`
      : '🔥특가 : 가격 정보는 업로드 시점 기준으로 변동될 수 있어요.'

    return [
      '👉 이 영상은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받아요.',
      '👉 제품에 대하여 채널은 책임을 지지 않으며, 제품 관련은 쿠팡 고객센터로 연락 바랍니다.',
      '',
      '## 상품마다 내용이 달라지는 부분',
      productName,
      productUrl,
      priceText,
      '',
      '👉 본 영상에는 채널의 주관적인 생각이 포함되어 있어요.',
      '👉 본 영상에 표시된 가격 정보는 영상 업로드일 당시 원화 기준이며, 가격은 수시로 변동 가능합니다.',
    ].join('\n')
  }, [product])

  const recommendedHashtags = useMemo(() => {
    const productName = product?.name?.replace(/\s+/g, '') || '제품명'
    const platformTag = product?.platform
      ? `#${product.platform === 'coupang' ? '쿠팡' : product.platform}`
      : '#쇼핑'

    const baseTags = [
      '#쿠팡파트너스',
      platformTag,
      '#제품리뷰',
      '#언박싱',
      '#추천템',
      '#가성비',
      '#핫딜',
      `#${productName}`,
      '#쇼츠',
    ]

    return Array.from(new Set(baseTags)).slice(0, 9)
  }, [product])

  // 제목/설명 AI 생성
  const handleGenerateTitles = async () => {
    if (!selectedProducts[0] || scenes.length === 0) {
      alert('상품과 대본 정보가 필요합니다.')
      return
    }

    setIsGenerating(true)

    try {
      const product = selectedProducts[0]
      const fullScript = scenes.map((scene) => scene.script).join('\n')

      const response = await studioTitleApi.createTitle({
        productDescription: product.description ?? '',
        script: fullScript,
      })

      const { title, description } = response

      setVideoTitle(title)
      setVideoTitleCandidates([title])

      // API에서 설명도 내려주는 경우 현재 설명이 비어 있으면 기본값으로 사용
      if (!videoDescription && description) {
        setVideoDescription(description)
      }
    } catch (error) {
      console.error('제목 생성 오류:', error)
      alert('제목 생성 중 오류가 발생했어요.')
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

  // 기본 추천 상세 설명/해시태그 세팅
  useEffect(() => {
    if (descriptionInitialized.current) return

    if (!videoDescription) {
      setVideoDescription(recommendedDescription)
    }
    descriptionInitialized.current = true
  }, [videoDescription, recommendedDescription, setVideoDescription])

  useEffect(() => {
    if (hashtagsInitialized.current) return

    if (!initialHashtags.current || initialHashtags.current.length === 0) {
      setVideoHashtags(recommendedHashtags)
    }
    hashtagsInitialized.current = true
  }, [recommendedHashtags, setVideoHashtags])

  // 제목 선택
  // 직접 입력
  const handleCustomTitle = (title: string) => {
    setVideoTitle(title)
  }

  const handleGenerateDescription = () => {
    setVideoDescription(recommendedDescription)
  }

  const handleGenerateHashtags = () => {
    setVideoHashtags(recommendedHashtags)
  }

  const handleHashtagChange = (value: string) => {
    const normalized = value
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    setVideoHashtags(normalized)
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

            {/* 제목 작성 및 AI 추천 */}
            <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    영상 제목 작성/추천
                  </CardTitle>
                  <p className={`text-sm mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    직접 작성하거나 AI 버튼으로 추천 제목을 받아보세요.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateTitles}
                  size="sm"
                  className="gap-2"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI 생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI 제목 추천
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <textarea
                    value={videoTitle}
                    onChange={(e) => handleCustomTitle(e.target.value)}
                    placeholder="영상 제목을 직접 입력하거나, AI 추천을 받아 수정해보세요."
                    rows={3}
                    className={`w-full p-3 rounded-lg border resize-none ${
                      theme === 'dark'
                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {videoTitle.length}자
                  </p>
                </div>

                {isGenerating && (
                  <div className="flex items-center gap-2 rounded-md px-3 py-2 border border-dashed border-purple-400/60 bg-purple-50 dark:bg-purple-900/20">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-purple-200' : 'text-purple-800'
                    }`}>
                      AI가 제목을 생성하고 있어요...
                    </p>
                  </div>
                )}

                {videoTitleCandidates[0] && (
                  <div className={`flex items-center gap-2 rounded-md px-3 py-2 border ${
                    theme === 'dark'
                      ? 'border-purple-700 bg-purple-900/20 text-purple-200'
                      : 'border-purple-200 bg-purple-50 text-purple-800'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 text-purple-500" />
                    <p className="text-sm">
                      AI 추천 제목: {videoTitleCandidates[0]}
                    </p>
                  </div>
                )}
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

            {/* 영상 상세 설명 추천 */}
            <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    영상 상세 설명 (AI 추천)
                  </CardTitle>
                  <p className={`text-sm mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    쿠팡 파트너스 고지와 상품 정보를 포함한 설명을 자동으로 채워드립니다.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateDescription}
                  size="sm"
                  className="gap-2"
                  variant="secondary"
                >
                  <Sparkles className="w-4 h-4" />
                  AI 상세 설명 추천
                </Button>
              </CardHeader>
              <CardContent>
                <textarea
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  rows={10}
                  className={`w-full p-3 rounded-lg border resize-none ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500 whitespace-pre-line`}
                />
              </CardContent>
            </Card>

            {/* 해시태그 추천 */}
            <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    AI 추천 해시태그
                  </CardTitle>
                  <p className={`text-sm mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    상품명과 플랫폼을 반영한 해시태그를 한 번에 받아보세요.
                  </p>
                </div>
                <Button
                  onClick={handleGenerateHashtags}
                  size="sm"
                  className="gap-2"
                  variant="secondary"
                >
                  <Sparkles className="w-4 h-4" />
                  AI 해시태그 추천
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {videoHashtags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-3 py-1 text-sm rounded-full border ${
                        theme === 'dark'
                          ? 'bg-gray-900 border-gray-700 text-gray-100'
                          : 'bg-gray-50 border-gray-200 text-gray-800'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <textarea
                  value={videoHashtags.join(' ')}
                  onChange={(e) => handleHashtagChange(e.target.value)}
                  rows={3}
                  className={`w-full p-3 rounded-lg border resize-none ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  placeholder="#쿠팡파트너스 #제품리뷰 #핫딜 ..."
                />
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  해시태그는 공백 또는 쉼표로 구분해 입력/수정할 수 있어요.
                </p>
              </CardContent>
            </Card>

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

