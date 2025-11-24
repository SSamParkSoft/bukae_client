'use client'

import { Download, Image, Video, FileText, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useThemeStore } from '../../../../store/useThemeStore'
import { useVideoCreateStore } from '../../../../store/useVideoCreateStore'
import StepIndicator from '../../../../components/StepIndicator'

const downloadableFiles = [
  {
    id: 'thumbnail',
    name: '썸네일 이미지',
    type: 'image',
    format: 'PNG',
    icon: Image,
    description: '유튜브 썸네일로 사용할 이미지 파일',
  },
  {
    id: 'video',
    name: '제작된 영상',
    type: 'video',
    format: 'MP4',
    icon: Video,
    description: '제작 완료된 영상 파일',
  },
  {
    id: 'description',
    name: '영상 설명 멘트',
    type: 'document',
    format: 'Google Docs',
    icon: FileText,
    description: '유튜브 영상 설명란에 사용할 추천 멘트',
  },
]

export default function Step4Page() {
  const theme = useThemeStore((state) => state.theme)
  const { videoEditData, selectedProducts } = useVideoCreateStore()

  const handleDownload = (fileId: string) => {
    // 실제 구현 시 파일 다운로드 로직
    console.log(`Downloading ${fileId}...`)
    // TODO: 실제 파일 다운로드 API 호출
    alert(`${fileId} 파일 다운로드가 시작됩니다. (현재는 더미 데이터)`)
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
          <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <h1 className={`text-3xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                영상 제작 완료!
              </h1>
            </div>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              영상 제작이 완료되었습니다. 아래 파일들을 다운로드하여 사용하세요.
            </p>
          </div>

          {/* 영상 정보 요약 */}
          {videoEditData && (
            <div className={`mb-8 rounded-lg shadow-sm border p-6 ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                영상 정보
              </h2>
              <div className="space-y-2">
                <div>
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    제목:
                  </span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {videoEditData.title}
                  </span>
                </div>
                <div>
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    선택된 상품:
                  </span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {selectedProducts.length}개
                  </span>
                </div>
                <div>
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    적용된 효과:
                  </span>
                  <span className={`ml-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {videoEditData.effects.length > 0
                      ? videoEditData.effects.join(', ')
                      : '없음'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 다운로드 가능한 파일 목록 */}
          <div className={`rounded-lg shadow-sm border p-6 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-6 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              다운로드 파일
            </h2>
            <div className="space-y-4">
              {downloadableFiles.map((file) => {
                const Icon = file.icon
                return (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-900 border-gray-700'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-gray-800'
                          : 'bg-white'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold mb-1 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {file.name}
                        </h3>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {file.description}
                        </p>
                        <span className={`text-xs mt-1 inline-block px-2 py-1 rounded ${
                          theme === 'dark'
                            ? 'bg-gray-800 text-gray-300'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {file.format}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(file.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>다운로드</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 추가 안내 */}
          <div className={`mt-6 p-4 rounded-lg ${
            theme === 'dark'
              ? 'bg-purple-900/20 border border-purple-800'
              : 'bg-purple-50 border border-purple-200'
          }`}>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
            }`}>
              💡 모든 파일을 다운로드한 후, 유튜브에 영상을 업로드하세요. 자동 업로드 기능은
              추후 제공될 예정입니다.
            </p>
          </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

