// Video API 함수

import { api } from './client'
import type { Video } from '@/lib/types/api/video'

export const videosApi = {
  /**
   * 모든 비디오 조회
   * GET /api/v1/videos
   */
  getAllVideos: async (): Promise<Video[]> => {
    return api.get<Video[]>('/api/v1/videos')
  },

  /**
   * 특정 비디오 조회
   * GET /api/v1/videos/{videoId}
   */
  getVideo: async (videoId: string): Promise<Video> => {
    return api.get<Video>(`/api/v1/videos/${videoId}`)
  },

  /**
   * 비디오 삭제
   * DELETE /api/v1/videos/{videoId}
   */
  deleteVideo: async (videoId: string): Promise<void> => {
    return api.delete<void>(`/api/v1/videos/${videoId}`)
  },
}

