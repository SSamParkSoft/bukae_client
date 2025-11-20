// Image API 함수

import { api } from './client'
import type { ImageRequest, Image, ImageResponse } from '@/lib/types/api/image'

export const imagesApi = {
  /**
   * 모든 이미지 조회
   * GET /api/v1/images
   */
  getAllImages: async (): Promise<Image[]> => {
    return api.get<Image[]>('/api/v1/images')
  },

  /**
   * 특정 이미지 조회
   * GET /api/v1/images/{id}
   */
  getImageById: async (id: string): Promise<Image> => {
    return api.get<Image>(`/api/v1/images/${id}`)
  },

  /**
   * 이미지 생성
   * POST /api/v1/images
   */
  createImage: async (data: ImageRequest): Promise<Image> => {
    return api.post<Image>('/api/v1/images', data)
  },

  /**
   * 이미지 수정
   * PUT /api/v1/images/{id}
   */
  updateImage: async (id: string, data: ImageRequest): Promise<Image> => {
    return api.put<Image>(`/api/v1/images/${id}`, data)
  },

  /**
   * 이미지 삭제
   * DELETE /api/v1/images/{id}
   */
  deleteImage: async (id: string): Promise<void> => {
    return api.delete<void>(`/api/v1/images/${id}`)
  },
}

