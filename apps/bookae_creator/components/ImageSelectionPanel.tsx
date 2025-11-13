'use client'

import { useState } from 'react'
import { Image as ImageIcon, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useThemeStore } from '@/store/useThemeStore'

interface ImageSelectionPanelProps {
  onSelectionChange: (selectedImages: string[]) => void
  minSelection?: number
  maxSelection?: number
}

// 더미 상품 이미지 데이터 (서버에 저장된 이미지 목록)
const dummyProductImages = [
  'https://via.placeholder.com/300x300?text=Product+Image+1',
  'https://via.placeholder.com/300x300?text=Product+Image+2',
  'https://via.placeholder.com/300x300?text=Product+Image+3',
  'https://via.placeholder.com/300x300?text=Product+Image+4',
  'https://via.placeholder.com/300x300?text=Product+Image+5',
  'https://via.placeholder.com/300x300?text=Product+Image+6',
  'https://via.placeholder.com/300x300?text=Product+Image+7',
  'https://via.placeholder.com/300x300?text=Product+Image+8',
  'https://via.placeholder.com/300x300?text=Product+Image+9',
  'https://via.placeholder.com/300x300?text=Product+Image+10',
  'https://via.placeholder.com/300x300?text=Product+Image+11',
  'https://via.placeholder.com/300x300?text=Product+Image+12',
]

export default function ImageSelectionPanel({
  onSelectionChange,
  minSelection = 4,
  maxSelection = 5,
}: ImageSelectionPanelProps) {
  const theme = useThemeStore((state) => state.theme)
  const [selectedImages, setSelectedImages] = useState<string[]>([])

  const handleImageClick = (imageUrl: string) => {
    setSelectedImages((prev) => {
      if (prev.includes(imageUrl)) {
        // 이미 선택된 이미지면 제거
        const newSelection = prev.filter((url) => url !== imageUrl)
        onSelectionChange(newSelection)
        return newSelection
      } else {
        // 최대 개수 체크
        if (prev.length >= maxSelection) {
          return prev
        }
        const newSelection = [...prev, imageUrl]
        onSelectionChange(newSelection)
        return newSelection
      }
    })
  }

  const handleRemoveImage = (imageUrl: string) => {
    setSelectedImages((prev) => {
      const newSelection = prev.filter((url) => url !== imageUrl)
      onSelectionChange(newSelection)
      return newSelection
    })
  }

  const isSelected = (imageUrl: string) => selectedImages.includes(imageUrl)
  const canSelectMore = selectedImages.length < maxSelection
  const isMinSelectionMet = selectedImages.length >= minSelection

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          이미지 선택
        </h3>
        <p className={`text-sm mb-4 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          최소 {minSelection}장, 최대 {maxSelection}장 선택해주세요 ({selectedImages.length}/{maxSelection})
        </p>
        {!isMinSelectionMet && (
          <div className={`p-3 rounded-md mb-4 ${
            theme === 'dark' 
              ? 'bg-yellow-900/20 border border-yellow-700' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
            }`}>
              최소 {minSelection}장 이상 선택해주세요.
            </p>
          </div>
        )}
      </div>

      {/* 선택된 이미지 미리보기 */}
      {selectedImages.length > 0 && (
        <div>
          <h4 className={`text-sm font-medium mb-3 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            선택된 이미지 ({selectedImages.length}장)
          </h4>
          <div className="flex gap-3 overflow-x-auto pb-2 pt-4 pl-4">
            {selectedImages.map((imageUrl, index) => (
              <div key={imageUrl} className="relative flex-shrink-0">
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-purple-500">
                  <img
                    src={imageUrl}
                    alt={`Selected ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleRemoveImage(imageUrl)}
                    className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                      theme === 'dark'
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-white hover:bg-gray-100'
                    } shadow-md`}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shadow-lg z-10">
                  <span className="text-white text-sm font-bold">{index + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 이미지 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {dummyProductImages.map((imageUrl) => {
          const selected = isSelected(imageUrl)
          const disabled = !selected && !canSelectMore

          return (
            <Card
              key={imageUrl}
              onClick={() => !disabled && handleImageClick(imageUrl)}
              className={`cursor-pointer transition-all relative ${
                selected
                  ? 'border-2 border-purple-500 ring-2 ring-purple-200 dark:ring-purple-900'
                  : disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'border-gray-700 hover:border-gray-600'
                      : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CardContent className="p-0">
                <div className="aspect-square relative">
                  <img
                    src={imageUrl}
                    alt="Product"
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                  {selected && (
                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  )}
                  {!selected && !disabled && (
                    <div className="absolute top-2 right-2">
                      <div className={`w-6 h-6 rounded-full border-2 ${
                        theme === 'dark' ? 'border-gray-300' : 'border-gray-400'
                      } bg-white/80`} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 선택 상태 표시 */}
      <div className={`p-4 rounded-lg ${
        theme === 'dark' 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-gray-50 border border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              선택된 이미지: {selectedImages.length}장
            </p>
            {isMinSelectionMet && (
              <p className={`text-xs mt-1 ${
                theme === 'dark' ? 'text-green-400' : 'text-green-600'
              }`}>
                ✓ 최소 선택 개수를 충족했습니다
              </p>
            )}
          </div>
          <Badge
            variant={isMinSelectionMet ? 'default' : 'secondary'}
            className={
              isMinSelectionMet
                ? 'bg-green-500 text-white'
                : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300'
                  : 'bg-gray-200 text-gray-600'
            }
          >
            {selectedImages.length}/{maxSelection}
          </Badge>
        </div>
      </div>
    </div>
  )
}

