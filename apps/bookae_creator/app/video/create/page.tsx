'use client'

import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'

export default function VideoCreatePage() {
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateVideo = async () => {
    setIsCreating(true)
    // TODO: 영상 제작 API 호출
    setTimeout(() => {
      setIsCreating(false)
    }, 2000)
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🎬 영상 제작</h1>
        <p className="text-gray-600 mb-8">상품 정보를 기반으로 영상을 자동으로 생성합니다</p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상품 선택
            </label>
            <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>상품을 선택하세요</option>
              <option>상품 1</option>
              <option>상품 2</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              영상 스타일
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left">
                <div className="font-medium">스타일 1</div>
                <div className="text-sm text-gray-500">간단한 리뷰 형식</div>
              </button>
              <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors text-left">
                <div className="font-medium">스타일 2</div>
                <div className="text-sm text-gray-500">상세 설명 형식</div>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreateVideo}
              disabled={isCreating}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>영상 제작 중...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>영상 제작 시작</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

