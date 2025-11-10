'use client'

import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { getYouTubeVideoId, getVideoIdFromReferer } from '@/lib/utils/videoId'

interface URLInputProps {
  onExtract: (videoId: string | null, source: 'input' | null) => void
}

export default function URLInput({ onExtract }: URLInputProps) {
  const [inputUrl, setInputUrl] = useState('')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // URL에서 videoID 추출하는 함수
  const extractVideoIdFromUrl = (url: string): { videoId: string | null; source: 'input' | null } => {
    if (!url.trim()) {
      return { videoId: null, source: null }
    }

    // YouTube URL에서 추출 시도
    const youtubeId = getYouTubeVideoId(url)
    if (youtubeId) {
      return { videoId: youtubeId, source: 'input' }
    }

    // 일반 URL에서 videoID 파라미터 확인
    try {
      const urlObj = new URL(url)
      const videoIdFromParam = urlObj.searchParams.get('videoID') || urlObj.searchParams.get('videoId')
      if (videoIdFromParam) {
        return { videoId: videoIdFromParam, source: 'input' }
      }
    } catch {
      // URL 파싱 실패
    }

    // Referer 방식으로도 시도
    const refererId = getVideoIdFromReferer(url)
    if (refererId) {
      return { videoId: refererId, source: 'input' }
    }

    return { videoId: null, source: null }
  }

  // 실시간 추출 (debounce)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (inputUrl.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        const result = extractVideoIdFromUrl(inputUrl.trim())
        onExtract(result.videoId, result.source)
      }, 300)
    } else {
      onExtract(null, null)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [inputUrl, onExtract])

  // 수동 추출 버튼 핸들러
  const handleExtract = () => {
    const result = extractVideoIdFromUrl(inputUrl.trim())
    onExtract(result.videoId, result.source)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExtract()
    }
  }

  return (
    <div className="w-full max-w-2xl mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL 입력
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="url을 입력해주세요."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 text-gray-600"
          />
          <button
            onClick={handleExtract}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>추출</span>
          </button>
        </div>
      </div>
    </div>
  )
}

