import { z } from 'zod'

const PlanningFailureSchema = z
  .object({
    stage: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    retryable: z.boolean().optional(),
    suggestedAction: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    occurredAt: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
  })
  .passthrough()

const PlanningQuestionOptionSchema = z
  .object({
    optionId: z.string().optional(),
    option_id: z.string().optional(),
    label: z.string().optional(),
    value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })
  .passthrough()

export type PlanningQuestionOptionDto = z.infer<typeof PlanningQuestionOptionSchema>

const PlanningQuestionFieldSchema = z
  .object({
    fieldKey: z.string().optional(),
    field_key: z.string().optional(),
    label: z.string().optional(),
    inputType: z.string().optional(),
    input_type: z.string().optional(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
  })
  .passthrough()

export type PlanningQuestionFieldDto = z.infer<typeof PlanningQuestionFieldSchema>

const PlanningQuestionSchema = z
  .object({
    questionId: z.string().optional(),
    question_id: z.string().optional(),
    slotKey: z.string().optional(),
    slot_key: z.string().optional(),
    title: z.string().optional(),
    question: z.string().optional(),
    referenceInsight: z.string().optional(),
    reference_insight: z.string().optional(),
    responseType: z.string().optional(),
    response_type: z.string().optional(),
    required: z.boolean().optional(),
    allowCustom: z.boolean().optional(),
    allow_custom: z.boolean().optional(),
    customPlaceholder: z.string().optional(),
    custom_placeholder: z.string().optional(),
    options: z.array(PlanningQuestionOptionSchema).optional(),
    fields: z.array(PlanningQuestionFieldSchema).optional(),
    reasonWhyAsked: z.string().nullable().optional(),
    reason_why_asked: z.string().nullable().optional(),
  })
  .passthrough()

export type PlanningQuestionDto = z.infer<typeof PlanningQuestionSchema>

const PlanningMessageSchema = z
  .object({
    planningMessageId: z.string().optional(),
    planning_message_id: z.string().optional(),
    messageId: z.string().optional(),
    message_id: z.string().optional(),
    role: z.string().optional(),
    content: z.string().optional(),
    message: z.string().optional(),
    messageType: z.string().optional(),
    message_type: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).nullable().optional(),
    createdAt: z.string().optional(),
    created_at: z.string().optional(),
  })
  .passthrough()

export type PlanningMessageDto = z.infer<typeof PlanningMessageSchema>

const PlanningSurfaceSchema = z
  .object({
    ready_to_finalize: z.boolean().optional(),
    readyToFinalize: z.boolean().optional(),
    detail_gap_state: z.record(z.string(), z.unknown()).nullable().optional(),
    detailGapState: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough()

export const IntakeSubmissionResponseSchema = z
  .object({
    projectId: z.string().uuid(),
    intakeSubmissionId: z.string().uuid(),
    versionNo: z.number().optional(),
    category: z.string(),
    intakeStatus: z.string(),
    rawFormPayload: z.record(z.string(), z.unknown()).optional(),
    normalizedFormPayload: z.record(z.string(), z.unknown()).optional(),
    productFactSheet: z.record(z.string(), z.unknown()).optional(),
    projectStatus: z.string().nullable().optional(),
    currentStep: z.string().nullable().optional(),
    submittedAt: z.string().nullable().optional(),
  })
  .passthrough()

export type IntakeSubmissionResponseDto = z.infer<typeof IntakeSubmissionResponseSchema>

export const PlanningResponseSchema = z
  .object({
    planningSessionId: z.string().nullable().optional(),
    planningStatus: z.string().nullable().optional(),
    planningMode: z.string().nullable().optional(),
    clarifyingQuestions: z.array(PlanningQuestionSchema).optional(),
    canonicalSlotState: z.record(z.string(), z.unknown()).nullable().optional(),
    candidateAngles: z.array(z.record(z.string(), z.unknown())).optional(),
    messages: z.array(PlanningMessageSchema).optional(),
    planningSurface: PlanningSurfaceSchema.nullable().optional(),
    planningArtifacts: z.record(z.string(), z.unknown()).nullable().optional(),
    readyForApproval: z.boolean().optional(),
    failure: PlanningFailureSchema.nullable().optional(),
    projectStatus: z.string().nullable().optional(),
    currentStep: z.string().nullable().optional(),
  })
  .passthrough()

export type PlanningResponseDto = z.infer<typeof PlanningResponseSchema>

export interface IntakeSubmissionRequestDto {
  category: 'PRODUCT_PROMOTION'
  payload: {
    categoryCustom?: string
    faceExposurePlan: string
    faceExposureCustom?: string
    targetDurationSec: number
    shootPlanned: boolean
    shootEnvironment: string
    coreMaterial: string
  }
}

export interface PlanningMessageRequestDto {
  message: string
  messageType: 'slot_answer' | 'planning_workspace_entered' | 'free_text' | 'finalize_planning'
  payload: Record<string, unknown>
}
