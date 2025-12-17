import { NextResponse } from 'next/server'
import type { ConceptType } from '@/lib/data/templates'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit } from '@/lib/api/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export interface GenerateScriptRequest {
  scriptStyle: ConceptType
  tone: string
  images: string[]
  product: {
    name: string
    price: number
    description?: string
  } | null
}

export interface GenerateScriptResponse {
  scenes: Array<{
    sceneId: number
    script: string
  }>
}

// 더미 대본 생성 함수 (실제로는 GPT API 호출)
function generateDummyScenes(
  scriptStyle: ConceptType,
  tone: string,
  imageCount: number,
  productName: string
): Array<{ sceneId: number; script: string }> {
  const scenes: Array<{ sceneId: number; script: string }> = []

  // 스타일별 기본 대본 템플릿
  const templates: Record<ConceptType, string[]> = {
    viral: [
      '이거 진짜 미쳤다',
      `${productName} 완전 대박이에요!`,
      '지금 바로 구매하세요!',
      '후회 안 하실 거예요',
      '이거 하나면 끝!',
    ],
    'product-info': [
      `${productName}의 특징을 소개합니다`,
      '이 제품의 핵심 기능은',
      '사용자들이 가장 좋아하는 점은',
      '이런 분들께 추천드려요',
      '지금 바로 확인해보세요',
    ],
    review: [
      '어느 날, 평범한 하루였어요',
      '그런데 이 제품을 만나게 되었죠',
      '생각보다 훨씬 좋았어요',
      '이제는 없으면 안 되는 제품이 되었어요',
      '여러분도 한번 써보세요',
    ],
    'daily-review': [
      '어느 날, 평범한 하루였어요',
      '그런데 이 제품을 만나게 되었죠',
      '생각보다 훨씬 좋았어요',
      '이제는 없으면 안 되는 제품이 되었어요',
      '여러분도 한번 써보세요',
    ],
    promotional: [
      `지금 ${productName}을 구매하시면`,
      '특별 할인가로 만나보세요',
      '한정 수량이니 서두르세요',
      '지금 바로 주문하세요!',
      '만족도 97% 달성!',
    ],
    'calm-explanation': [
      `${productName}의 특징을 소개합니다`,
      '이 제품의 핵심 기능은',
      '사용자들이 가장 좋아하는 점은',
      '이런 분들께 추천드려요',
      '지금 바로 확인해보세요',
    ],
    emotional: [
      '하루 종일 피곤하셨나요?',
      '이제 편안한 휴식을 즐기세요',
      `${productName}과 함께하는 시간`,
      '여유롭고 평화로운 하루',
      '지금 바로 시작하세요',
    ],
  }

  // 기본 템플릿 선택 (스타일에 따라)
  const selectedTemplates = templates[scriptStyle] || templates.viral

  // 이미지 개수만큼 씬 생성
  for (let i = 0; i < imageCount; i++) {
    const templateIndex = i % selectedTemplates.length
    scenes.push({
      sceneId: i + 1,
      script: selectedTemplates[templateIndex].replace('{productName}', productName),
    })
  }

  return scenes
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rl = await enforceRateLimit(request, { endpoint: 'script:generate', userId: auth.userId })
    if (rl instanceof NextResponse) return rl

    const body: GenerateScriptRequest = await request.json()

    const { scriptStyle, tone, images, product } = body

    if (!scriptStyle || !tone || !images || images.length === 0) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // TODO: 실제 GPT API 호출로 대체
    // 현재는 더미 데이터 생성
    const scenes = generateDummyScenes(
      scriptStyle,
      tone,
      images.length,
      product?.name || '상품'
    )

    const response: GenerateScriptResponse = {
      scenes,
    }

    return NextResponse.json(response, { headers: { ...(rl.headers ?? {}) } })
  } catch (error) {
    console.error('대본 생성 오류:', error)
    return NextResponse.json(
      { error: '대본 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

