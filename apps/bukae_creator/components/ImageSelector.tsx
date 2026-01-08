'use client'

import { Plus } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export type ImageSelectorState = 'default' | 'hover' | 'selected'

interface ImageSelectorProps {
  imageUrl?: string
  index?: number
  state?: ImageSelectorState
  onClick?: () => void
  className?: string
}

export default function ImageSelector({
  imageUrl,
  index,
  state = 'default',
  onClick,
  className,
}: ImageSelectorProps) {
  return (
    <div
      className={cn(
        'relative w-36 h-64 rounded-lg overflow-hidden cursor-pointer transition-all',
        state === 'selected' && 'ring-2 ring-[#5e8790]',
        state === 'hover' && 'opacity-90',
        className
      )}
      onClick={onClick}
    >
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt={`Image ${index || ''}`}
            fill
            className="object-cover"
          />
          {/* 선택 오버레이 */}
          {state === 'selected' && (
            <div className="absolute inset-0 bg-[#5e8790]/40" />
          )}
          {state === 'hover' && (
            <div className="absolute inset-0 bg-[#5e8790]/40" />
          )}
          {/* 선택 번호 */}
          {state === 'selected' && index !== undefined && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-[42.67px] h-[42.67px] rounded-full bg-[#5e8790] flex items-center justify-center">
                <span className="text-white text-[21.33px] font-normal">
                  {index}
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-[#454545] flex items-center justify-center">
          <Plus className="w-12 h-12 text-white" />
        </div>
      )}
    </div>
  )
}
