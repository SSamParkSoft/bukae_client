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
  customPlaceholder: string | null
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

// --- Domain Command Types (mutation 입력) ---

export interface Pt1SlotAnswerCommand {
  questionId: string
  questionTitle: string
  slotKey: string
  answerType: 'single_select' | 'single_select_with_custom' | 'form'
  message: string
  selectedOptionId: string
  selectedOptionLabel: string
  selectedOptionValue: string
  customValue: string | null
  fieldValues: Record<string, string> | null
}

export interface Pt2FreeTextCommand {
  questionId: string
  questionTitle: string
  question: string
  referenceInsight: string | null
  reasonWhyAsked: string | null
  slotKey: string
  message: string
}

export interface WorkspaceEntryCommand {
  planningSessionId: string
  answeredQuestionIds: string[]
  answeredCount: number
}

export interface FinalizePlanningCommand {
  planningSessionId: string
}

export interface IntakeSubmissionCommand {
  category: 'PRODUCT_PROMOTION'
  payload: {
    categoryCustom: string
    faceExposurePlan: string
    faceExposureCustom: string
    targetDurationSec: number
    shootPlanned: boolean
    shootEnvironment: string
    coreMaterial: string
  }
}

// --- Domain Model Types ---

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
