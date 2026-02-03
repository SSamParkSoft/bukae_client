'use client'

import { memo, useRef } from 'react'
import { Plus } from 'lucide-react'

interface ImageUploadButtonProps {
  onImageUpload: (imageUrl: string) => void
}

export const ImageUploadButton = memo(function ImageUploadButton({
  onImageUpload,
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      // 이미지 파일 형식 검증
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        return
      }

      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다.')
        return
      }

      // 로컬 파일을 URL로 변환
      const imageUrl = URL.createObjectURL(file)
      onImageUpload(imageUrl)
    })

    // 같은 파일을 다시 선택할 수 있도록 input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <div
        onClick={handleClick}
        className="relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden cursor-pointer border-0 transition-all shadow-[var(--shadow-card-default)] flex items-center justify-center"
        style={{ backgroundColor: '#454545' }}
      >
        <Plus className="w-8 h-8 text-white" />
      </div>
    </>
  )
})
