'use client'

import { memo } from 'react'
import Image from 'next/image'
import { PRODUCT_PLACEHOLDER } from '@/lib/utils/placeholder-image'
import { ImageUploadButton } from './ImageUploadButton'

interface ImageSelectorProps {
  availableImages: string[]
  selectedImages: string[]
  onImageSelect: (imageUrl: string) => void
  onImageUpload: (imageUrl: string) => void
}

export const ImageSelector = memo(function ImageSelector({
  availableImages,
  selectedImages,
  onImageSelect,
  onImageUpload,
}: ImageSelectorProps) {
  return (
    <div className="rounded-2xl bg-white/40 border border-white/10 p-6 shadow-[var(--shadow-container)]">
      <div className="relative">
        {availableImages.length === 0 ? (
          <div 
            className="text-center py-8 text-text-tertiary tracking-[-0.28px]"
            style={{ 
              fontSize: 'var(--font-size-14)',
              lineHeight: 'var(--line-height-14-140)'
            }}
          >
            사용 가능한 이미지가 없어요.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {availableImages.map((imageUrl) => {
              const isSelected = selectedImages.includes(imageUrl)
              return (
                <div
                  key={imageUrl}
                  onClick={() => onImageSelect(imageUrl)}
                  className={`relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden cursor-pointer border-2 transition-all shadow-[var(--shadow-card-default)] ${
                    isSelected
                      ? 'border-brand-teal ring-2 ring-brand-teal'
                      : 'border-gray-200 hover:border-brand-teal'
                  }`}
                >
                  <Image
                    src={imageUrl}
                    alt="Product image"
                    fill
                    sizes="140px"
                    className="object-cover"
                    onError={(e) => {
                      e.currentTarget.src = PRODUCT_PLACEHOLDER
                    }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-brand-teal/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-brand-teal flex items-center justify-center">
                        <span 
                          className="text-white font-bold tracking-[-0.28px]"
                          style={{ 
                            fontSize: 'var(--font-size-14)',
                            lineHeight: 'var(--line-height-14-140)'
                          }}
                        >
                          {selectedImages.indexOf(imageUrl) + 1}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {/* 이미지 업로드 버튼 - 항상 마지막에 표시 */}
            <ImageUploadButton onImageUpload={onImageUpload} />
          </div>
        )}
      </div>
    </div>
  )
})
