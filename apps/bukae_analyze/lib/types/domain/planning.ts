export interface IntakeSubmissionState {
  projectId: string
  intakeSubmissionId: string
  versionNo: number | null
  category: string
  intakeStatus: string
  projectStatus: string | null
  currentStep: string | null
  submittedAt: Date | null
}

export interface PlanningQuestionOption {
  optionId: string
  label: string
  value: string
}

export interface PlanningQuestionField {
  fieldKey: string
  label: string
  inputType: string
  required: boolean
  placeholder: string
}

export interface PlanningQuestion {
  questionId: string
  slotKey: string
  title: string
  question: string
  referenceInsight: string | null
  reasonWhyAsked: string | null
  responseType: string
  required: boolean
  allowCustom: boolean
  options: PlanningQuestionOption[]
  fields: PlanningQuestionField[]
}

export interface PlanningConversationMessage {
  messageId: string | null
  role: string | null
  message: string
  messageType: string | null
  payload: Record<string, unknown> | null
  createdAt: Date | null
}

export interface PlanningSurface {
  readyToFinalize: boolean
  detailGapState: Record<string, unknown> | null
}

export interface PlanningFailureState {
  stage: string | null
  category: string | null
  summary: string | null
  retryable: boolean
  suggestedAction: string | null
  source: string | null
  occurredAt: Date | null
  code: string | null
  message: string | null
}

export interface PlanningSession {
  planningSessionId: string | null
  planningStatus: string | null
  planningMode: string | null
  clarifyingQuestions: PlanningQuestion[]
  canonicalSlotState: Record<string, unknown> | null
  candidateAngles: Array<Record<string, unknown>>
  messages: PlanningConversationMessage[]
  planningSurface: PlanningSurface | null
  planningArtifacts: Record<string, unknown> | null
  readyForApproval: boolean
  failure: PlanningFailureState | null
  projectStatus: string | null
  currentStep: string | null
}
