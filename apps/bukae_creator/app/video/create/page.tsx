'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { clearVideoCreateDraft, hasVideoCreateDraft } from './_utils/draft-storage'

type Track = 'fast' | 'pro'

export default function VideoCreatePage() {
  const router = useRouter()
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false)
  const [pendingTrack, setPendingTrack] = useState<Track | null>(null)

  const navigateToTrackStep1 = useCallback((track: Track) => {
    router.push(`/video/create/step1?track=${track}`)
  }, [router])

  const handleTrackSelect = useCallback((track: Track) => {
    if (hasVideoCreateDraft()) {
      setPendingTrack(track)
      setIsResumeDialogOpen(true)
      return
    }

    navigateToTrackStep1(track)
  }, [navigateToTrackStep1])

  const handleFastTrackSelect = useCallback(() => {
    handleTrackSelect('fast')
  }, [handleTrackSelect])

  const handleProTrackSelect = useCallback(() => {
    handleTrackSelect('pro')
  }, [handleTrackSelect])

  const handleStartNew = useCallback(() => {
    if (!pendingTrack) return

    clearVideoCreateDraft()
    setIsResumeDialogOpen(false)
    navigateToTrackStep1(pendingTrack)
    setPendingTrack(null)
  }, [navigateToTrackStep1, pendingTrack])

  const handleResume = useCallback(() => {
    if (!pendingTrack) return

    setIsResumeDialogOpen(false)
    navigateToTrackStep1(pendingTrack)
    setPendingTrack(null)
  }, [navigateToTrackStep1, pendingTrack])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsResumeDialogOpen(open)
    if (!open) {
      setPendingTrack(null)
    }
  }, [])

  return (
    <>
      <div className="max-w-container-xl mx-auto px-6 pb-8 pt-header-gap">
        {/* 메인 콘텐츠 */}
        <div className="text-center mb-15">
          <h1
            className="mb-4 font-bold leading-(--line-height-28-140) bg-gradient-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-(--letter-spacing-3xl)"
            style={{ fontSize: 'var(--font-size-28)' }}
          >
            안녕하세요.
          </h1>
          <h2
            className="mb-2 font-bold leading-(--line-height-32-140) bg-gradient-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-(--letter-spacing-4xl)"
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
                  className="font-bold leading-(--line-height-32-140) text-brand-teal-dark mb-2 tracking-(--letter-spacing-4xl)"
                  style={{ fontSize: 'var(--font-size-32)' }}
                >
                  Fast Track
                </h3>
                <p
                  className="font-bold leading-(--line-height-16-140) text-text-muted tracking-(--letter-spacing-base)"
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
                  className="font-bold leading-(--line-height-32-140) text-white mb-2 tracking-(--letter-spacing-4xl)"
                  style={{ fontSize: 'var(--font-size-32)' }}
                >
                  Pro Track
                </h3>
                <p
                  className="font-bold leading-(--line-height-16-140) text-white tracking-(--letter-spacing-base)"
                  style={{ fontSize: 'var(--font-size-16)' }}
                >
                  예비창업가를 위한 전문적인 AI 영상 제작
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isResumeDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent style={{ width: '100%', maxWidth: '448px' }}>
          <DialogHeader className="text-left" style={{ width: '100%' }}>
            <DialogTitle
              style={{
                fontSize: '18px',
                lineHeight: '25.2px',
                fontWeight: '600',
                display: 'block',
                width: '100%',
                whiteSpace: 'normal',
                wordBreak: 'keep-all',
              }}
            >
              이전 작업을 이어서 진행할까요?
            </DialogTitle>
            <DialogDescription
              style={{
                fontSize: '14px',
                lineHeight: '19.6px',
                display: 'block',
                width: '100%',
                whiteSpace: 'normal',
                wordBreak: 'keep-all',
              }}
            >
              새로 시작하면 이전 작업 내용과 진행 중인 영상 작업 정보가 초기화됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0" style={{ width: '100%' }}>
            <Button onClick={handleStartNew}>
              새로 시작
            </Button>
            <Button variant="outline" onClick={handleResume}>
              이어하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
