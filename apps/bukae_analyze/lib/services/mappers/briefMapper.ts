import type { BriefResponseDto } from '@/lib/types/api/brief'
import type { Brief } from '@/lib/types/domain'

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function mapBrief(dto: BriefResponseDto): Brief {
  return {
    projectId: dto.projectId ?? null,
    briefVersionId: dto.briefVersionId,
    versionNo: dto.versionNo ?? null,
    status: dto.status,
    sourceType: dto.sourceType ?? null,
    title: dto.title ?? null,
    projectBrief: dto.projectBrief ?? null,
    adaptationRules: dto.adaptationRules ?? null,
    riskReport: dto.riskReport ?? null,
    planningSummary: dto.planningSummary ?? null,
    approvedBy: dto.approvedBy ?? null,
    approvedAt: parseOptionalDate(dto.approvedAt),
    projectStatus: dto.projectStatus ?? null,
    currentStep: dto.currentStep ?? null,
    createdAt: parseOptionalDate(dto.createdAt),
    updatedAt: parseOptionalDate(dto.updatedAt),
  }
}
