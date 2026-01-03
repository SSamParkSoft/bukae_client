import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ConceptType } from '@/lib/data/templates'
import type { AutoScene } from '@/lib/types/video'
// 도메인 모델 import
import type { Product, Platform } from '@/lib/types/domain/product'
import type { TimelineData, TimelineScene } from '@/lib/types/domain/timeline'
import type { SceneScript } from '@/lib/types/domain/script'
import type { VideoEditData, Step2Result, ScriptMethod, CreationMode } from '@/lib/types/domain/video'

// 타입들은 domain에서 import하므로 여기서는 제거

// Timeline 데이터 구조
export interface TimelineScene {
  sceneId: number
  duration: number
  transition: string
  transitionDuration?: number // 전환 시간 (초), 기본값 0.5
  image: string // base64 또는 URL
  imageFit?: 'cover' | 'contain' | 'fill' // 이미지 표시 방식
  splitIndex?: number // 씬 분할 시 하위 번호 (1, 2, 3...), 있으면 독립적인 씬으로 처리
  imageTransform?: {
    x: number
    y: number
    width: number
    height: number
    scaleX: number
    scaleY: number
    rotation: number
    baseWidth?: number // 원본 이미지 너비 (scale 제거)
    baseHeight?: number // 원본 이미지 높이 (scale 제거)
  }
  // 고급 효과
  advancedEffects?: {
    glow?: {
      enabled: boolean
      distance?: number // 후광 거리
      outerStrength?: number // 외부 강도
      innerStrength?: number // 내부 강도
      color?: number // 색상 (hex)
    }
    particles?: {
      enabled: boolean
      type?: 'sparkle' | 'snow' | 'confetti' | 'stars' // 파티클 타입
      count?: number // 파티클 개수
      duration?: number // 지속 시간
    }
    glitch?: {
      enabled: boolean
      intensity?: number // 글리치 강도
    }
  }
  text: {
    content: string
    font: string
    fontWeight?: number
    color: string
    position?: string
    fontSize?: number
    transform?: {
      x: number
      y: number
      width: number
      height: number
      scaleX: number
      scaleY: number
      rotation: number
      baseWidth?: number // 원본 텍스트 너비 (scale 제거)
      baseHeight?: number // 원본 텍스트 높이 (scale 제거)
    }
    style?: {
      bold?: boolean
      italic?: boolean
      underline?: boolean
      align?: 'left' | 'center' | 'right' | 'justify'
    }
  }
}

export interface TimelineData {
  fps: number
  resolution: string
  scenes: TimelineScene[]
  playbackSpeed?: number // 전체 영상 재생 배속 (기본값 1.0)
}

interface VideoCreateState {
  currentStep: number
  selectedProducts: Product[]
  videoEditData: VideoEditData | null
  isCreating: boolean
  creationProgress: number
  // 스크립트 생성 관련
  scriptMethod: ScriptMethod
  concept: ConceptType | null
  tone: string | null
  script: string | null
  // 상품별 데이터
  productNames: Record<string, string>
  productVideos: Record<string, File[]>
  productImages: Record<string, string[]>
  productDetailImages: Record<string, string[]>
  // 효과 선택
  thumbnailTemplate: string | null
  thumbnailTitle: string
  thumbnailSubtitle: string
  voiceTemplate: string | null
  subtitlePosition: string | null
  subtitleFont: string | null
  subtitleColor: string | null
  bgmTemplate: string | null
  transitionTemplate: string | null
  showPriceInfo: boolean
  introTemplate: string | null
  // STEP2 관련
  step2Result: Step2Result | null
  // 새로운 프로세스 관련
  creationMode: CreationMode | null // 'manual' | 'auto'
  scriptStyle: ConceptType | null // 대본 스타일
  selectedImages: string[] // 선택된 이미지 URL 배열 (순서 포함)
  scenes: SceneScript[] // 씬별 대본
  timeline: TimelineData | null // 타임라인 데이터
  videoTitle: string // 유튜브 영상 제목
  videoTitleCandidates: string[] // AI 추천 제목 후보
  videoDescription: string // 영상 상세 설명
  videoHashtags: string[] // 영상 해시태그
  isStepIndicatorCollapsed: boolean // 단계 표시기 접기/펼치기 상태
  setCurrentStep: (step: number) => void
  addProduct: (product: Product) => void
  removeProduct: (productId: string) => void
  clearProducts: () => void
  setVideoEditData: (data: VideoEditData) => void
  setIsCreating: (isCreating: boolean) => void
  setCreationProgress: (progress: number) => void
  setScriptMethod: (method: ScriptMethod) => void
  setConcept: (concept: ConceptType | null) => void
  setTone: (tone: string | null) => void
  setScript: (script: string | null) => void
  setProductName: (productId: string, name: string) => void
  setProductVideos: (productId: string, videos: File[]) => void
  setProductImages: (productId: string, images: string[]) => void
  setProductDetailImages: (productId: string, images: string[]) => void
  setThumbnailTemplate: (templateId: string | null) => void
  setThumbnailTitle: (title: string) => void
  setThumbnailSubtitle: (subtitle: string) => void
  setVoiceTemplate: (templateId: string | null) => void
  setSubtitlePosition: (position: string | null) => void
  setSubtitleFont: (fontId: string | null) => void
  setSubtitleColor: (colorId: string | null) => void
  setBgmTemplate: (templateId: string | null) => void
  setTransitionTemplate: (templateId: string | null) => void
  setShowPriceInfo: (show: boolean) => void
  setIntroTemplate: (templateId: string | null) => void
  setStep2Result: (result: Step2Result | null) => void
  // 새로운 프로세스 setter
  setCreationMode: (mode: CreationMode | null) => void
  setScriptStyle: (style: ConceptType | null) => void
  setSelectedImages: (images: string[]) => void
  setScenes: (scenes: SceneScript[]) => void
  setTimeline: (timeline: TimelineData | null) => void
  setVideoTitle: (title: string) => void
  setVideoTitleCandidates: (candidates: string[]) => void
  setVideoDescription: (description: string) => void
  setVideoHashtags: (hashtags: string[]) => void
  setIsStepIndicatorCollapsed: (collapsed: boolean) => void
  reset: () => void
}

const initialState = {
  currentStep: 1,
  selectedProducts: [],
  selectedProductResponses: [],
  videoEditData: null,
  isCreating: false,
  creationProgress: 0,
  scriptMethod: 'edit' as ScriptMethod,
  concept: null,
  tone: null,
  script: null,
  productNames: {},
  productVideos: {},
  productImages: {},
  productDetailImages: {},
  thumbnailTemplate: null,
  thumbnailTitle: '',
  thumbnailSubtitle: '',
  voiceTemplate: null,
  subtitlePosition: null,
  subtitleFont: null,
  subtitleColor: null,
  bgmTemplate: null,
  transitionTemplate: null,
  showPriceInfo: true,
  introTemplate: null,
  step2Result: null,
  // 새로운 프로세스 초기값
  creationMode: null,
  scriptStyle: null,
  selectedImages: [],
  scenes: [],
  timeline: null,
  videoTitle: '',
  videoTitleCandidates: [],
  videoDescription: '',
  videoHashtags: [],
  isStepIndicatorCollapsed: false,
}

export const useVideoCreateStore = create<VideoCreateState>()(
  persist(
    (set) => ({
      ...initialState,
      setCurrentStep: (step) => set({ currentStep: step }),
      addProduct: (product) =>
        set((state) => {
          const isSameProductSelected = state.selectedProducts.some((p) => p.id === product.id)
          if (isSameProductSelected) {
            // 이미 선택된 상품이면 변경 없음
            return state
          }

          const existingVideos = state.productVideos[product.id]
          const existingImages = state.productImages[product.id]
          const existingDetailImages = state.productDetailImages[product.id]

          return {
            selectedProducts: [...state.selectedProducts, product],
            productNames: { ...state.productNames, [product.id]: product.name },
            productVideos: existingVideos ? { ...state.productVideos, [product.id]: existingVideos } : state.productVideos,
            productImages: existingImages ? { ...state.productImages, [product.id]: existingImages } : state.productImages,
            productDetailImages: existingDetailImages ? { ...state.productDetailImages, [product.id]: existingDetailImages } : state.productDetailImages,
          }
        }),
      removeProduct: (productId) =>
        set((state) => {
          const { [productId]: _, ...productNames } = state.productNames
          const { [productId]: __, ...productVideos } = state.productVideos
          const { [productId]: ___, ...productImages } = state.productImages
          const { [productId]: ____, ...productDetailImages } = state.productDetailImages
          return {
            selectedProducts: state.selectedProducts.filter((p) => p.id !== productId),
            productNames,
            productVideos,
            productImages,
            productDetailImages,
          }
        }),
      clearProducts: () => set({ 
        selectedProducts: [], 
        productNames: {}, 
        productVideos: {}, 
        productImages: {}, 
        productDetailImages: {} 
      }),
      setVideoEditData: (data) => set({ videoEditData: data }),
      setIsCreating: (isCreating) => set({ isCreating }),
      setCreationProgress: (progress) => set({ creationProgress: progress }),
      setScriptMethod: (method) => set({ scriptMethod: method }),
      setConcept: (concept) => set({ concept }),
      setTone: (tone) => set({ tone }),
      setScript: (script) => set({ script }),
      setProductName: (productId, name) =>
        set((state) => ({
          productNames: { ...state.productNames, [productId]: name },
        })),
      setProductVideos: (productId, videos) =>
        set((state) => ({
          productVideos: { ...state.productVideos, [productId]: videos },
        })),
      setProductImages: (productId, images) =>
        set((state) => ({
          productImages: { ...state.productImages, [productId]: images },
        })),
      setProductDetailImages: (productId, images) =>
        set((state) => ({
          productDetailImages: { ...state.productDetailImages, [productId]: images },
        })),
      setThumbnailTemplate: (templateId) => set({ thumbnailTemplate: templateId }),
      setThumbnailTitle: (title) => set({ thumbnailTitle: title }),
      setThumbnailSubtitle: (subtitle) => set({ thumbnailSubtitle: subtitle }),
      setVoiceTemplate: (templateId) => set({ voiceTemplate: templateId }),
      setSubtitlePosition: (position) => set({ subtitlePosition: position }),
      setSubtitleFont: (fontId) => set({ subtitleFont: fontId }),
      setSubtitleColor: (colorId) => set({ subtitleColor: colorId }),
      setBgmTemplate: (templateId) => set({ bgmTemplate: templateId }),
      setTransitionTemplate: (templateId) => set({ transitionTemplate: templateId }),
      setShowPriceInfo: (show) => set({ showPriceInfo: show }),
      setIntroTemplate: (templateId) => set({ introTemplate: templateId }),
      setStep2Result: (result) => set({ step2Result: result }),
      // 새로운 프로세스 setter
      setCreationMode: (mode) => set({ creationMode: mode }),
      setScriptStyle: (style) => set({ scriptStyle: style }),
      setSelectedImages: (images) => set({ selectedImages: images }),
      setScenes: (scenes) => set({ scenes }),
      setTimeline: (timeline) => set({ timeline }),
      setVideoTitle: (title) => set({ videoTitle: title }),
      setVideoTitleCandidates: (candidates) => set({ videoTitleCandidates: candidates }),
      setVideoDescription: (description) => set({ videoDescription: description }),
      setVideoHashtags: (hashtags) => set({ videoHashtags: hashtags }),
      setIsStepIndicatorCollapsed: (collapsed) => set({ isStepIndicatorCollapsed: collapsed }),
      reset: () => set(initialState),
    }),
    {
      name: 'bookae-video-create-storage',
      storage: createJSONStorage(() => localStorage),
      // File 객체는 직렬화 불가능하므로 제외
      partialize: (state) => {
        // step2Result의 uploadedVideo는 File 타입이므로 제외
        const step2ResultWithoutFile = state.step2Result
          ? {
              ...state.step2Result,
              uploadedVideo: undefined,
            }
          : null

        return {
          ...state,
          // productVideos는 File[] 타입이므로 제외
          productVideos: {},
          step2Result: step2ResultWithoutFile,
        }
      },
    }
  )
)

