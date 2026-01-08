'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TrackType = 'fast' | 'pro'

export default function VideoCreatePage() {
  const router = useRouter()
  const [selectedTrack, setSelectedTrack] = useState<TrackType | null>(null)

  const handleTrackSelect = (track: TrackType) => {
    setSelectedTrack(track)
    // Fast Track은 step1로, Pro Track은 다른 경로로 이동할 수 있음
    if (track === 'fast') {
      router.push('/video/create/step1')
    } else {
      // Pro Track 경로는 나중에 정의
      router.push('/video/create/step1')
    }
  }

  return (
    <div>
      <div className="max-w-container-xl mx-auto px-6 pb-8" style={{ paddingTop: 'var(--spacing-header-gap)' }}>

        {/* 메인 콘텐츠 */}
        <div className="text-center mb-8">
          <h1 className="mb-4 bg-gradient-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[var(--letter-spacing-3xl)]" style={{ fontSize: 'var(--font-size-28)', fontWeight: 'var(--font-weight-bold)', lineHeight: 'var(--line-height-28-140)' }}>
            안녕하세요.
          </h1>
          <h2 className="mb-2 bg-gradient-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[var(--letter-spacing-4xl)]" style={{ fontSize: 'var(--font-size-32)', fontWeight: 'var(--font-weight-bold)', lineHeight: 'var(--line-height-32-140)' }}>
            나에게 맞는 제작 방식을 선택하세요
          </h2>
          <p className="text-brand-teal-dark tracking-[var(--letter-spacing-lg)]" style={{ fontSize: 'var(--font-size-18)', fontWeight: 'var(--font-weight-semibold)', lineHeight: 'var(--line-height-18-140)' }}>
            당신의 아이디어를 영상으로 실현하세요
          </p>
        </div>

        {/* 트랙 선택 카드 */}
        <div className="flex justify-center">
          <div 
            className="rounded-[var(--size-track-container-radius)] p-[var(--spacing-card-padding)] bg-white/20 border border-white/10 backdrop-blur-[10px]"
            style={{ boxShadow: 'var(--shadow-container)' }}
          >
            <div className="flex gap-[var(--spacing-card-gap)]">
              {/* Fast Track */}
              <button
                onClick={() => handleTrackSelect('fast')}
                className="w-[var(--size-track-card-width)] h-[var(--size-track-card-height)] rounded-[var(--size-track-card-radius)] bg-white text-center transition-all cursor-pointer flex flex-col justify-center hover:shadow-[var(--shadow-card-hover)]"
                style={{ boxShadow: 'var(--shadow-card-default)' }}
              >
                <h3 className="font-bold text-brand-teal-dark mb-2 tracking-[var(--letter-spacing-4xl)]" style={{ fontSize: 'var(--font-size-32)', lineHeight: 'var(--line-height-32-140)' }}>
                  Fast Track
                </h3>
                <p className="font-bold text-text-muted tracking-[var(--letter-spacing-base)]" style={{ fontSize: 'var(--font-size-16)', lineHeight: 'var(--line-height-16-140)' }}>
                  실속 N잡러를 위한 빠른 AI 영상 제작
                </p>
              </button>

              {/* Pro Track */}
              <button
                onClick={() => handleTrackSelect('pro')}
                className="w-[var(--size-track-card-width)] h-[var(--size-track-card-height)] rounded-[var(--size-track-card-radius)] bg-brand-teal text-white text-center transition-all cursor-pointer flex flex-col justify-center shadow-[var(--shadow-card-teal)] hover:shadow-[var(--shadow-card-teal-hover)]"
              >
                <h3 className="font-bold text-white mb-2 tracking-[var(--letter-spacing-4xl)]" style={{ fontSize: 'var(--font-size-32)', lineHeight: 'var(--line-height-32-140)' }}>
                  Pro Track
                </h3>
                <p className="font-bold text-white tracking-[var(--letter-spacing-base)]" style={{ fontSize: 'var(--font-size-16)', lineHeight: 'var(--line-height-16-140)' }}>
                  예비창업가를 위한 전문적인 AI 영상 제작
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
