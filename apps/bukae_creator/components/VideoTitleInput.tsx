'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useThemeStore } from '@/store/useThemeStore'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import AIRecommendButton from './AIRecommendButton'

export default function VideoTitleInput() {
  const theme = useThemeStore((state) => state.theme)
  const { videoEditData, setVideoEditData } = useVideoCreateStore()
  const [title, setTitle] = useState(videoEditData?.title || '')

  const handleTitleChange = (value: string) => {
    // 이모지와 <> 제거
    const cleaned = value.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[<>]/g, '')
    setTitle(cleaned)
    setVideoEditData({
      ...videoEditData,
      title: cleaned,
      effects: videoEditData?.effects || [],
      productContent: videoEditData?.productContent || {},
    })
  }

  const handleRecommend = (recommendation: string) => {
    const cleaned = recommendation.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[<>]/g, '')
    setTitle(cleaned)
    setVideoEditData({
      ...videoEditData,
      title: cleaned,
      effects: videoEditData?.effects || [],
      productContent: videoEditData?.productContent || {},
    })
  }

  // AI 추천 더미 데이터 (5가지)
  const recommendations = [
    '이 제품 정말 대박이에요!',
    '이거 사면 후회 안 해요',
    '완전 추천하는 제품입니다',
    '이 가격에 이 퀄리티? 대박',
    '지금 바로 주문하세요!',
  ]

  return (
    <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
      <CardHeader>
        <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
          유튜브 영상 제목
        </CardTitle>
        <CardDescription>
          영상 제목을 입력하세요 (이모지와 &lt;&gt; 사용 불가)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="영상 제목을 입력하세요"
              className="flex-1"
            />
            <AIRecommendButton
              onSelect={handleRecommend}
              recommendations={recommendations}
              title="제목 AI 추천"
              description="AI가 추천하는 제목을 선택하세요"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

