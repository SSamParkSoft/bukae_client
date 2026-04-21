import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProjectStore {
  projectId: string | null
  projectStatus: string | null
  currentStep: string | null
  setProject: (data: { projectId: string; projectStatus: string; currentStep: string | null }) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projectId: null,
      projectStatus: null,
      currentStep: null,
      setProject: ({ projectId, projectStatus, currentStep }) =>
        set({ projectId, projectStatus, currentStep }),
      clearProject: () => set({ projectId: null, projectStatus: null, currentStep: null }),
    }),
    { name: 'bukae-project' }
  )
)
