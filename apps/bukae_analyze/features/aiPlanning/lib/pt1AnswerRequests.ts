import type { PlanningQuestion, PlanningSession, Pt1SlotAnswerCommand } from '@/lib/types/domain'
import { buildPt1SlotAnswerCommand } from './planningAnswers'

export interface Pt1AnswerRequest {
  questionId: string
  command: Pt1SlotAnswerCommand
  signature: string
}

export interface Pt1AnswerDrafts {
  selectedAnswers: Record<string, string>
  customAnswers: Record<string, string>
  fieldAnswers: Record<string, Record<string, string>>
}

export function buildPt1AnswerRequests(
  questions: PlanningQuestion[],
  drafts: Pt1AnswerDrafts
): Pt1AnswerRequest[] {
  if (questions.length === 0) return []

  const requests = questions.map((question) => {
    const command = buildPt1SlotAnswerCommand(question, {
      selectedValue: drafts.selectedAnswers[question.questionId] ?? null,
      customValue: drafts.customAnswers[question.questionId] ?? '',
      fieldValues: drafts.fieldAnswers[question.questionId] ?? {},
    })
    if (!command) return null

    return {
      questionId: question.questionId,
      command,
      signature: JSON.stringify(command),
    }
  })

  if (requests.some((request) => request === null)) {
    return []
  }

  return requests as Pt1AnswerRequest[]
}

export function hasSavedAllPt1Answers(
  requests: Pt1AnswerRequest[],
  submittedSignatureByQuestionId: Record<string, string>
): boolean {
  return requests.length > 0 && requests.every(({ questionId, signature }) => (
    submittedSignatureByQuestionId[questionId] === signature
  ))
}

export function getUnsavedPt1AnswerRequests(
  requests: Pt1AnswerRequest[],
  submittedSignatureByQuestionId: Record<string, string>
): Pt1AnswerRequest[] {
  return requests.filter(({ questionId, signature }) => (
    submittedSignatureByQuestionId[questionId] !== signature
  ))
}

export async function submitPt1AnswerRequests(params: {
  projectId: string
  requests: Pt1AnswerRequest[]
  submitAnswer: (
    projectId: string,
    command: Pt1SlotAnswerCommand
  ) => Promise<PlanningSession>
  isCancelled: () => boolean
  onQuestionSaving: (questionId: string) => void
  onQuestionSaved: (questionId: string, signature: string) => void
  onQuestionError: (questionId: string, error: unknown) => void
}): Promise<PlanningSession | null> {
  const {
    projectId,
    requests,
    submitAnswer,
    isCancelled,
    onQuestionSaving,
    onQuestionSaved,
    onQuestionError,
  } = params
  let latestSession: PlanningSession | null = null

  for (const { questionId, command, signature } of requests) {
    if (isCancelled()) return latestSession

    try {
      onQuestionSaving(questionId)
      latestSession = await submitAnswer(projectId, command)
      onQuestionSaved(questionId, signature)
    } catch (error) {
      onQuestionError(questionId, error)
      return latestSession
    }
  }

  return latestSession
}
