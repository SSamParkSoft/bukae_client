'use client'

import { useAppStore } from '../store/useAppStore'

export default function HomePage() {
  const { productUrl, setProductUrl } = useAppStore()

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">📦 부캐 상품 자동화 서비스</h1>
        <p className="text-gray-600 mb-8">상품 정보를 자동으로 크롤링하고 영상을 생성합니다</p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            쿠팡 상품 링크
          </label>
          <input
            type="text"
            placeholder="https://www.coupang.com/vp/products/..."
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {productUrl && (
            <p className="mt-3 text-sm text-gray-500">
              입력된 링크: <span className="text-blue-600">{productUrl}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}