'use client'

import { useState } from 'react'
import { Share2, Mail } from 'lucide-react'
import { ChannelInfo } from '@/lib/types/viewer'

interface ChannelProfileProps {
  channel: ChannelInfo
}

export default function ChannelProfile({ channel }: ChannelProfileProps) {
  const [imageError, setImageError] = useState(false)
  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${channel.name} - Bookae`,
          text: `${channel.name}의 미니홈페이지`,
          url,
        })
      } catch (error) {
        // 사용자가 공유를 취소한 경우
        console.log('공유 취소됨')
      }
    } else {
      // Web Share API를 지원하지 않는 경우 클립보드에 복사
      try {
        await navigator.clipboard.writeText(url)
        alert('링크가 클립보드에 복사되었습니다!')
      } catch (error) {
        console.error('클립보드 복사 실패:', error)
      }
    }
  }

  const handleBusinessProposal = () => {
    if (channel.businessEmail) {
      window.location.href = `mailto:${channel.businessEmail}?subject=비즈니스 제안`
    } else {
      alert('비즈니스 제안 이메일이 설정되지 않았습니다.')
    }
  }

  return (
    <div className="flex flex-col items-center px-4 py-6 bg-white">
      {/* 프로필 이미지와 아이콘 */}
      <div className="relative flex items-center justify-center w-full mb-4">
        {/* 공유하기 버튼 (왼쪽) */}
        <button
          onClick={handleShare}
          className="absolute left-0 p-2 rounded-full hover:bg-purple-50 transition-colors"
          aria-label="공유하기"
        >
          <Share2 className="w-5 h-5 text-purple-400" />
        </button>

        {/* 프로필 이미지 */}
        <div className="w-24 h-24 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center ring-2 ring-purple-200">
          {channel.profileImage && !imageError ? (
            <img
              src={channel.profileImage}
              alt={channel.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(channel.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
              alt={channel.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* 알림 버튼 (오른쪽) */}
        <button
          className="absolute right-0 p-2 rounded-full hover:bg-purple-50 transition-colors"
          aria-label="알림"
        >
          <svg
            className="w-5 h-5 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>
      </div>

      {/* 채널명 */}
      <h1 className="text-xl font-semibold text-gray-900 mb-4">{channel.name}</h1>

      {/* 비즈니스 제안 버튼 */}
      <button
        onClick={handleBusinessProposal}
        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
      >
        <Mail className="w-4 h-4" />
        <span>비즈니스 제안</span>
      </button>
    </div>
  )
}

