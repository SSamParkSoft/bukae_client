// Video API React Query Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { videosApi } from '@/lib/api/videos'
import type { VideoListItem } from '@/lib/types/api/video'
import { authStorage } from '@/lib/api/auth-storage'

export const useVideos = () => {
  return useQuery({
    queryKey: ['videos'],
    queryFn: () => videosApi.getAllVideos(),
    staleTime: 30 * 1000, // 30초
  })
}

export const useMyVideos = () => {
  // 인증 토큰이 있을 때만 API 호출
  const hasToken = authStorage.hasTokens()
  
  return useQuery<VideoListItem[]>({
    queryKey: ['my-videos'],
    queryFn: () => videosApi.getMyVideos(),
    enabled: hasToken, // 인증 토큰이 있을 때만 활성화
    staleTime: 30 * 1000, // 30초
  })
}

export const useVideo = (videoId: string | null) => {
  return useQuery({
    queryKey: ['videos', videoId],
    queryFn: () => {
      if (!videoId) throw new Error('Video ID is required')
      return videosApi.getVideo(videoId)
    },
    enabled: !!videoId,
    staleTime: 30 * 1000,
  })
}

export const useDeleteVideo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (videoId: string) => videosApi.deleteVideo(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}

