'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function VideoCreatePage() {
  const router = useRouter()

  const handleFastTrackSelect = useCallback(() => {
    router.push('/video/create/fast/step1')
  }, [router])

  const handleProTrackSelect = useCallback(() => {
    router.push('/video/create/pro/step1')
  }, [router])

  return (
    <div className="max-w-container-xl mx-auto px-6 pb-8 pt-header-gap">
      {/* 메인 콘텐츠 */}
      <div className="text-center mb-8">
        <h1 
          className="mb-4 font-(--font-weight-bold) leading-(--line-height-28-140) bg-gradient-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-(--letter-spacing-3xl)"
          style={{ fontSize: 'var(--font-size-28)' }}
        >
          안녕하세요.
        </h1>
        <h2 
          className="mb-2 font-(--font-weight-bold) leading-(--line-height-32-140) bg-gradient-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-(--letter-spacing-4xl)"
          style={{ fontSize: 'var(--font-size-32)' }}
        >
          나에게 맞는 제작 방식을 선택하세요
        </h2>
        <p 
          className="font-semibold leading-(--line-height-18-140) text-brand-teal-dark tracking-(--letter-spacing-lg)"
          style={{ fontSize: 'var(--font-size-18)' }}
        >
          당신의 아이디어를 영상으로 실현하세요
        </p>
      </div>

      {/* 트랙 선택 카드 */}
      <div className="flex justify-center">
        <div className="rounded-(--size-track-container-radius) p-(--spacing-card-padding) bg-white/20 border border-white/10 backdrop-blur-[10px] shadow-(--shadow-container)">
          <div className="flex gap-(--spacing-card-gap)">
            {/* Fast Track */}
            <button
              onClick={handleFastTrackSelect}
              className="w-(--size-track-card-width) h-(--size-track-card-height) rounded-(--size-track-card-radius) bg-white text-center transition-all cursor-pointer flex flex-col justify-center shadow-(--shadow-card-default) hover:shadow-(--shadow-card-hover) focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2"
              aria-label="Fast Track 선택 - 실속 N잡러를 위한 빠른 AI 영상 제작"
            >
              <h3 
                className="font-(--font-weight-bold) leading-(--line-height-32-140) text-brand-teal-dark mb-2 tracking-(--letter-spacing-4xl)"
                style={{ fontSize: 'var(--font-size-32)' }}
              >
                Fast Track
              </h3>
              <p 
                className="font-(--font-weight-bold) leading-(--line-height-16-140) text-text-muted tracking-(--letter-spacing-base)"
                style={{ fontSize: 'var(--font-size-16)' }}
              >
                실속 N잡러를 위한 빠른 AI 영상 제작
              </p>
            </button>

            {/* Pro Track */}
            <button
              onClick={handleProTrackSelect}
              className="w-(--size-track-card-width) h-(--size-track-card-height) rounded-(--size-track-card-radius) bg-brand-teal text-white text-center transition-all cursor-pointer flex flex-col justify-center shadow-(--shadow-card-teal) hover:shadow-(--shadow-card-teal-hover) focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-brand-teal"
              aria-label="Pro Track 선택 - 예비창업가를 위한 전문적인 AI 영상 제작"
            >
              <h3 
                className="font-(--font-weight-bold) leading-(--line-height-32-140) text-white mb-2 tracking-(--letter-spacing-4xl)"
                style={{ fontSize: 'var(--font-size-32)' }}
              >
                Pro Track
              </h3>
              <p 
                className="font-(--font-weight-bold) leading-(--line-height-16-140) text-white tracking-(--letter-spacing-base)"
                style={{ fontSize: 'var(--font-size-16)' }}
              >
                예비창업가를 위한 전문적인 AI 영상 제작
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
