'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileWarning } from 'lucide-react'
import { PageErrorState } from '@/components/errors/PageErrorState'
import { AnalysisLoadingOverlay } from '@/components/loading/AnalysisLoadingOverlay'
import { mapShootingGuideToViewModel } from '@/features/shootingGuide/lib/mapShootingGuideToViewModel'
import { useGenerationPolling } from '@/features/shootingGuide/hooks/state/useGenerationPolling'
import { getGenerationStatusMessage, isGenerationCompleted } from '@/features/shootingGuide/lib/generationState'
import { SceneCard } from './SceneCard'
import type { Generation } from '@/lib/types/domain'
import { startGenerationFromCommand } from '@/lib/services/generations'
import { useAnalyzeWorkflowStore } from '@/store/useAnalyzeWorkflowStore'
import { buildAnalyzeWorkflowStepPath } from '@/features/analyzeWorkflow/lib/analyzeWorkflowSteps'
import { markWorkflowStepCompleted } from '@/lib/storage/workflowStepCompletionStorage'
import { createAppError, resolveAppError, type ResolvedAppError } from '@/lib/errors/appError'

function getShootingGuideErrorActions(
  error: ResolvedAppError,
  retry: () => void
) {
  switch (error.kind) {
    case 'auth_expired':
      return [{ label: '다시 로그인', href: '/login' }]
    case 'forbidden':
      return [{ label: '처음으로', href: '/' }]
    case 'invalid_project_state':
      return [{ label: '새 프로젝트 시작', href: '/' }]
    case 'server_error':
    case 'network_error':
      return [
        { label: '다시 시도', onClick: retry },
        { label: '처음으로', href: '/', variant: 'secondary' as const },
      ]
    case 'missing_result':
    case 'unknown':
    default:
      return [
        { label: '다시 시도', onClick: retry },
        { label: '새 프로젝트 시작', href: '/', variant: 'secondary' as const },
      ]
  }
}

export function ShootingGuidePageClient({
  projectId,
  briefVersionId,
  generationRequestId,
  initialGeneration,
  initialError,
}: {
  projectId: string | null
  briefVersionId: string | null
  generationRequestId: string | null
  initialGeneration: Generation | null
  initialError: ResolvedAppError | null
}) {
  const router = useRouter()
  const getCachedGenerationRequestId = useAnalyzeWorkflowStore((state) => state.getCachedGenerationRequestId)
  const cacheGenerationRequestId = useAnalyzeWorkflowStore((state) => state.cacheGenerationRequestId)
  const [startedGenerationRequestId, setStartedGenerationRequestId] = useState<string | null>(null)
  const [generationStartError, setGenerationStartError] = useState<{
    key: string
    error: ResolvedAppError
  } | null>(null)
  const startingGenerationKeyRef = useRef<string | null>(null)
  const isMountedRef = useRef(false)
  const generationStartKeyRef = useRef<string | null>(null)
  const activeGenerationRequestId = generationRequestId ?? startedGenerationRequestId
  const activeGenerationStartKey = projectId && briefVersionId
    ? `${projectId}:${briefVersionId}`
    : null

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const generationStartKey = projectId && briefVersionId && !activeGenerationRequestId
      ? `${projectId}:${briefVersionId}`
      : null
    generationStartKeyRef.current = generationStartKey
    if (!projectId || !briefVersionId || !generationStartKey) return

    const cachedGenerationRequestId = getCachedGenerationRequestId(briefVersionId)
    if (cachedGenerationRequestId) {
      markWorkflowStepCompleted(projectId, 'generation')
      router.replace(buildAnalyzeWorkflowStepPath('/shooting-guide', {
        projectId,
        generationRequestId: cachedGenerationRequestId,
      }))
      return
    }

    if (startingGenerationKeyRef.current === generationStartKey) return
    startingGenerationKeyRef.current = generationStartKey

    void startGenerationFromCommand(projectId, {
      briefVersionId,
      generationMode: 'single',
      variantCount: 1,
    })
      .then((generation) => {
        if (!isMountedRef.current || generationStartKeyRef.current !== generationStartKey) return

        cacheGenerationRequestId(briefVersionId, generation.generationRequestId)
        markWorkflowStepCompleted(projectId, 'generation')
        setStartedGenerationRequestId(generation.generationRequestId)
        router.replace(buildAnalyzeWorkflowStepPath('/shooting-guide', {
          projectId,
          generationRequestId: generation.generationRequestId,
        }))
      })
      .catch((error) => {
        if (!isMountedRef.current || generationStartKeyRef.current !== generationStartKey) return
        setGenerationStartError({
          key: generationStartKey,
          error: resolveAppError(error, 'generation_start'),
        })
      })
      .finally(() => {
        if (startingGenerationKeyRef.current === generationStartKey) {
          startingGenerationKeyRef.current = null
        }
      })
  }, [
    activeGenerationRequestId,
    briefVersionId,
    cacheGenerationRequestId,
    getCachedGenerationRequestId,
    projectId,
    router,
  ])

  const { generation, error, generationFailureMessage } = useGenerationPolling(
    projectId,
    activeGenerationRequestId,
    initialGeneration,
    initialError
  )

  const shootingGuide = useMemo(() => (
    generation && isGenerationCompleted(generation)
      ? generation.shootingGuide
      : null
  ), [generation])
  const viewModel = useMemo(() => (
    shootingGuide ? mapShootingGuideToViewModel(shootingGuide) : null
  ), [shootingGuide])
  const activeGenerationStartError = generationStartError?.key === activeGenerationStartKey
    ? generationStartError.error
    : null
  const pageError = !projectId || (!activeGenerationRequestId && !briefVersionId)
    ? createAppError('invalid_project_state', 'generation_bootstrap')
    : activeGenerationStartError ?? error

  if (pageError) {
    return (
      <PageErrorState
        title={pageError.title}
        description={pageError.message}
        icon={FileWarning}
        className="min-h-[520px]"
        actions={getShootingGuideErrorActions(pageError, () => router.refresh())}
      />
    )
  }

  return (
    <div className="relative min-h-[640px]">
      {generationFailureMessage ? (
        <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-6 text-red-100">
          <p className="font-medium">촬영가이드 생성 중 문제가 발생했습니다.</p>
          <p className="mt-2 text-sm text-red-100/80">{generationFailureMessage}</p>
        </div>
      ) : null}

      {viewModel ? (
        <>
          {viewModel.scenes.map((scene) => (
            <SceneCard key={scene.sceneLabel} scene={scene} />
          ))}
        </>
      ) : null}

      <AnalysisLoadingOverlay
        visible={!shootingGuide || !viewModel}
        label={getGenerationStatusMessage(generation)}
      />
    </div>
  )
}
