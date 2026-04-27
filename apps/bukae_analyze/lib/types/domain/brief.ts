export interface Brief {
  projectId: string | null
  briefVersionId: string
  versionNo: number | null
  status: string
  sourceType: string | null
  title: string | null
  projectBrief: Record<string, unknown> | null
  adaptationRules: Record<string, unknown> | null
  riskReport: Record<string, unknown> | null
  planningSummary: string | null
  approvedBy: string | null
  approvedAt: Date | null
  projectStatus: string | null
  currentStep: string | null
  createdAt: Date | null
  updatedAt: Date | null
}
