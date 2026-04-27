import type {
  IntakeSubmissionResponseDto,
  PlanningMessageDto,
  PlanningQuestionDto,
  PlanningQuestionFieldDto,
  PlanningQuestionOptionDto,
  PlanningResponseDto,
} from '@/lib/types/api/planning'
import type {
  IntakeSubmissionState,
  PlanningConversationMessage,
  PlanningFailureState,
  PlanningQuestion,
  PlanningQuestionField,
  PlanningQuestionOption,
  PlanningSession,
  PlanningSurface,
} from '@/lib/types/domain'

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function mapPlanningQuestionOption(
  option: PlanningQuestionOptionDto
): PlanningQuestionOption | null {
  const optionId = asTrimmedString(option.optionId ?? option.option_id)
  const label = asTrimmedString(option.label)
  const value = asStringValue(option.value)

  if (!optionId || !label) return null

  return {
    optionId,
    label,
    value,
  }
}

function mapPlanningQuestionField(
  field: PlanningQuestionFieldDto
): PlanningQuestionField | null {
  const fieldKey = asTrimmedString(field.fieldKey ?? field.field_key)
  const label = asTrimmedString(field.label)
  const inputType = asTrimmedString(field.inputType ?? field.input_type)

  if (!fieldKey || !label || !inputType) return null

  return {
    fieldKey,
    label,
    inputType,
    required: Boolean(field.required),
    placeholder: asTrimmedString(field.placeholder),
  }
}

function mapPlanningQuestion(
  question: PlanningQuestionDto
): PlanningQuestion | null {
  const questionId = asTrimmedString(question.questionId ?? question.question_id)
  const slotKey = asTrimmedString(question.slotKey ?? question.slot_key) || questionId
  const title = asTrimmedString(question.title)
  const prompt = asTrimmedString(question.question)
  const responseType = asTrimmedString(question.responseType ?? question.response_type)

  if (!questionId || !slotKey || !title || !prompt || !responseType) {
    return null
  }

  return {
    questionId,
    slotKey,
    title,
    question: prompt,
    referenceInsight: asTrimmedString(
      question.referenceInsight ?? question.reference_insight
    ) || null,
    reasonWhyAsked: asTrimmedString(
      question.reasonWhyAsked ?? question.reason_why_asked
    ) || null,
    responseType,
    required: Boolean(question.required),
    allowCustom: Boolean(question.allowCustom ?? question.allow_custom),
    options: (question.options ?? [])
      .map(mapPlanningQuestionOption)
      .filter((option): option is PlanningQuestionOption => option !== null),
    fields: (question.fields ?? [])
      .map(mapPlanningQuestionField)
      .filter((field): field is PlanningQuestionField => field !== null),
  }
}

function mapPlanningMessage(
  message: PlanningMessageDto
): PlanningConversationMessage {
  return {
    messageId: asTrimmedString(
      message.planningMessageId ??
      message.planning_message_id ??
      message.messageId ??
      message.message_id
    ) || null,
    role: asTrimmedString(message.role) || null,
    message: asTrimmedString(message.content ?? message.message),
    messageType: asTrimmedString(message.messageType ?? message.message_type) || null,
    payload: message.payload ?? null,
    createdAt: parseOptionalDate(message.createdAt ?? message.created_at),
  }
}

function mapPlanningSurface(
  surface: PlanningResponseDto['planningSurface']
): PlanningSurface | null {
  if (!surface) return null

  return {
    readyToFinalize: Boolean(surface.readyToFinalize ?? surface.ready_to_finalize),
    detailGapState: surface.detailGapState ?? surface.detail_gap_state ?? null,
  }
}

function mapPlanningFailure(
  failure: PlanningResponseDto['failure']
): PlanningFailureState | null {
  if (!failure) return null

  return {
    stage: asTrimmedString(failure.stage) || null,
    category: asTrimmedString(failure.category) || null,
    summary: asTrimmedString(failure.summary) || null,
    retryable: Boolean(failure.retryable),
    suggestedAction: asTrimmedString(failure.suggestedAction) || null,
    source: asTrimmedString(failure.source) || null,
    occurredAt: parseOptionalDate(failure.occurredAt),
    code: asTrimmedString(failure.code) || null,
    message: asTrimmedString(failure.message) || null,
  }
}

export function mapIntakeSubmissionState(
  dto: IntakeSubmissionResponseDto
): IntakeSubmissionState {
  return {
    projectId: dto.projectId,
    intakeSubmissionId: dto.intakeSubmissionId,
    versionNo: dto.versionNo ?? null,
    category: dto.category,
    intakeStatus: dto.intakeStatus,
    projectStatus: dto.projectStatus ?? null,
    currentStep: dto.currentStep ?? null,
    submittedAt: parseOptionalDate(dto.submittedAt),
  }
}

export function mapPlanningSession(dto: PlanningResponseDto): PlanningSession {
  return {
    planningSessionId: dto.planningSessionId ?? null,
    planningStatus: dto.planningStatus ?? null,
    planningMode: dto.planningMode ?? null,
    clarifyingQuestions: (dto.clarifyingQuestions ?? [])
      .map(mapPlanningQuestion)
      .filter((question): question is PlanningQuestion => question !== null),
    canonicalSlotState: dto.canonicalSlotState ?? null,
    candidateAngles: dto.candidateAngles ?? [],
    messages: (dto.messages ?? []).map(mapPlanningMessage),
    planningSurface: mapPlanningSurface(dto.planningSurface),
    planningArtifacts: dto.planningArtifacts ?? null,
    readyForApproval: Boolean(dto.readyForApproval),
    failure: mapPlanningFailure(dto.failure),
    projectStatus: dto.projectStatus ?? null,
    currentStep: dto.currentStep ?? null,
  }
}
