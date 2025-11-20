// Image API 타입 정의

export interface ImageRequest {
  url: string
  filename?: string
}

export interface ImageResponse {
  id: string
  url: string
}

export interface Image {
  id: string
  product?: {
    id: string
    name: string
    description?: string
    shoppingMall: string
    rating?: number
    reviewCount?: number
    price?: number
    images: Image[]
    createdAt: string
    updatedAt: string
  }
  url: string
  filename?: string
  createdAt: string
  updatedAt: string
}

