import { create } from 'zustand'

interface PlanningStore {
  isSubmitting: boolean
  submitError: string | null
  setSubmitting: (isSubmitting: boolean) => void
  setSubmitError: (message: string | null) => void
}

export const usePlanningStore = create<PlanningStore>()((set) => ({
  isSubmitting: false,
  submitError: null,
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setSubmitError: (submitError) => set({ submitError }),
}))
