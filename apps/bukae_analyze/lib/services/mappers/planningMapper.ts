import type {
  IntakeSubmissionRequestDto,
  IntakeSubmissionResponseDto,
  PlanningMessageRequestDto,
  PlanningMessageDto,
  PlanningQuestionDto,
  PlanningQuestionFieldDto,
  PlanningQuestionOptionDto,
  PlanningResponseDto,
} from '@/lib/types/api/planning'
import type {
  FinalizePlanningCommand,
  IntakeSubmissionCommand,
  IntakeSubmissionState,
  Pt1SlotAnswerCommand,
  Pt2FreeTextCommand,
  PlanningConversationMessage,
  PlanningFailureState,
  PlanningQuestion,
  PlanningQuestionField,
  PlanningQuestionOption,
  PlanningSession,
  PlanningSurface,
  WorkspaceEntryCommand,
} from '@/lib/types/domain'
import { createProjectWorkflow } from '@/lib/types/domain'

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
  const hasOptions = (question.options?.length ?? 0) > 0
  const hasFields = (question.fields?.length ?? 0) > 0
  const allowCustom = Boolean(question.allowCustom ?? question.allow_custom)
  const responseType = asTrimmedString(question.responseType ?? question.response_type)
    || (hasFields ? 'form' : hasOptions ? (allowCustom ? 'single_select_with_custom' : 'single_select') : '')

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
    customPlaceholder: asTrimmedString(
      question.customPlaceholder ?? question.custom_placeholder
    ) || null,
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
  const projectStatus = dto.projectStatus ?? null
  const currentStep = dto.currentStep ?? null

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
    projectStatus,
    currentStep,
    projectWorkflow: createProjectWorkflow({
      status: projectStatus,
      currentStep,
    }),
  }
}

// --- Command → DTO 변환 ---

export function mapPt1SlotAnswerToDto(command: Pt1SlotAnswerCommand): PlanningMessageRequestDto {
  return {
    message: command.message,
    messageType: 'slot_answer',
    payload: {
      question_id: command.questionId,
      question_title: command.questionTitle,
      slot_key: command.slotKey,
      selected_option_id: command.selectedOptionId,
      selected_option_label: command.selectedOptionLabel,
      selected_option_value: command.selectedOptionValue,
      custom_value: command.customValue,
      answer_type: command.answerType,
      field_values: command.fieldValues,
      answer_source: 'planning_pt1',
    },
  }
}

export function mapPt2FreeTextToDto(command: Pt2FreeTextCommand): PlanningMessageRequestDto {
  return {
    message: command.message,
    messageType: 'free_text',
    payload: {
      event_type: 'pt2_answer',
      answer_source: 'planning_pt2',
      question_id: command.questionId,
      question_title: command.questionTitle,
      question_text: command.question,
      reference_insight: command.referenceInsight,
      reason_why_asked: command.reasonWhyAsked,
      slot_key: command.slotKey,
      raw_answer: command.message,
    },
  }
}

export function mapWorkspaceEntryToDto(command: WorkspaceEntryCommand): PlanningMessageRequestDto {
  return {
    message: [
      'AI 기획 pt.1 질문 답변을 마치고 pt.2 대화 단계로 진입합니다.',
      `answered_count=${command.answeredCount}`,
      '이전 slot_answer payload들을 기준으로 다음 대화와 최종 기획안 생성을 이어가 주세요.',
    ].join('\n'),
    messageType: 'planning_workspace_entered',
    payload: {
      event_type: 'planning_workspace_entered',
      planning_session_id: command.planningSessionId,
      answer_source: 'planning_pt1',
      answered_question_ids: command.answeredQuestionIds,
      answered_count: command.answeredCount,
      selected_angle_id: null,
    },
  }
}

export function mapFinalizePlanningToDto(command: FinalizePlanningCommand): PlanningMessageRequestDto {
  return {
    message: '수집된 PT1/PT2 정보를 바탕으로 최종 기획안 생성을 시작합니다.',
    messageType: 'finalize_planning',
    payload: {
      event_type: 'finalize_planning',
      planning_session_id: command.planningSessionId,
    },
  }
}

export function mapIntakeSubmissionToDto(command: IntakeSubmissionCommand): IntakeSubmissionRequestDto {
  return command
}
