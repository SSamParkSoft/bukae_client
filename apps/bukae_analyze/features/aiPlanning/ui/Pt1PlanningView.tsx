import type { PlanningQuestion } from '@/lib/types/domain'
import { PlanningQuestionCard } from './PlanningQuestionCard'

interface Pt1PlanningViewProps {
  questions: PlanningQuestion[]
  selectedAnswers: Record<string, string>
  customAnswers: Record<string, string>
  fieldAnswers: Record<string, Record<string, string>>
  onSelectAnswer: (questionId: string, value: string) => void
  onChangeCustomAnswer: (questionId: string, value: string) => void
  onChangeFieldAnswer: (questionId: string, fieldKey: string, value: string) => void
}

export function Pt1PlanningView({
  questions,
  selectedAnswers,
  customAnswers,
  fieldAnswers,
  onSelectAnswer,
  onChangeCustomAnswer,
  onChangeFieldAnswer,
}: Pt1PlanningViewProps) {
  return (
    <div className="pb-32">
      <div className="grid grid-cols-2 gap-y-10">
        {questions.map((question, index) => (
          <div key={question.questionId} className="px-6 min-w-0">
            <PlanningQuestionCard
              question={question}
              index={index}
              selectedValue={selectedAnswers[question.questionId] ?? null}
              customValue={customAnswers[question.questionId] ?? ''}
              fieldValues={fieldAnswers[question.questionId] ?? {}}
              onSelect={(value) => onSelectAnswer(question.questionId, value)}
              onCustomChange={(value) => onChangeCustomAnswer(question.questionId, value)}
              onFieldChange={(fieldKey, value) => onChangeFieldAnswer(question.questionId, fieldKey, value)}
              onCustomBlur={() => undefined}
              onFieldBlur={() => undefined}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
