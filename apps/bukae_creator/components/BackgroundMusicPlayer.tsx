'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import PlayPauseButton from './PlayPauseButton'

interface BackgroundMusicPlayerProps {
  title: string
  description?: string
  isPlaying?: boolean
  onPlayToggle?: () => void
  isDisabled?: boolean
  className?: string
}

export default function BackgroundMusicPlayer({
  title,
  description,
  isPlaying = false,
  onPlayToggle,
  isDisabled = false,
  className,
}: BackgroundMusicPlayerProps) {
  return (
    <Card
      className={cn(
        'p-4 flex items-center gap-4',
        isDisabled && 'bg-[#e3e3e3]',
        className
      )}
    >
      {isDisabled ? (
        <VolumeX className="w-6 h-6 text-[#2c2c2c] shrink-0" />
      ) : (
        <Volume2 className="w-6 h-6 text-[#2c2c2c] shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="space-y-1">
          <h4 className="text-base font-bold text-[#2c2c2c] leading-[22.4px]">
            {title}
          </h4>
          {description && (
            <p className="text-xs font-medium text-[#2c2c2c] leading-[16.8px]">
              {description}
            </p>
          )}
        </div>
      </div>
      {!isDisabled && onPlayToggle && (
        <PlayPauseButton
          isPlaying={isPlaying}
          onToggle={onPlayToggle}
          size="small"
        />
      )}
    </Card>
  )
}
