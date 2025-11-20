// Product API 함수

import { api } from './client'
import type { ProductRequest, ProductResponse, Product } from '@/lib/types/api/product'

export const productsApi = {
  /**
   * 모든 상품 조회
   * GET /api/v1/products
   */
  getAllProducts: async (): Promise<ProductResponse[]> => {
    return api.get<ProductResponse[]>('/api/v1/products')
  },

  /**
   * 특정 상품 조회
   * GET /api/v1/products/{id}
   */
  getProductById: async (id: string): Promise<ProductResponse> => {
    return api.get<ProductResponse>(`/api/v1/products/${id}`)
  },

  /**
   * 상품 생성
   * POST /api/v1/products
   */
  createProduct: async (data: ProductRequest): Promise<ProductResponse> => {
    return api.post<ProductResponse>('/api/v1/products', data)
  },

  /**
   * 상품 수정
   * PUT /api/v1/products/{id}
   */
  updateProduct: async (id: string, data: ProductRequest): Promise<ProductResponse> => {
    return api.put<ProductResponse>(`/api/v1/products/${id}`, data)
  },

  /**
   * 상품 삭제
   * DELETE /api/v1/products/{id}
   */
  deleteProduct: async (id: string): Promise<void> => {
    return api.delete<void>(`/api/v1/products/${id}`)
  },
}

