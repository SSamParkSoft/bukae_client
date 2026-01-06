'use client'

import Image from 'next/image'
import { useState, useEffect, useMemo, useRef, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, GripVertical, X, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepIndicator from '@/components/StepIndicator'
import ChirpVoiceSelector from '@/components/ChirpVoiceSelector'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import type { SceneScript } from '@/lib/types/domain/script'
import { useThemeStore } from '@/store/useThemeStore'
import { studioScriptApi } from '@/lib/api/studio-script'
import type { ScriptType } from '@/lib/types/api/studio-script'
import { useVideoCreateAuth } from '@/hooks/useVideoCreateAuth'
import { 
  requestCoupangExtensionStorage, 
  extractImagesFromStorage,
  type CoupangExtensionStorageData 
} from '@/lib/utils/coupang-extension-storage'
import { PRODUCT_PLACEHOLDER } from '@/lib/utils/placeholder-image'

export default function Step3Page() {
  const router = useRouter()
  const { 
    selectedProducts, 
    selectedImages, 
    setSelectedImages, 
    scriptStyle,
    tone,
    setScenes,
    scenes,
    setHasUnsavedChanges,
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const selectedProduct = selectedProducts[0]

  // 토큰 검증
  const { isValidatingToken } = useVideoCreateAuth()
  
  // Extension Storage에서 가져온 이미지
  const [extensionImages, setExtensionImages] = useState<string[]>([])

  // 상품이 변경될 때 extensionImages와 sceneScripts 초기화
  useEffect(() => {
    setExtensionImages([])
    setSceneScripts(new Map())
    setEditedScripts(new Map())
    setGeneratingScenes(new Set())
  }, [selectedProduct?.id])

  // Extension Storage에서 이미지 로드
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      console.log('[Step3] Extension Storage 로드 시작')
    }
    
    const loadExtensionImages = async () => {
      try {
        // Extension Storage 접근 가능 여부 테스트
        const { testExtensionStorageAccess } = await import('@/lib/utils/coupang-extension-storage')
        const canAccess = await testExtensionStorageAccess()
        
        if (!canAccess) {
          if (isDev) {
            console.warn('[Step3] ⚠️ Extension Storage 접근 불가 - 확장프로그램이 응답하지 않습니다')
          }
          return
        }
        
        const storageData = await requestCoupangExtensionStorage()
        if (storageData) {
          const productId = selectedProduct?.id
          const images = extractImagesFromStorage(storageData, productId)
          if (isDev) {
            console.log('[Step3] Extension Storage 이미지 로드:', {
              productId,
              imagesCount: images.length,
            })
          }
          setExtensionImages(images)
        }
      } catch (error) {
        console.error('[Step3] Extension Storage 이미지 로드 실패:', error)
      }
    }

    // 확장프로그램이 자동으로 전송하는 메시지 감지
    const autoMessageHandler = (event: MessageEvent) => {
      // storage 데이터가 포함된 메시지 감지
      if (event.data?.products || event.data?.productimages || event.data?.productDetaillmages || event.data?.productDetailImages) {
        const storageData: CoupangExtensionStorageData = {
          products: event.data.products || {},
          productimages: event.data.productimages || {},
          productDetaillmages: event.data.productDetaillmages || event.data.productDetailImages || {},
          lastUpdated: event.data.lastUpdated || Date.now()
        }
        const productId = selectedProduct?.id
        const images = extractImagesFromStorage(storageData, productId)
        if (images.length > 0) {
          setExtensionImages(images)
        }
      }
    }
    
    window.addEventListener('message', autoMessageHandler)
    loadExtensionImages()
    
    return () => {
      window.removeEventListener('message', autoMessageHandler)
    }
  }, [selectedProduct?.id])
  
  // 전역에서 테스트할 수 있도록 window 객체에 함수 추가
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testExtensionStorage = async () => {
        const { testExtensionStorageAccess, requestCoupangExtensionStorage } = await import('@/lib/utils/coupang-extension-storage')
        console.log('=== Extension Storage 테스트 시작 ===')
        const canAccess = await testExtensionStorageAccess()
        if (canAccess) {
          const data = await requestCoupangExtensionStorage()
          console.log('Storage 데이터:', data)
        }
        console.log('=== Extension Storage 테스트 완료 ===')
      }
    }
  }, [])
  
  // 사용 가능한 이미지 목록
  const availableImages = useMemo(() => {
    const isDev = process.env.NODE_ENV === 'development'
    const imageSet = new Set<string>()
    
    if (isDev) {
      console.log('[Step3] availableImages 생성:', {
        selectedProduct: selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          image: selectedProduct.image,
          imagesLength: selectedProduct.images?.length || 0,
        } : null,
        extensionImagesLength: extensionImages.length,
      })
    }
    
    // Product 도메인 모델의 images 필드 사용 (먼저 추가)
    if (selectedProduct?.images?.length) {
      selectedProduct.images.forEach((img) => {
        if (img) imageSet.add(img)
      })
    }
    
    // images가 없으면 대표 이미지 사용
    if (selectedProduct?.image) {
      imageSet.add(selectedProduct.image)
    }
    
    // Extension Storage에서 가져온 이미지 뒤에 추가
    extensionImages.forEach((img) => {
      if (img) imageSet.add(img)
    })
    
    const images = Array.from(imageSet)
    if (isDev) {
      console.log('[Step3] 최종 availableImages:', {
        count: images.length,
        images: images.slice(0, 5) // 처음 5개만 로그
      })
    }
    
    return images
  }, [selectedProduct, extensionImages])

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set())
  const [sceneScripts, setSceneScripts] = useState<Map<number, SceneScript>>(new Map())
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [editedScripts, setEditedScripts] = useState<Map<number, string>>(new Map())
  const [showTooltip, setShowTooltip] = useState(false)
  const selectedListRef = useRef<HTMLDivElement | null>(null)
  const prevSceneScriptsRef = useRef<string>('')
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // sceneScripts를 직렬화하여 안정적인 dependency 생성
  const sceneScriptsSerialized = useMemo(() => {
    if (sceneScripts.size === 0) return ''
    const scenesArray: SceneScript[] = []
    for (let i = 0; i < selectedImages.length; i++) {
      const script = sceneScripts.get(i)
      if (script) {
        // imageUrl이 없으면 selectedImages에서 가져오기
        scenesArray.push({
          ...script,
          imageUrl: script.imageUrl || selectedImages[i],
        })
      } else {
        // 대본이 없더라도 선택한 이미지 순서를 유지하기 위해 빈 씬을 포함
        scenesArray.push({
          sceneId: i + 1,
          script: '',
          imageUrl: selectedImages[i],
          isAiGenerated: false,
        })
      }
    }
    return JSON.stringify(scenesArray)
  }, [sceneScripts, selectedImages])

  // store의 scenes와 selectedImages가 복원되면 로컬 state 동기화
  useEffect(() => {
    if (scenes.length > 0) {
      // scenes의 순서에 맞춰 selectedImages도 업데이트 (Step4에서 순서 변경 시 동기화)
      const reorderedImages = scenes.map((scene) => scene.imageUrl || '').filter(Boolean)
      const currentImagesString = JSON.stringify(selectedImages)
      const reorderedImagesString = JSON.stringify(reorderedImages)
      
      // 실제로 순서가 다를 때만 업데이트 (무한 루프 방지)
      if (reorderedImages.length > 0 && currentImagesString !== reorderedImagesString) {
        setSelectedImages(reorderedImages)
      }

      // sceneScripts 복원 (초기 로드 시에만)
      if (sceneScripts.size === 0 && (selectedImages.length > 0 || reorderedImages.length > 0)) {
        const imagesToUse = reorderedImages.length > 0 ? reorderedImages : selectedImages
        const restoredSceneScripts = new Map<number, SceneScript>()
        scenes.forEach((scene, index) => {
          if (index < imagesToUse.length) {
            // scenes의 imageUrl을 우선 사용 (Step4에서 변경된 순서 반영)
            const imageUrl = scene.imageUrl || imagesToUse[index]
            restoredSceneScripts.set(index, {
              ...scene,
              imageUrl,
              sceneId: index + 1,
            })
          }
        })
        setSceneScripts(restoredSceneScripts)
      }
    }
  }, [scenes.length]) // scenes.length만 dependency로 사용하여 무한 루프 방지

  // sceneScripts가 변경될 때마다 store에 저장 (렌더링 중 업데이트 방지)
  useEffect(() => {
    if (sceneScriptsSerialized && sceneScriptsSerialized !== prevSceneScriptsRef.current) {
      const updatedScenes: SceneScript[] = JSON.parse(sceneScriptsSerialized)
      prevSceneScriptsRef.current = sceneScriptsSerialized
      setScenes(updatedScenes)
    }
  }, [sceneScriptsSerialized, setScenes])

  // cleanup: 컴포넌트 언마운트 시 timeout 정리
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])

  // ConceptType -> ScriptType 매핑
  const mapConceptToScriptType = (concept: typeof scriptStyle): ScriptType => {
    switch (concept) {
      case 'product-info':
      case 'calm-explanation':
        return 'INFORMATION'
      case 'review':
      case 'daily-review':
        return 'EMPATHY'
      case 'emotional':
        return 'HEALING'
      case 'viral':
      case 'promotional':
      default:
        return 'ENTERTAINMENT'
    }
  }

  // 선택된 모든 이미지에 대해 일괄 대본 생성
  const handleGenerateAllScripts = async () => {
    if (!scriptStyle || !tone) {
      alert('Step2에서 대본 스타일과 톤을 먼저 선택해주세요.')
      return
    }

    if (selectedImages.length === 0) {
      alert('이미지를 먼저 선택해주세요.')
      return
    }

    if (selectedImages.length < 5) {
      // 말풍선 UI 표시
      setShowTooltip(true)
      
      // 기존 timeout 정리
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
      
      // 3초 후 자동으로 사라지게
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(false)
      }, 3000)
      
      return
    }

    setIsGeneratingAll(true)
    setGeneratingScenes(new Set(selectedImages.map((_, index) => index)))

    try {
      const product = selectedProducts[0]
      const scriptType = mapConceptToScriptType(scriptStyle)

      const data = await studioScriptApi.generateScripts({
        topic: product?.name || '상품',
        description: product?.description || tone || '상품 리뷰 쇼츠 대본 생성',
        type: scriptType,
        imageUrls: selectedImages,
      })

      const items = Array.isArray(data) ? data : [data]

      const newSceneScripts: SceneScript[] = []
      const newMap = new Map<number, SceneScript>()
      
      selectedImages.forEach((imageUrl, index) => {
        const sceneData = items.find((item) => item.imageUrl === imageUrl) || items[index]
        const sceneScript: SceneScript = {
          sceneId: index + 1,
          script: sceneData?.script || '생성된 대본이 없어요.',
          imageUrl: sceneData?.imageUrl || imageUrl,
          isAiGenerated: !!sceneData?.script,
        }
        newMap.set(index, sceneScript)
        newSceneScripts.push(sceneScript)
      })

      setSceneScripts(newMap)
      // store는 useEffect를 통해 자동으로 업데이트됨

      // 생성된 스크립트 섹션으로 스크롤
      setTimeout(() => {
        if (selectedListRef.current) {
          selectedListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } catch (error) {
      console.error('대본 일괄 생성 오류:', error)
      alert('대본 일괄 생성 중 오류가 발생했어요.')
    } finally {
      setIsGeneratingAll(false)
      setGeneratingScenes(new Set())
    }
  }

  // 이미지 선택
  const handleImageSelect = (imageUrl: string) => {
    if (selectedImages.includes(imageUrl)) {
      // 이미 선택된 이미지는 제거
      const index = selectedImages.indexOf(imageUrl)
      const newSelectedImages = selectedImages.filter(url => url !== imageUrl)
      setSelectedImages(newSelectedImages)
      setHasUnsavedChanges(true)
      
      // 해당 씬 스크립트도 제거
      setSceneScripts((prev) => {
        const newMap = new Map(prev)
        newMap.delete(index)
        // 인덱스 재정렬
        const reorderedMap = new Map<number, SceneScript>()
        let newIndex = 0
        selectedImages.forEach((url, i) => {
          if (i !== index && prev.has(i)) {
            const script = prev.get(i)!
            script.sceneId = newIndex + 1
            reorderedMap.set(newIndex, script)
            newIndex++
          }
        })
        // store는 useEffect를 통해 자동으로 업데이트됨
        return reorderedMap
      })
    } else {
      // 새 이미지 추가
      setSelectedImages([...selectedImages, imageUrl])
      setHasUnsavedChanges(true)
      // 대본은 사용자가 명시적으로 버튼을 눌렀을 때만 생성
    }
  }

  // 드래그 시작
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  // 드롭 위치 계산
  const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const position: 'before' | 'after' = offsetY < rect.height / 2 ? 'before' : 'after'
    setDragOver({ index, position })
  }

  // 드롭
  const handleDrop = (event?: DragEvent<HTMLDivElement>) => {
    event?.preventDefault()
    if (draggedIndex === null || !dragOver) return

    const newImages = [...selectedImages]
    const [removed] = newImages.splice(draggedIndex, 1)

    let targetIndex = dragOver.position === 'after' ? dragOver.index + 1 : dragOver.index
    if (draggedIndex < targetIndex) {
      targetIndex -= 1
    }

    newImages.splice(targetIndex, 0, removed)

    setSelectedImages(newImages)
    setHasUnsavedChanges(true)
    
    // 스크립트도 재정렬
    setSceneScripts((prev) => {
      const newMap = new Map<number, SceneScript>()
      
      newImages.forEach((imageUrl, newIndex) => {
        // 기존 스크립트 찾기
        let foundScript: SceneScript | undefined
        for (const [, script] of prev.entries()) {
          if (script.imageUrl === imageUrl) {
            foundScript = script
            break
          }
        }
        
        if (foundScript) {
          foundScript.sceneId = newIndex + 1
          newMap.set(newIndex, foundScript)
        }
      })
      
      // store는 useEffect를 통해 자동으로 업데이트됨
      return newMap
    })
    
    setDraggedIndex(null)
    setDragOver(null)
  }

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOver(null)
  }

  // 대본 수정 (입력 값은 즉시 내부 상태에 반영)
  const handleScriptEdit = (sceneIndex: number, newScript: string) => {
    setEditedScripts((prev) => {
      const newMap = new Map(prev)
      newMap.set(sceneIndex, newScript)
      return newMap
    })

      // sceneScripts에도 바로 반영하여 handleNext 시 반영되도록
    setSceneScripts((prev) => {
      const newMap = new Map(prev)
      const existing = newMap.get(sceneIndex)
      const imageUrl = selectedImages[sceneIndex]

      if (existing) {
        existing.script = newScript
        // 사용자가 직접 수정한 경우 AI 생성 플래그 제거
        if (existing.isAiGenerated) {
          existing.isAiGenerated = false
        }
        newMap.set(sceneIndex, existing)
      } else if (imageUrl) {
        newMap.set(sceneIndex, {
          sceneId: sceneIndex + 1,
          script: newScript,
          imageUrl,
          isAiGenerated: false,
        })
      }

      // store는 useEffect를 통해 자동으로 업데이트됨
      return newMap
    })
    setHasUnsavedChanges(true)
  }

  // 다음 단계로 이동
  const handleNext = () => {
    if (selectedImages.length < 5) {
      alert('최소 5장 이상의 이미지를 선택해주세요.')
      return
    }

    // 모든 씬 스크립트를 배열로 변환하여 저장
    const finalScenes: SceneScript[] = []
    for (let i = 0; i < selectedImages.length; i++) {
      const script = sceneScripts.get(i)
      if (script) {
        finalScenes.push(script)
      } else {
        // 대본이 없는 경우 기본 대본 생성
        finalScenes.push({
          sceneId: i + 1,
          script: '대본을 생성 중입니다...',
          imageUrl: selectedImages[i],
        })
      }
    }
    
    setScenes(finalScenes)
    router.push('/video/create/step4')
  }

  // 토큰 검증 중에는 로딩 표시
  if (isValidatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>인증 확인 중...</p>
        </div>
      </div>
    )
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
                이미지 선택 및 대본 생성
              </h1>
              <p className={`mt-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                영상에 사용할 이미지를 선택한 뒤, 상단의 AI 스크립트 버튼을 눌러 전체 흐름에 맞는 씬별 대본을 한 번에 생성하고 수정할 수 있어요. (최소 5장 이상 권장)
              </p>
            </div>

            {/* 사용 가능한 이미지 목록 */}
            <Card className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}>
              <CardHeader>
                <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                  이미지 추가 (5개 이상 선택 가능)
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                {availableImages.length === 0 ? (
                  <div className={`text-center py-8 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    사용 가능한 이미지가 없어요.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {availableImages.map((imageUrl) => {
                      const isSelected = selectedImages.includes(imageUrl)
                      return (
                        <div
                          key={imageUrl}
                          onClick={() => handleImageSelect(imageUrl)}
                          className={`relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            isSelected
                              ? 'border-purple-500 ring-2 ring-purple-500'
                              : theme === 'dark'
                                ? 'border-gray-700 hover:border-purple-500'
                                : 'border-gray-200 hover:border-purple-500'
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

            {/* 선택된 이미지 목록 (드래그 앤 드롭) - 사용 가능한 이미지 아래로 이동 */}
            {selectedImages.length > 0 && (
              <Card
                ref={selectedListRef}
                className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
              >
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                    선택된 이미지 및 대본 ({selectedImages.length}장)
                  </CardTitle>
                  {selectedImages.length > 0 && (
                    <div className="relative">
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        onClick={handleGenerateAllScripts}
                        disabled={isGeneratingAll}
                      >
                        <Sparkles className="w-4 h-4" />
                        {isGeneratingAll ? 'AI 스크립트 생성 중...' : 'AI 스크립트 생성'}
                      </Button>
                      
                      {/* 말풍선 UI */}
                      {showTooltip && selectedImages.length < 5 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full right-0 mb-2 z-50"
                        >
                          <div className={`relative px-4 py-2 rounded-lg shadow-lg ${
                            theme === 'dark' 
                              ? 'bg-yellow-600 text-white' 
                              : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                          }`}>
                            <p className="text-sm font-medium whitespace-nowrap">
                              최소 5장 이상의 이미지를 선택해주세요 ({selectedImages.length}/5)
                            </p>
                            {/* 말풍선 꼬리 (아래쪽을 가리킴) */}
                            <div className={`absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 ${
                              theme === 'dark'
                                ? 'border-t-yellow-600'
                                : 'border-t-yellow-100'
                            }`} />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-4 space-y-2">
                    <ChirpVoiceSelector theme={theme} title="목소리 선택" />
                  </div>

                  <div className="space-y-4">
                    {selectedImages.map((imageUrl, index) => {
                      const script = sceneScripts.get(index)
                      const isGenerating = generatingScenes.has(index)
                      const editedScript = editedScripts.get(index) ?? script?.script ?? ''
                      
                      return (
                        <div key={`${imageUrl}-${index}`} className="space-y-2">
                          {dragOver && dragOver.index === index && dragOver.position === 'before' && (
                            <div className="h-0.5 bg-blue-500 rounded-full" />
                          )}
                          <div
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={handleDrop}
                            onDragLeave={() => setDragOver(null)}
                            onDragEnd={handleDragEnd}
                            className={`p-4 rounded-lg border transition-all ${
                              draggedIndex === index
                                ? 'opacity-50 border-purple-500'
                                : theme === 'dark'
                                  ? 'bg-gray-900 border-gray-700 hover:border-purple-500'
                                  : 'bg-gray-50 border-gray-200 hover:border-purple-500'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              <GripVertical className={`w-5 h-5 mt-2 cursor-move ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`} />
                              
                              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0">
                                <Image
                                  src={imageUrl}
                                  alt={`Image ${index + 1}`}
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = PRODUCT_PLACEHOLDER
                                  }}
                                />
                              </div>
                              
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm font-medium ${
                                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    Scene {index + 1}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedImages(selectedImages.filter((_, i) => i !== index))
                                      setSceneScripts((prev) => {
                                        const newMap = new Map(prev)
                                        newMap.delete(index)
                                        return newMap
                                      })
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                                
                                {isGenerating ? (
                                  <div className="flex items-center gap-2 py-2">
                                    <Loader2 className={`w-4 h-4 animate-spin ${
                                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                                    }`} />
                                    <p className={`text-sm ${
                                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                      AI가 대본을 생성하고 있어요...
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {script?.isAiGenerated && (
                                      <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/60 dark:text-purple-200">
                                        <Sparkles className="w-3 h-3" />
                                        AI 생성 스크립트
                                      </div>
                                    )}
                                    <textarea
                                      value={editedScript}
                                      onChange={(e) => handleScriptEdit(index, e.target.value)}
                                      rows={3}
                                      className={`w-full p-2 rounded-lg border resize-none text-sm ${
                                        theme === 'dark'
                                          ? 'bg-gray-800 border-gray-700 text-white'
                                          : 'bg-white border-gray-300 text-gray-900'
                                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                                    placeholder="이 씬에서 말할 내용을 자유롭게 입력하거나, 이미지 선택 영역 우측 하단의 AI 스크립트 생성 버튼을 눌러 자동으로 만들어보세요."
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {dragOver && dragOver.index === index && dragOver.position === 'after' && (
                            <div className="h-0.5 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

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


