'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Play, X } from 'lucide-react'
import { useVideoCreateStore } from '../../../../store/useVideoCreateStore'
import { useThemeStore } from '../../../../store/useThemeStore'
import StepIndicator from '../../../../components/StepIndicator'

const availableEffects = [
  { id: 'fade', name: '페이드 인/아웃' },
  { id: 'zoom', name: '줌 효과' },
  { id: 'slide', name: '슬라이드 전환' },
  { id: 'bounce', name: '바운스 효과' },
  { id: 'glow', name: '글로우 효과' },
]

export default function Step3Page() {
  const router = useRouter()
  const { selectedProducts, videoEditData, setVideoEditData } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [title, setTitle] = useState('')
  const [selectedEffects, setSelectedEffects] = useState<string[]>([])
  const [productContents, setProductContents] = useState<Record<string, string>>({})

  useEffect(() => {
    // 이전에 저장된 데이터가 있으면 불러오기
    if (videoEditData) {
      setTitle(videoEditData.title)
      setSelectedEffects(videoEditData.effects)
      setProductContents(videoEditData.productContent)
    } else {
      // 기본값 설정
      const defaultContents: Record<string, string> = {}
      selectedProducts.forEach((product) => {
        defaultContents[product.id] = `${product.name}에 대한 상세 설명을 입력하세요.`
      })
      setProductContents(defaultContents)
    }
  }, [videoEditData, selectedProducts])

  const handleEffectToggle = (effectId: string) => {
    setSelectedEffects((prev) =>
      prev.includes(effectId)
        ? prev.filter((id) => id !== effectId)
        : [...prev, effectId]
    )
  }

  const handleProductContentChange = (productId: string, content: string) => {
    setProductContents((prev) => ({
      ...prev,
      [productId]: content,
    }))
  }

  const handleCreate = () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    setVideoEditData({
      title,
      effects: selectedEffects,
      productContent: productContents,
    })

    // Step 4로 이동
    router.push('/video/create/step4')
  }

  if (selectedProducts.length === 0) {
    return (
      <div className="flex min-h-screen">
        <StepIndicator />
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className={`text-center py-12 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              <p className="text-lg mb-4">선택된 상품이 없습니다.</p>
              <button
                onClick={() => router.push('/video/create/step1')}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
              >
                상품 선택하러 가기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <StepIndicator />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            영상 편집
          </h1>
          <p className={`mb-8 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            영상 제목과 효과를 설정하고 상품별 내용을 편집하세요
          </p>

          {/* 선택된 상품 표시 */}
          <div className={`mb-6 rounded-lg shadow-sm border p-6 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              선택된 상품
            </h2>
            <div className="flex flex-wrap gap-3">
              {selectedProducts.map((product) => (
                <div
                  key={product.id}
                  className={`px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-700 text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                >
                  {product.name}
                </div>
              ))}
            </div>
          </div>

          {/* 제목 입력 */}
          <div className={`mb-6 rounded-lg shadow-sm border p-6 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-700'
            }`}>
              유튜브 영상 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="영상 제목을 입력하세요"
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                theme === 'dark'
                  ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* 상품별 내용 편집 */}
          <div className={`mb-6 rounded-lg shadow-sm border p-6 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              상품별 내용 편집
            </h2>
            <div className="space-y-4">
              {selectedProducts.map((product) => (
                <div key={product.id}>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-700'
                  }`}>
                    {product.name}
                  </label>
                  <textarea
                    value={productContents[product.id] || ''}
                    onChange={(e) =>
                      handleProductContentChange(product.id, e.target.value)
                    }
                    rows={4}
                    className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      theme === 'dark'
                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="상품에 대한 설명을 입력하세요"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 효과 선택 */}
          <div className={`mb-6 rounded-lg shadow-sm border p-6 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              효과 선택
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableEffects.map((effect) => {
                const isSelected = selectedEffects.includes(effect.id)
                return (
                  <button
                    key={effect.id}
                    onClick={() => handleEffectToggle(effect.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : theme === 'dark'
                          ? 'border-gray-700 bg-gray-900 hover:border-purple-600'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                    }`}
                  >
                    <div className={`font-medium ${
                      isSelected
                        ? theme === 'dark'
                          ? 'text-purple-300'
                          : 'text-purple-700'
                        : theme === 'dark'
                          ? 'text-white'
                          : 'text-gray-900'
                    }`}>
                      {effect.name}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 영상 제작하기 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
            >
              <Play className="w-5 h-5" />
              <span>영상 제작하기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

