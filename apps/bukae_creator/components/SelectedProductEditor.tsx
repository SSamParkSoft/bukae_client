'use client'

import { useState, useRef } from 'react'
import { X, Upload, Image as ImageIcon, Video, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useVideoCreateStore, type Product } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import AIRecommendButton from './AIRecommendButton'

interface SelectedProductEditorProps {
  product: Product
}

export default function SelectedProductEditor({ product }: SelectedProductEditorProps) {
  const theme = useThemeStore((state) => state.theme)
  const { productNames, productVideos, productImages, productDetailImages, setProductName, setProductVideos, setProductImages, setProductDetailImages } = useVideoCreateStore()
  
  const productName = productNames[product.id] || product.name
  const videos = productVideos[product.id] || []
  const images = productImages[product.id] || []
  const detailImages = productDetailImages[product.id] || []
  
  const videoInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const detailImageInputRef = useRef<HTMLInputElement>(null)

  const handleNameChange = (value: string) => {
    setProductName(product.id, value)
  }

  const handleNameRecommend = (recommendation: string) => {
    setProductName(product.id, recommendation)
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles: File[] = []
    
    files.forEach((file) => {
      // 파일 형식 검증
      const validTypes = ['video/mp4', 'video/avi', 'video/quicktime']
      if (!validTypes.includes(file.type)) {
        alert('mp4, avi, mov 형식만 업로드 가능합니다.')
        return
      }
      
      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다.')
        return
      }
      
      // TODO: 비디오 길이 검증 (40초) - 클라이언트에서는 정확한 검증이 어려움
      validFiles.push(file)
    })
    
    if (videos.length + validFiles.length > 8) {
      alert('최대 8개까지만 업로드 가능합니다.')
      return
    }
    
    setProductVideos(product.id, [...videos, ...validFiles])
  }

  const handleRemoveVideo = (index: number) => {
    const newVideos = videos.filter((_, i) => i !== index)
    setProductVideos(product.id, newVideos)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const fileUrls = files.map((file) => URL.createObjectURL(file))
    setProductImages(product.id, [...images, ...fileUrls])
  }

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setProductImages(product.id, newImages)
  }

  const handleDetailImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const fileUrls = files.map((file) => URL.createObjectURL(file))
    setProductDetailImages(product.id, [...detailImages, ...fileUrls])
  }

  const handleRemoveDetailImage = (index: number) => {
    const newImages = detailImages.filter((_, i) => i !== index)
    setProductDetailImages(product.id, newImages)
  }

  return (
    <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
      <CardHeader>
        <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
          {product.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 상품명 편집 */}
        <div>
          <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
            상품명
          </Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={productName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="flex-1"
            />
            <AIRecommendButton
              onSelect={handleNameRecommend}
              title="상품명 AI 추천"
              description="AI가 추천하는 상품명을 선택하세요"
            />
          </div>
        </div>

        {/* 상품 영상 업로드 */}
        <div>
          <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
            상품 영상 (최대 8개, 40초, 10MB, mp4/avi/mov)
          </Label>
          <div className="mt-2 space-y-2">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/avi,video/quicktime"
              multiple
              onChange={handleVideoUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => videoInputRef.current?.click()}
              disabled={videos.length >= 8}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              영상 업로드 ({videos.length}/8)
            </Button>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {videos.map((video, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveVideo(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="text-xs mt-1 truncate text-gray-600 dark:text-gray-400">
                    {video.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 상품 이미지 선택 */}
        <div>
          <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
            상품 이미지
          </Label>
          <div className="mt-2 space-y-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => imageInputRef.current?.click()}
              className="w-full"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              이미지 선택
            </Button>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`상품 이미지 ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 상품 상세페이지 이미지 선택 */}
        <div>
          <Label className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
            상품 상세페이지 이미지
          </Label>
          <div className="mt-2 space-y-2">
            <input
              ref={detailImageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleDetailImageSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => detailImageInputRef.current?.click()}
              className="w-full"
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              상세페이지 이미지 선택
            </Button>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {detailImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`상세페이지 이미지 ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveDetailImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

