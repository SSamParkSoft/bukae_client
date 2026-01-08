'use client'

import { useState, useEffect, useMemo, useRef, useCallback, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import type { SceneScript } from '@/lib/types/domain/script'
import { useThemeStore } from '@/store/useThemeStore'
import { conceptOptions, conceptTones, toneExamples, type ConceptType } from '@/lib/data/templates'
import { useVideoCreateAuth } from '@/hooks/useVideoCreateAuth'
import { studioScriptApi } from '@/lib/api/studio-script'
import type { ScriptType } from '@/lib/types/api/studio-script'
import { 
  requestCoupangExtensionStorage, 
  extractImagesFromStorage,
  type CoupangExtensionStorageData 
} from '@/lib/utils/coupang-extension-storage'

export function useStep2Container() {
  const router = useRouter()
  const { 
    selectedProducts, 
    selectedImages, 
    setSelectedImages, 
    scriptStyle, 
    tone,
    setScriptStyle, 
    setTone,
    setScenes,
    scenes,
    setHasUnsavedChanges,
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const selectedProduct = selectedProducts[0]
  
  const [expandedConceptId, setExpandedConceptId] = useState<ConceptType | null>(null)
  const [selectedScriptStyle, setSelectedScriptStyle] = useState<ConceptType | null>(scriptStyle)
  const [selectedTone, setSelectedTone] = useState<string | null>(tone)
  const [isStyleConfirmed, setIsStyleConfirmed] = useState(false)
  const [openToneExampleId, setOpenToneExampleId] = useState<string | null>(null)
  const [showConfirmPopover, setShowConfirmPopover] = useState(false)
  const [confirmPopoverToneId, setConfirmPopoverToneId] = useState<string | null>(null)

  // 토큰 검증
  const { isValidatingToken } = useVideoCreateAuth()
  
  // Extension Storage에서 가져온 이미지
  const [extensionImages, setExtensionImages] = useState<string[]>([])
  
  // 사용자가 직접 업로드한 이미지
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  // 이미지 및 스크립트 관련 상태
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

  // store의 값이 복원되면 로컬 state 동기화
  useEffect(() => {
    if (scriptStyle) {
      setTimeout(() => {
        setSelectedScriptStyle(scriptStyle)
        setSelectedTone(tone)
        setExpandedConceptId(scriptStyle)
      }, 0)
    }
  }, [scriptStyle, tone]) // eslint-disable-line react-hooks/exhaustive-deps

  // 상품이 변경될 때 extensionImages와 sceneScripts 초기화
  useEffect(() => {
    setExtensionImages([])
    setUploadedImages([])
    setSceneScripts(new Map())
    setEditedScripts(new Map())
    setGeneratingScenes(new Set())
  }, [selectedProduct?.id])

  // Extension Storage에서 이미지 로드
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      console.log('[Step2] Extension Storage 로드 시작')
    }
    
    const loadExtensionImages = async () => {
      try {
        // Extension Storage 접근 가능 여부 테스트
        const { testExtensionStorageAccess } = await import('@/lib/utils/coupang-extension-storage')
        const canAccess = await testExtensionStorageAccess()
        
        if (!canAccess) {
          if (isDev) {
            console.warn('[Step2] ⚠️ Extension Storage 접근 불가 - 확장프로그램이 응답하지 않습니다')
          }
          return
        }
        
        const storageData = await requestCoupangExtensionStorage()
        if (storageData) {
          const productId = selectedProduct?.id
          const images = extractImagesFromStorage(storageData, productId)
          if (isDev) {
            console.log('[Step2] Extension Storage 이미지 로드:', {
              productId,
              imagesCount: images.length,
            })
          }
          setExtensionImages(images)
        }
      } catch (error) {
        console.error('[Step2] Extension Storage 이미지 로드 실패:', error)
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
      console.log('[Step2] availableImages 생성:', {
        selectedProduct: selectedProduct ? {
          id: selectedProduct.id,
          name: selectedProduct.name,
          image: selectedProduct.image,
          imagesLength: selectedProduct.images?.length || 0,
          platform: selectedProduct.platform,
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
    
    // Extension Storage에서 가져온 이미지는 쿠팡 익스텐션에서만 오므로
    // 알리 익스프레스 상품인 경우에는 제외
    // 쿠팡 상품인 경우에만 extensionImages 추가
    if (selectedProduct?.platform === 'coupang') {
      extensionImages.forEach((img) => {
        if (img) imageSet.add(img)
      })
    }
    
    // 사용자가 직접 업로드한 이미지 추가 (항상 마지막에)
    uploadedImages.forEach((img) => {
      if (img) imageSet.add(img)
    })
    
    const images = Array.from(imageSet)
    if (isDev) {
      console.log('[Step2] 최종 availableImages:', {
        count: images.length,
        platform: selectedProduct?.platform,
        extensionImagesIncluded: selectedProduct?.platform === 'coupang',
        images: images.slice(0, 5) // 처음 5개만 로그
      })
    }
    
    return images
  }, [selectedProduct, extensionImages, uploadedImages])
  
  // 이미지 업로드 핸들러
  const handleImageUpload = useCallback((imageUrl: string) => {
    setUploadedImages((prev) => [...prev, imageUrl])
    setHasUnsavedChanges(true)
  }, [setHasUnsavedChanges])

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
      // scenes의 순서에 맞춰 selectedImages도 업데이트 (Step3에서 순서 변경 시 동기화)
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
            // scenes의 imageUrl을 우선 사용 (Step3에서 변경된 순서 반영)
            const imageUrl = scene.imageUrl || imagesToUse[index]
            restoredSceneScripts.set(index, {
              ...scene,
              imageUrl,
              // sceneId가 이미 있으면 유지, 없으면 새로 할당 (그룹 정보 보존)
              sceneId: scene.sceneId || index + 1,
            })
          }
        })
        setSceneScripts(restoredSceneScripts)
      }
    }
  }, [scenes.length, selectedImages, setSelectedImages]) // scenes.length만 dependency로 사용하여 무한 루프 방지

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
  const mapConceptToScriptType = useCallback((concept: typeof scriptStyle): ScriptType => {
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
  }, [])

  // 대본 스타일 선택
  const handleScriptStyleSelect = useCallback((concept: ConceptType, toneId: string) => {
    const isSameSelection = selectedScriptStyle === concept && selectedTone === toneId

    if (isSameSelection) {
      // 같은 것을 다시 클릭하면 선택 해제
      setSelectedScriptStyle(null)
      setSelectedTone(null)
      setScriptStyle(null)
      setTone(null)
      setExpandedConceptId(null)
      setShowConfirmPopover(false)
      setConfirmPopoverToneId(null)
      setIsStyleConfirmed(false)
      return
    }

    setSelectedScriptStyle(concept)
    setSelectedTone(toneId)
    setScriptStyle(concept)
    setTone(toneId)
    setExpandedConceptId(concept)
    setHasUnsavedChanges(true)
    
    // 새로운 선택 시 확정 상태 해제
    setIsStyleConfirmed(false)
    
    // 확정 말풍선 표시 (위쪽으로)
    setShowConfirmPopover(true)
    setConfirmPopoverToneId(toneId)
  }, [selectedScriptStyle, selectedTone, setScriptStyle, setTone, setHasUnsavedChanges])

  // 토글 열기 (확정 후에도 다시 열 수 있도록)
  const handleConceptToggle = useCallback((conceptId: ConceptType) => {
    setExpandedConceptId((prev) => (prev === conceptId ? null : conceptId))
  }, [])

  // 톤 예시 토글
  const handleToneExampleToggle = useCallback((toneId: string, open: boolean) => {
    setOpenToneExampleId(open ? toneId : null)
  }, [])

  // 스타일 확정하기
  const handleConfirmStyle = useCallback(() => {
    if (!selectedScriptStyle || !selectedTone) {
      alert('대본 스타일과 말투를 선택해주세요.')
      return
    }
    setIsStyleConfirmed(true)
    setShowConfirmPopover(false)
    setExpandedConceptId(null)
    
    // 다음 단계 버튼으로 스크롤
    setTimeout(() => {
      const nextButton = document.querySelector('[data-next-step-button]') as HTMLElement
      if (nextButton) {
        nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }, [selectedScriptStyle, selectedTone])

  // 다시 선택하기
  const handleReselect = useCallback(() => {
    setIsStyleConfirmed(false)
    setShowConfirmPopover(false)
    setConfirmPopoverToneId(null)
    // 토글은 열어두지 않고 닫음 (사용자가 다시 클릭할 수 있도록)
  }, [])

  // 선택된 모든 이미지에 대해 일괄 대본 생성
  const handleGenerateAllScripts = useCallback(async () => {
    if (!scriptStyle || !tone) {
      alert('대본 스타일과 톤을 먼저 선택해주세요.')
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
  }, [scriptStyle, tone, selectedImages, selectedProducts, mapConceptToScriptType])

  // 이미지 선택
  const handleImageSelect = useCallback((imageUrl: string) => {
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
  }, [selectedImages, setSelectedImages, setHasUnsavedChanges])

  // 드래그 시작
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  // 드롭 위치 계산
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>, index: number) => {
    if (draggedIndex === null) return
    if (draggedIndex === index) return
    
    event.preventDefault()
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const position: 'before' | 'after' = offsetY < rect.height / 2 ? 'before' : 'after'
    setDragOver({ index, position })
  }, [draggedIndex])

  // 드롭
  const handleDrop = useCallback((event?: DragEvent<HTMLDivElement>) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    if (draggedIndex === null || !dragOver) {
      setDraggedIndex(null)
      setDragOver(null)
      return
    }

    // 같은 위치에 드롭하면 아무것도 하지 않음
    if (draggedIndex === dragOver.index) {
      setDraggedIndex(null)
      setDragOver(null)
      return
    }

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
  }, [draggedIndex, dragOver, selectedImages, setSelectedImages, setHasUnsavedChanges])

  // 드래그 종료
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    setDragOver(null)
  }, [])

  // 대본 수정 (입력 값은 즉시 내부 상태에 반영)
  const handleScriptEdit = useCallback((sceneIndex: number, newScript: string) => {
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
  }, [selectedImages, setHasUnsavedChanges])

  // 씬 삭제
  const handleSceneDelete = useCallback((index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index))
    setSceneScripts((prev) => {
      const newMap = new Map(prev)
      newMap.delete(index)
      return newMap
    })
  }, [selectedImages, setSelectedImages])

  // 다음 단계로 이동
  const handleNext = useCallback(() => {
    if (!selectedScriptStyle || !selectedTone) {
      alert('대본 스타일과 톤을 선택해주세요.')
      return
    }

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
    router.push('/video/create/step3')
  }, [selectedScriptStyle, selectedTone, selectedImages, sceneScripts, setScenes, router])

  return {
    // State
    theme,
    isValidatingToken,
    
    // Script Style
    selectedScriptStyle,
    selectedTone,
    isStyleConfirmed,
    expandedConceptId,
    handleScriptStyleSelect,
    handleConceptToggle,
    handleConfirmStyle,
    handleReselect,
    
    // Tone Examples
    openToneExampleId,
    handleToneExampleToggle,
    
    // Confirm Popover
    showConfirmPopover,
    confirmPopoverToneId,
    setShowConfirmPopover,
    setConfirmPopoverToneId,
    setOpenToneExampleId,
    
    // Images
    availableImages,
    selectedImages,
    handleImageSelect,
    handleImageUpload,
    
    // Drag & Drop
    draggedIndex,
    dragOver,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    
    // Scripts
    sceneScripts,
    editedScripts,
    generatingScenes,
    isGeneratingAll,
    showTooltip,
    handleGenerateAllScripts,
    handleScriptEdit,
    handleSceneDelete,
    
    // Refs
    selectedListRef,
    
    // Navigation
    handleNext,
    
    // Data
    conceptOptions,
    conceptTones,
    toneExamples,
  }
}
