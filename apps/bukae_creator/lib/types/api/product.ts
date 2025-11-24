// Product API 타입 정의

export type ShoppingMall = 'COUPANG'

export interface ProductRequest {
  name: string
  description?: string
  shoppingMall: ShoppingMall
  rating?: number
  reviewCount?: number
  price?: number
  imageIds?: string[]
}

export interface ImageResponse {
  id: string
  url: string
}

export interface ProductResponse {
  id: string
  name: string
  description?: string
  shoppingMall: ShoppingMall
  rating?: number
  reviewCount?: number
  price?: number
  images: ImageResponse[]
}

export interface Product {
  id: string
  name: string
  description?: string
  shoppingMall: ShoppingMall
  rating?: number
  reviewCount?: number
  price?: number
  images: Image[]
  createdAt: string
  updatedAt: string
}

export interface Image {
  id: string
  product?: Product
  url: string
  filename?: string
  createdAt: string
  updatedAt: string
}

