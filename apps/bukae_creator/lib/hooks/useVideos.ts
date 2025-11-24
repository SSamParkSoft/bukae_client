// Video API React Query Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { videosApi } from '@/lib/api/videos'

export const useVideos = () => {
  return useQuery({
    queryKey: ['videos'],
    queryFn: () => videosApi.getAllVideos(),
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

