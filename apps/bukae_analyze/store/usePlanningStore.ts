import { create } from 'zustand'
import type { PlanningSetupAnswers } from '@/lib/types/domain'

interface PlanningStore {
  answers: PlanningSetupAnswers
  setAnswers: (answers: PlanningSetupAnswers) => void
}

const INITIAL_ANSWERS: PlanningSetupAnswers = {
  category: null,
  categoryCustom: '',
  faceExposure: null,
  faceExposureCustom: '',
  videoLength: null,
  videoLengthCustom: '',
  shooting: null,
  shootingEnvironment: '',
  coreMaterial: '',
}

export const usePlanningStore = create<PlanningStore>()((set) => ({
  answers: INITIAL_ANSWERS,
  setAnswers: (answers) => set({ answers }),
}))
