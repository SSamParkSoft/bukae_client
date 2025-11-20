// Video Production API React Query Hooks

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studioApi } from '@/lib/api/studio'
import type {
  StudioJobRequest,
  StudioJobStatusUpdateRequest,
} from '@/lib/types/api/video'

export const useCreateStudioJob = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: StudioJobRequest) => studioApi.createStudioJob(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['studio-jobs', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['studio-jobs'] })
    },
  })
}

export const useStudioJob = (jobId: string | null, options?: { enabled?: boolean; refetchInterval?: number }) => {
  return useQuery({
    queryKey: ['studio-jobs', jobId],
    queryFn: () => {
      if (!jobId) throw new Error('Job ID is required')
      return studioApi.getStudioJob(jobId)
    },
    enabled: options?.enabled !== false && !!jobId,
    refetchInterval: options?.refetchInterval,
    staleTime: 0, // 항상 최신 데이터 조회
  })
}

export const useUpdateStudioJobStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: StudioJobStatusUpdateRequest }) =>
      studioApi.updateStudioJobStatus(jobId, data),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['studio-jobs', variables.jobId], data)
      queryClient.invalidateQueries({ queryKey: ['studio-jobs'] })
    },
  })
}

