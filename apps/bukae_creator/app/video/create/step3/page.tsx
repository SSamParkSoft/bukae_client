'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, GripVertical, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useProduct } from '@/lib/hooks/useProducts'
import { useImages } from '@/lib/hooks/useImages'

export default function Step3Page() {
  const router = useRouter()
  const { 
    selectedProducts, 
    selectedImages, 
    setSelectedImages,
    creationMode 
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const selectedProduct = selectedProducts[0]
  
  // 상품 이미지 가져오기
  const { data: productData } = useProduct(selectedProduct?.id || null)
  const { data: allImages } = useImages()
  
  // 사용 가능한 이미지 목록
  const availableImages = useMemo(() => {
    const images: string[] = []
    
    // 1. 선택된 상품의 이미지들
    if (productData?.images) {
      images.push(...productData.images.map((img) => img.url))
    }
    
    // 2. 전체 이미지 목록에서 상품 이미지 추가
    if (allImages) {
      const productImageUrls = allImages
        .filter((img) => img.product?.id === selectedProduct?.id)
        .map((img) => img.url)
      images.push(...productImageUrls)
    }
    
    // 3. 상품 기본 이미지
    if (selectedProduct?.image) {
      images.push(selectedProduct.image)
    }
    
    // 중복 제거
    const uniqueImages = Array.from(new Set(images))

    // 서버/DB에서 이미지가 하나도 안 올 때 사용할 더미 이미지들 (최소 5장 이상)
    if (uniqueImages.length === 0) {
      return [
        '/media/spael-massager.png',
        '/media/air-filter-set.png',
        '/media/bluetooth-speaker.png',
        '/media/led-strip-light.png',
        '/media/num1.png',
        '/media/num2.png',
        '/media/num3.png',
        '/media/num4.png',
        '/media/num5.png',
        '/media/num6.png',
      ]
    }

    return uniqueImages
  }, [productData, allImages, selectedProduct])

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // 이미지 선택
  const handleImageSelect = (imageUrl: string) => {
    if (selectedImages.includes(imageUrl)) {
      // 이미 선택된 이미지는 제거
      setSelectedImages(selectedImages.filter(url => url !== imageUrl))
    } else {
      // 새 이미지 추가
      setSelectedImages([...selectedImages, imageUrl])
    }
  }

  // 드래그 시작
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  // 드롭
  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null) return

    const newImages = [...selectedImages]
    const [removed] = newImages.splice(draggedIndex, 1)
    newImages.splice(dropIndex, 0, removed)

    setSelectedImages(newImages)
    setDraggedIndex(null)
  }

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // 다음 단계로 이동
  const handleNext = () => {
    if (selectedImages.length < 5) {
      alert('최소 5장 이상의 이미지를 선택해주세요.')
      return
    }

    router.push('/video/create/step4')
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen justify-center"
    >
      <div className="flex w-full max-w-[1600px]">
        <StepIndicator />
        <div className="flex-1 p-4 md:p-8 overflow-y-auto min-w-0">
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                이미지 선택 및 순서 설정
              </h1>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                영상에 사용할 이미지를 선택하고 순서를 조정하세요 (최소 5장 이상 권장)
              </p>
            </div>

            {/* 선택된 이미지 목록 (드래그 앤 드롭) */}
            {selectedImages.length > 0 && (
              <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
                <CardHeader>
                  <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    선택된 이미지 ({selectedImages.length}장)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedImages.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => {
                          e.preventDefault()
                        }}
                        onDrop={() => handleDrop(index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-4 p-4 rounded-lg border cursor-move transition-all ${
                          draggedIndex === index
                            ? 'opacity-50 border-purple-500'
                            : theme === 'dark'
                              ? 'bg-gray-900 border-gray-700 hover:border-purple-500'
                              : 'bg-gray-50 border-gray-200 hover:border-purple-500'
                        }`}
                      >
                        <GripVertical className={`w-5 h-5 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <div className="flex-1 flex items-center gap-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                            <img
                              src={imageUrl}
                              alt={`Image ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200'
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              씬 {index + 1}
                            </p>
                            <p className={`text-xs ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {imageUrl.substring(0, 50)}...
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedImages(selectedImages.filter((_, i) => i !== index))
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 사용 가능한 이미지 목록 */}
            <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
              <CardHeader>
                <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                  사용 가능한 이미지
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availableImages.length === 0 ? (
                  <div className={`text-center py-8 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    사용 가능한 이미지가 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {availableImages.map((imageUrl) => {
                      const isSelected = selectedImages.includes(imageUrl)
                      return (
                        <div
                          key={imageUrl}
                          onClick={() => handleImageSelect(imageUrl)}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            isSelected
                              ? 'border-purple-500 ring-2 ring-purple-500'
                              : theme === 'dark'
                                ? 'border-gray-700 hover:border-purple-500'
                                : 'border-gray-200 hover:border-purple-500'
                          }`}
                        >
                          <img
                            src={imageUrl}
                            alt="Product image"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200'
                            }}
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                                <span className="text-white text-sm font-bold">
                                  {selectedImages.indexOf(imageUrl) + 1}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 다음 단계 버튼 */}
            {selectedImages.length >= 5 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end pt-4"
              >
                <Button
                  onClick={handleNext}
                  size="lg"
                  className="gap-2"
                >
                  다음 단계
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {/* 안내 메시지 */}
            {selectedImages.length < 5 && (
              <div className={`p-4 rounded-lg ${
                theme === 'dark'
                  ? 'bg-yellow-900/20 border border-yellow-700'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'
                }`}>
                  💡 최소 5장 이상의 이미지를 선택해주세요. ({selectedImages.length}/5)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
