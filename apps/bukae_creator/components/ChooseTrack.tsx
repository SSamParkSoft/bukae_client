'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ChooseTrackProps {
  title?: string
  description?: string
  onClick?: () => void
  className?: string
  isHovered?: boolean
}

export default function ChooseTrack({
  title = 'Fast Track',
  description,
  onClick,
  className,
  isHovered = false,
}: ChooseTrackProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-6 cursor-pointer transition-colors',
        isHovered ? 'bg-[#5e8790]' : 'bg-white hover:bg-[#5e8790]',
        className
      )}
    >
      <div className="space-y-2">
        <h3
          className={cn(
            'text-2xl font-bold',
            isHovered ? 'text-white' : 'text-[#111111]'
          )}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              'text-base font-medium',
              isHovered ? 'text-white/90' : 'text-[#5d5d5d]'
            )}
          >
            {description}
          </p>
        )}
      </div>
    </Card>
  )
}
