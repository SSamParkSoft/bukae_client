import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VideoAnalysis, VideoAnalysisResult } from '@/lib/types/domain'

interface ProjectStore {
  // 퍼시스트 필드
  projectId: string | null
  projectStatus: string | null
  currentStep: string | null
  submissionStatus: string | null
  // 인메모리 전용 (퍼시스트 제외)
  videoAnalysis: VideoAnalysis | null
  videoSrc: string | null
  referenceUrl: string | null

  setProject: (data: { projectId: string; projectStatus: string; currentStep: string | null }) => void
  setProjectProgress: (data: { projectStatus: string; currentStep: string | null }) => void
  setSubmissionStatus: (status: string) => void
  setAnalysisResult: (data: VideoAnalysisResult) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projectId: null,
      projectStatus: null,
      currentStep: null,
      submissionStatus: null,
      videoAnalysis: null,
      videoSrc: null,
      referenceUrl: null,

      setProject: ({ projectId, projectStatus, currentStep }) =>
        set({
          projectId,
          projectStatus,
          currentStep,
          submissionStatus: null,
          videoAnalysis: null,
          videoSrc: null,
          referenceUrl: null,
        }),

      setProjectProgress: ({ projectStatus, currentStep }) =>
        set({ projectStatus, currentStep }),

      setSubmissionStatus: (status) => set({ submissionStatus: status }),

      setAnalysisResult: ({ videoAnalysis, videoSrc, referenceUrl }) =>
        set({ videoAnalysis, videoSrc, referenceUrl }),

      clearProject: () =>
        set({
          projectId: null,
          projectStatus: null,
          currentStep: null,
          submissionStatus: null,
          videoAnalysis: null,
          videoSrc: null,
          referenceUrl: null,
        }),
    }),
    {
      name: 'bukae-project',
      // 분석 결과는 매핑된 최소 도메인 모델만 저장하므로 새로고침 시 즉시 복구한다.
      partialize: (state) => ({
        projectId: state.projectId,
        projectStatus: state.projectStatus,
        currentStep: state.currentStep,
        submissionStatus: state.submissionStatus,
        videoAnalysis: state.videoAnalysis,
        videoSrc: state.videoSrc,
        referenceUrl: state.referenceUrl,
      }),
    }
  )
)
