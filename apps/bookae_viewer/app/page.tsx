'use client'

import { useState, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { extractVideoId } from '@/lib/utils/videoId'
import URLInput from '@/components/URLInput'

// useSearchParams를 사용하는 컴포넌트를 분리
function VideoIdExtractor({
  manualVideoId,
  manualSource,
}: {
  manualVideoId: string | null
  manualSource: 'input' | null
}) {
  const searchParams = useSearchParams()
  
  // 자동 videoID 추출 (useMemo로 최적화)
  const { videoId: autoVideoId, referer, source: autoSource } = useMemo(() => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : null
    const currentReferer = typeof window !== 'undefined' ? document.referrer : null

    const result = extractVideoId(searchParams, currentUrl, currentReferer)

    // 디버깅용 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log('Current URL:', currentUrl)
      console.log('Referer:', currentReferer)
      console.log('Extracted videoID:', result.videoId)
      console.log('Source:', result.source)
    }

    return {
      videoId: result.videoId,
      referer: currentReferer,
      source: result.source,
    }
  }, [searchParams])

  // 최종 videoID 결정 (수동 입력 > 자동 추출)
  const finalVideoId = manualVideoId || autoVideoId
  const finalSource = manualSource || autoSource

  return (
    <>
      {/* 로딩 스피너 */}
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="text-gray-600 text-lg">로딩 중...</p>
      </div>

      {/* 추출된 정보 표시 */}
      <div className="mt-12 w-full max-w-2xl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">추출된 정보</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <strong className="text-gray-700 min-w-[80px]">VideoID:</strong>
              <span className="text-gray-900 font-mono break-all">
                {finalVideoId || '없음'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <strong className="text-gray-700 min-w-[80px]">Source:</strong>
              <span className="text-gray-900">
                {finalSource || '없음'}
                {manualSource && (
                  <span className="ml-2 text-xs text-blue-600">(수동 입력)</span>
                )}
              </span>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <>
                <div className="flex items-start gap-2">
                  <strong className="text-gray-700 min-w-[80px]">Referer:</strong>
                  <span className="text-gray-600 break-all">{referer || '없음'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <strong className="text-gray-700 min-w-[80px]">자동 추출:</strong>
                  <span className="text-gray-600">
                    {autoVideoId || '없음'} ({autoSource || '없음'})
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function ViewerHomePage() {
  const [manualVideoId, setManualVideoId] = useState<string | null>(null)
  const [manualSource, setManualSource] = useState<'input' | null>(null)

  // URLInput 컴포넌트에서 추출된 결과를 받는 콜백
  const handleExtract = useCallback((videoId: string | null, source: 'input' | null) => {
    setManualVideoId(videoId)
    setManualSource(source)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
      {/* 로고 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">📦 Bookae</h1>
      </div>

      {/* URL 입력 필드 */}
      <URLInput onExtract={handleExtract} />

      {/* Suspense로 감싼 useSearchParams 사용 부분 */}
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-gray-600 text-lg">로딩 중...</p>
          </div>
        }
      >
        <VideoIdExtractor
          manualVideoId={manualVideoId}
          manualSource={manualSource}
        />
      </Suspense>
    </div>
  )
}

