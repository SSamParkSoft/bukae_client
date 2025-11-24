import { create } from 'zustand'
import type { ConceptType } from '@/lib/data/templates'
import type { AutoScene } from '@/lib/types/video'

export type Platform = 'coupang' | 'naver' | 'aliexpress' | 'amazon'

export interface Product {
  id: string
  name: string
  price: number
  image: string
  platform: Platform
  url: string
  description?: string
}

export interface VideoEditData {
  title: string
  effects: string[]
  productContent: Record<string, string> // 상품별 편집 내용
}

// 스크립트 생성 방법
export type ScriptMethod = 'edit' | 'auto'

// STEP2 모드 타입
export type Step2Mode = 'manual' | 'auto'

// STEP2 결과물 인터페이스
export interface Step2Result {
  mode: Step2Mode
  finalScript: string
  selectedImages?: string[] // auto 모드용
  scenes?: AutoScene[] // auto 모드용
  uploadedVideo?: File // manual 모드용
  draftVideo: string // AI 초안 영상 경로
  referenceVideo?: string // DB 추천 영상 경로
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
  reset: () => void
}

const initialState = {
  currentStep: 1,
  selectedProducts: [],
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
}

export const useVideoCreateStore = create<VideoCreateState>((set) => ({
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
        selectedProducts: [product],
        productNames: { [product.id]: product.name },
        productVideos: existingVideos ? { [product.id]: existingVideos } : {},
        productImages: existingImages ? { [product.id]: existingImages } : {},
        productDetailImages: existingDetailImages ? { [product.id]: existingDetailImages } : {},
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
  clearProducts: () => set({ selectedProducts: [], productNames: {}, productVideos: {}, productImages: {}, productDetailImages: {} }),
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
  reset: () => set(initialState),
}))

