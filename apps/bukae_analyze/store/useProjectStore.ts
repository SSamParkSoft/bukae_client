import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectStore {
  projectId: string | null
  projectStatus: string | null
  currentStep: string | null
  submissionStatus: string | null
  setProject: (data: { projectId: string; projectStatus: string; currentStep: string | null }) => void
  setSubmissionStatus: (status: string) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projectId: null,
      projectStatus: null,
      currentStep: null,
      submissionStatus: null,
      setProject: ({ projectId, projectStatus, currentStep }) =>
        set({ projectId, projectStatus, currentStep, submissionStatus: null }),
      setSubmissionStatus: (status) => set({ submissionStatus: status }),
      clearProject: () =>
        set({ projectId: null, projectStatus: null, currentStep: null, submissionStatus: null }),
    }),
    { name: 'bukae-project' }
  )
)
