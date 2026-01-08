'use client'

import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PlayPauseButtonProps {
  isPlaying: boolean
  onToggle: () => void
  className?: string
  size?: 'default' | 'small'
}

export default function PlayPauseButton({
  isPlaying,
  onToggle,
  className,
  size = 'default',
}: PlayPauseButtonProps) {
  return (
    <Button
      onClick={onToggle}
      variant="ghost"
      className={cn(
        'gap-2 rounded-lg',
        size === 'small' ? 'h-8 px-2' : 'h-8 px-3',
        className
      )}
    >
      {isPlaying ? (
        <>
          <Pause className="w-6 h-6" />
          <span className="text-sm font-medium">정지</span>
        </>
      ) : (
        <>
          <Play className="w-6 h-6" />
          <span className="text-sm font-medium">듣기</span>
        </>
      )}
    </Button>
  )
}
