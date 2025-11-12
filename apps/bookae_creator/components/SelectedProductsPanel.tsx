'use client'

import { X, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useVideoCreateStore, Product } from '../store/useVideoCreateStore'
import { useThemeStore } from '../store/useThemeStore'

export default function SelectedProductsPanel() {
  const router = useRouter()
  const { selectedProducts, removeProduct, addProduct } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)

  const handleNext = () => {
    if (selectedProducts.length > 0) {
      router.push('/video/create/step2')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('application/json')
    if (data) {
      try {
        const product = JSON.parse(data) as Product
        // 이미 선택된 상품인지 확인
        const isAlreadySelected = selectedProducts.some((p) => p.id === product.id)
        if (!isAlreadySelected) {
          addProduct(product)
        }
      } catch (error) {
        console.error('Failed to parse product data:', error)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  return (
    <div
      className={`sticky top-8 w-80 h-[calc(50vh-4rem)] flex flex-col ${
        theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      } rounded-lg shadow-lg border`}
    >
      <div className={`p-4 border-b ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <h2 className={`text-lg font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          선택된 상품
        </h2>
        <p className={`text-sm mt-1 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {selectedProducts.length}개 선택됨
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={(e) => {
          e.preventDefault()
          e.currentTarget.classList.add('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/20')
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/20')
        }}
        className={`flex-1 overflow-y-auto p-4 ${
          selectedProducts.length === 0
            ? `flex items-center justify-center border-2 border-dashed rounded-lg m-4 ${
                theme === 'dark'
                  ? 'border-gray-700 bg-gray-900/50'
                  : 'border-gray-300 bg-gray-50'
              }`
            : ''
        }`}
      >
        {selectedProducts.length === 0 ? (
          <div className={`text-center ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            <p className="text-sm mb-2">상품을 드래그하거나</p>
            <p className="text-sm">클릭하여 추가하세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedProducts.map((product) => (
              <div
                key={product.id}
                className={`p-3 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm mb-1 line-clamp-2 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {product.name}
                    </h3>
                    <p className={`text-xs mb-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {product.price.toLocaleString()}원
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      theme === 'dark'
                        ? 'bg-purple-900/30 text-purple-300'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {product.platform === 'coupang' ? '쿠팡' :
                       product.platform === 'naver' ? '네이버' :
                       product.platform === 'aliexpress' ? '알리익스프레스' :
                       '아마존'}
                    </span>
                  </div>
                  <button
                    onClick={() => removeProduct(product.id)}
                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 다음 단계 버튼 */}
      <div className={`p-4 border-t ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <button
          onClick={handleNext}
          disabled={selectedProducts.length === 0}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            selectedProducts.length === 0
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          }`}
        >
          <span>다음 단계</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

