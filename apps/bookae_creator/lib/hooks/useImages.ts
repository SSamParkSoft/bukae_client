// Image API React Query Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { imagesApi } from '@/lib/api/images'
import type { ImageRequest } from '@/lib/types/api/image'

export const useImages = () => {
  return useQuery({
    queryKey: ['images'],
    queryFn: () => imagesApi.getAllImages(),
    staleTime: 30 * 1000, // 30초
  })
}

export const useImage = (id: string | null) => {
  return useQuery({
    queryKey: ['images', id],
    queryFn: () => {
      if (!id) throw new Error('Image ID is required')
      return imagesApi.getImageById(id)
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export const useCreateImage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ImageRequest) => imagesApi.createImage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
  })
}

export const useUpdateImage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ImageRequest }) =>
      imagesApi.updateImage(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['images'] })
      queryClient.invalidateQueries({ queryKey: ['images', variables.id] })
    },
  })
}

export const useDeleteImage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => imagesApi.deleteImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] })
    },
  })
}

