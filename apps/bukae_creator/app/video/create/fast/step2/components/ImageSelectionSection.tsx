'use client'

import { memo } from 'react'
import { ImageSelector } from './ImageSelector'

interface ImageSelectionSectionProps {
  selectedImagesCount: number
  availableImages: string[]
  selectedImages: string[]
  onImageSelect: (imageUrl: string) => void
  onImageUpload: (imageUrl: string) => void
}

export const ImageSelectionSection = memo(function ImageSelectionSection({
  selectedImagesCount,
  availableImages,
  selectedImages,
  onImageSelect,
  onImageUpload,
}: ImageSelectionSectionProps) {
  return (
    <>
      <div className="mt-20">
        <div className="flex items-center gap-4 mb-4">
          <h2 
            className="font-bold text-text-dark tracking-[-0.64px]"
            style={{ 
              fontSize: 'var(--font-size-24)',
              lineHeight: 'var(--line-height-32-140)'
            }}
          >
            이미지 선택
          </h2>
          <p 
            className="font-bold text-text-primary tracking-[-0.32px]"
            style={{ 
              fontSize: 'var(--font-size-16)',
              lineHeight: 'var(--line-height-16-140)'
            }}
          >
            5개 이상 선택 가능해요
          </p>
        </div>
        <p 
          className="font-bold text-text-primary tracking-[-0.32px] mb-6"
          style={{ 
            fontSize: 'var(--font-size-16)',
            lineHeight: 'var(--line-height-16-140)'
          }}
        >
          💡 최소 5장 이상의 이미지를 선택해주세요. ({selectedImagesCount}/5)
        </p>
      </div>

      <ImageSelector
        availableImages={availableImages}
        selectedImages={selectedImages}
        onImageSelect={onImageSelect}
        onImageUpload={onImageUpload}
      />
    </>
  )
})
