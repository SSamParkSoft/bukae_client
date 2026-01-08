/**
 * Video API 함수
 */

import { api } from './client'
import type { Video, VideoListItem } from '@/lib/types/api/video'
import { isVideoListItemArray } from '@/lib/utils/type-guards/video'

export const videosApi = {
  /**
   * 내 영상 목록 조회 (보관함)
   * 로그인한 사용자가 생성한 모든 영상 목록을 조회합니다.
   * 정렬: 생성일자 기준 내림차순 (최신순)
   * 데이터가 없을 경우 [] (빈 배열)을 반환합니다.
   * GET /api/v1/videos
   * 
   * @throws {Error} API 응답이 유효하지 않은 경우
   */
  getMyVideos: async (): Promise<VideoListItem[]> => {
    try {
      const response = await api.get<VideoListItem[]>('/api/v1/videos')

      // 빈 배열인 경우 그대로 반환
      if (Array.isArray(response) && response.length === 0) {
        return []
      }

      // 타입 가드로 런타임 검증
      if (!isVideoListItemArray(response)) {
        throw new Error('API 응답이 유효한 VideoListItem 배열이 아닙니다.')
      }

      return response
    } catch (error) {
      throw error
    }
  },

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

