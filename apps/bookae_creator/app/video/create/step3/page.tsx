'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Image, Mic, Type, Music, Shuffle, Play } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import SelectedProductEditor from '@/components/SelectedProductEditor'
import VideoTitleInput from '@/components/VideoTitleInput'
import ScriptEditor from '@/components/ScriptEditor'
import ThumbnailDesignDialog from '@/components/ThumbnailDesignDialog'
import VoiceSelectionDialog from '@/components/VoiceSelectionDialog'
import SubtitleSelectionDialog from '@/components/SubtitleSelectionDialog'
import BgmSelectionDialog from '@/components/BgmSelectionDialog'
import TransitionEffectDialog from '@/components/TransitionEffectDialog'
import PriceInfoToggle from '@/components/PriceInfoToggle'
import IntroSelectionDialog from '@/components/IntroSelectionDialog'

export default function Step3Page() {
  const router = useRouter()
  const { selectedProducts, scriptMethod } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const isEditMode = scriptMethod === 'edit'

  const handleNext = () => {
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
                영상 제작
              </h1>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                영상에 사용할 내용을 설정하세요
              </p>
            </div>

            {/* 선택된 상품 편집 */}
            <div className="space-y-4">
              <h2 className={`text-xl font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                1. 선택된 상품
              </h2>
              {selectedProducts.map((product) => (
                <SelectedProductEditor key={product.id} product={product} />
              ))}
            </div>

            {/* 유튜브 영상제목 입력 */}
            <div>
              <h2 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                2. 유튜브 영상제목 입력
              </h2>
              <VideoTitleInput />
            </div>

            {/* 스크립트 편집 (편집 모드만) */}
            {isEditMode && (
              <div>
                <h2 className={`text-xl font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  3. 대본 편집
                </h2>
                <ScriptEditor />
              </div>
            )}

            {/* 효과 선택 */}
            <div className="space-y-4">
              <h2 className={`text-xl font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {isEditMode ? '4. 효과 선택' : '3. 효과 선택'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 썸네일 디자인 */}
                <ThumbnailDesignDialog>
                  <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <Image className={`w-5 h-5 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                        썸네일 디자인
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        썸네일 템플릿과 텍스트를 설정하세요
                      </p>
                    </CardContent>
                  </Card>
                </ThumbnailDesignDialog>

                {/* 목소리 선택 */}
                <VoiceSelectionDialog>
                  <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <Mic className={`w-5 h-5 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                        목소리 선택
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        TTS/STT를 활용한 목소리 템플릿을 선택하세요
                      </p>
                    </CardContent>
                  </Card>
                </VoiceSelectionDialog>

                {/* 자막 선택 */}
                <SubtitleSelectionDialog>
                  <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <Type className={`w-5 h-5 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                        자막 선택
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        자막의 위치, 폰트, 색상을 선택하세요
                      </p>
                    </CardContent>
                  </Card>
                </SubtitleSelectionDialog>

                {/* 배경음악 선택 */}
                <BgmSelectionDialog>
                  <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <Music className={`w-5 h-5 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                        배경음악 선택
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        배경음악 템플릿을 선택하세요
                      </p>
                    </CardContent>
                  </Card>
                </BgmSelectionDialog>

                {/* 화면 전환효과 */}
                <TransitionEffectDialog>
                  <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <Shuffle className={`w-5 h-5 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                        화면 전환효과
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        화면 전환효과 템플릿을 선택하세요
                      </p>
                    </CardContent>
                  </Card>
                </TransitionEffectDialog>

                {/* 인트로 선택 */}
                <IntroSelectionDialog>
                  <Card className={`cursor-pointer hover:border-purple-500 transition-colors ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <Play className={`w-5 h-5 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                        인트로 선택
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        인트로 템플릿을 선택하세요
                      </p>
                    </CardContent>
                  </Card>
                </IntroSelectionDialog>
              </div>

              {/* 상품 가격 정보 표시 */}
              <PriceInfoToggle />
            </div>

            {/* 다음 단계 버튼 */}
            <div className="flex justify-end pt-6">
              <Button onClick={handleNext} size="lg" className="gap-2">
                <span>다음 단계</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

