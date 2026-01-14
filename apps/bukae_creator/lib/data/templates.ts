// 컨셉 타입
export type ConceptType = 
  | 'UNEXPECTED_TIP'
  | 'MUST_BUY_ITEM'
  | 'WHERE_DID_YOU_BUY'
  | 'CELEBRITY_ITEM'
  | 'MY_STORY_REVIEW'
  | 'HEY_EVERYONE_LOOK'
  | 'TREND_REPORT'
  | 'FOUND_IT'
  | 'FINALLY_FOUND'
  | 'MONOLOGUE_REVIEW'
  | 'UNBELIEVABLE_PRICE'
  | 'LOSS_AVERSION'
  | 'COUPANG_RANK_1'
  | 'END_GAME_ITEM'
  | 'BRAND_SINCERITY'
  | 'REGRET_LATE_BUY'
  | 'QUALITY_OF_LIFE'
  | 'MUST_TRY_COUPANG'
  | 'COST_EFFECTIVE_GIFT'

// 컨셉별 말투 옵션 (deprecated - step2에서 더 이상 사용하지 않음, 다른 컴포넌트 호환성을 위해 빈 객체 유지)
export const conceptTones: Record<ConceptType, Array<{ id: string; label: string; tier: 'LIGHT' | 'PRO' }>> = {} as Record<ConceptType, Array<{ id: string; label: string; tier: 'LIGHT' | 'PRO' }>>

// 톤 예시 텍스트 (deprecated - step2에서 더 이상 사용하지 않음, 다른 컴포넌트 호환성을 위해 빈 객체 유지)
export const toneExamples: Record<string, string> = {}

// 컨셉 옵션
export const conceptOptions: Array<{
  id: ConceptType
  label: string // 한글명
  description: string // 특징 및 타겟 설명
  target: string // 타겟 고객층
}> = [
  {
    id: 'UNEXPECTED_TIP',
    label: '의외로 잘 모르는 꿀템',
    description: '[정보전달형] 나만 몰랐나? 하는 심리를 자극하여 시청 지속 시간을 확보합니다.',
    target: '생활 꿀팁에 관심 많은 주부 / 자취생'
  },
  {
    id: 'MUST_BUY_ITEM',
    label: '보이면 사야하는 꿀템',
    description: '[정보전달형] 발견 즉시 구매해야 한다는 강한 확신과 희소성을 심어줍니다.',
    target: '다이소 / 마트 쇼핑을 즐기는 알뜰족'
  },
  {
    id: 'WHERE_DID_YOU_BUY',
    label: '어디서 샀어?',
    description: '[리뷰형] 지인이 물어보는 것처럼 자연스럽게 제품의 매력을 간접 증명합니다.',
    target: '인테리어 / 데스크테리어 소품에 관심 있는 2030'
  },
  {
    id: 'CELEBRITY_ITEM',
    label: '연예인이 사용한 제품',
    description: '[연예인템] 유명인의 권위를 빌려 제품의 신뢰도와 \'손민수\' 욕구를 자극합니다.',
    target: '트렌드와 셀럽 라이프스타일을 동경하는 팔로워'
  },
  {
    id: 'MY_STORY_REVIEW',
    label: '저 이것 때문에 ~됐어요',
    description: '[썰푸는형] 문제 발생 → 해결의 서사 구조로 몰입감을 극대화합니다.',
    target: '드라마틱한 이야기와 반전에 흥미를 느끼는 시청자'
  },
  {
    id: 'HEY_EVERYONE_LOOK',
    label: '아니 여러분',
    description: '[소개리뷰형] 흥분한 어조의 \'찐텐\'으로 시청자의 주목을 끄는 바이럴 유형입니다.',
    target: '맛집 / 신상 리뷰를 즐겨보는 SNS 헤비 유저'
  },
  {
    id: 'TREND_REPORT',
    label: '요즘 유행이라는',
    description: '[정보전달형] 뉴스 / 리포트 형식으로 최신 트렌드를 객관적으로 소개합니다.',
    target: '유행에 민감한 얼리어답터'
  },
  {
    id: 'FOUND_IT',
    label: '여러분 찾았어요!',
    description: '[현실리뷰형] 오랫동안 찾아 헤매던 해결책을 \'드디어\' 발견했다는 기쁨을 공유합니다.',
    target: '특정 생활 불편을 겪고 있는 타겟층'
  },
  {
    id: 'FINALLY_FOUND',
    label: '여러분 저 드디어 찾았어요',
    description: '[감격형] 고질적인 문제를 해결해주는 구세주 아이템을 감정적으로 호소합니다.',
    target: '기존 제품들의 단점에 지친 유목민 소비자'
  },
  {
    id: 'MONOLOGUE_REVIEW',
    label: '여러분 저 됐어요',
    description: '[혼잣말형] 독백과 방백을 오가는 화법으로 시청자와 친구처럼 소통합니다.',
    target: '격식 없는 브이로그 감성을 선호하는 1020'
  },
  {
    id: 'UNBELIEVABLE_PRICE',
    label: '믿으시겠나요?',
    description: '[권유형] 믿기 힘든 성능이나 가격을 제시하여 의심을 확신으로 바꿉니다.',
    target: '가성비 / 고성능을 찾는 합리적 소비자'
  },
  {
    id: 'LOSS_AVERSION',
    label: '이제는 ~~하면 손해',
    description: '[손해강조형] 기존 방식을 고수하면 손해라는 심리(Loss Aversion)를 자극합니다.',
    target: '손해 보는 것을 싫어하는 스마트 컨슈머'
  },
  {
    id: 'COUPANG_RANK_1',
    label: '이게 쿠팡 1등이라고?',
    description: '[상품소개형] 플랫폼 랭킹 1위 제품의 인기 비결을 검증하며 신뢰를 줍니다.',
    target: '대세를 따르고 싶은 신중한 구매자'
  },
  {
    id: 'END_GAME_ITEM',
    label: '결국 나와버렸다는 끝판왕',
    description: '[제품소개형] 기존 제품의 단점을 모두 상쇄하는 \'종결자\' 등장을 알립니다.',
    target: '혁신적인 솔루션을 기다리던 대기 수요층'
  },
  {
    id: 'BRAND_SINCERITY',
    label: '~~은 여기에 진심이라는데?',
    description: '[브랜드강조형] 제품에 담긴 브랜드의 철학이나 장인정신을 스토리로 풉니다.',
    target: '디테일을 중요시하는 팬슈머'
  },
  {
    id: 'REGRET_LATE_BUY',
    label: '늦게 살 수록 후회하는 제품',
    description: '[후회형] \'일찍 샀으면 좋았을걸\' 하는 후회를 공유하여 구매를 앞당깁니다.',
    target: '고민만 하는 결정 장애 소비자'
  },
  {
    id: 'QUALITY_OF_LIFE',
    label: '삶의 질 떡상하는 아이템',
    description: '[삶의질형] 제품 사용 전후의 명확한 변화와 행복을 약속합니다.',
    target: '일상의 소확행을 추구하는 소비자'
  },
  {
    id: 'MUST_TRY_COUPANG',
    label: '지금 당장 쿠팡에 들어가서',
    description: '[쿠팡추천형] 구체적인 행동 지침(Call To Action)으로 즉각적인 전환을 유도합니다.',
    target: '빠르고 편리한 로켓배송 선호 고객'
  },
  {
    id: 'COST_EFFECTIVE_GIFT',
    label: 'N만원 대 가성비 선물',
    description: '[가성비선물] 가격대별 최적의 선물을 큐레이션하여 고민을 해결해줍니다.',
    target: '센스 있는 가성비 선물을 찾는 2030'
  },
]

// 썸네일 템플릿
export interface ThumbnailTemplate {
  id: string
  name: string
  preview: string
  tier: 'LIGHT' | 'PRO'
}

export const thumbnailTemplates: ThumbnailTemplate[] = [
  { id: 'thumb-1', name: '템플릿 1', preview: '/thumbnails/template1.jpg', tier: 'LIGHT' },
  { id: 'thumb-2', name: '템플릿 2', preview: '/thumbnails/template2.jpg', tier: 'LIGHT' },
  { id: 'thumb-3', name: '템플릿 3', preview: '/thumbnails/template3.jpg', tier: 'PRO' },
  { id: 'thumb-4', name: '템플릿 4', preview: '/thumbnails/template4.jpg', tier: 'PRO' },
  { id: 'thumb-5', name: '템플릿 5', preview: '/thumbnails/template5.jpg', tier: 'PRO' },
]

// 목소리 템플릿
export interface VoiceTemplate {
  id: string
  name: string
  description: string
  preview: string
  tier: 'LIGHT' | 'PRO'
}

export const voiceTemplates: VoiceTemplate[] = [
  { id: 'voice-1', name: '친근한 여성 목소리', description: '따뜻하고 친근한 톤', preview: '/voices/voice1.mp3', tier: 'LIGHT' },
  { id: 'voice-2', name: '신뢰감 있는 남성 목소리', description: '전문적이고 신뢰감 있는 톤', preview: '/voices/voice2.mp3', tier: 'LIGHT' },
  { id: 'voice-3', name: '발랄한 여성 목소리', description: '밝고 경쾌한 톤', preview: '/voices/voice3.mp3', tier: 'PRO' },
  { id: 'voice-4', name: '차분한 남성 목소리', description: '안정적이고 차분한 톤', preview: '/voices/voice4.mp3', tier: 'PRO' },
  { id: 'voice-5', name: '에너지 넘치는 목소리', description: '역동적이고 활기찬 톤', preview: '/voices/voice5.mp3', tier: 'PRO' },
]

// 자막 위치 옵션
export type SubtitlePosition = 'top' | 'center' | 'bottom'

export const subtitlePositions: Array<{ id: SubtitlePosition; label: string }> = [
  { id: 'top', label: '상단' },
  { id: 'center', label: '중앙' },
  { id: 'bottom', label: '하단' },
]

// 폰트 템플릿
export interface FontTemplate {
  id: string
  name: string
  fontFamily: string
  tier: 'LIGHT' | 'PRO'
}

export const fontTemplates: FontTemplate[] = [
  { id: 'font-1', name: '기본 폰트', fontFamily: 'Arial', tier: 'LIGHT' },
  { id: 'font-2', name: '굵은 폰트', fontFamily: 'Arial Black', tier: 'LIGHT' },
  { id: 'font-3', name: '세련된 폰트', fontFamily: 'Helvetica', tier: 'PRO' },
  { id: 'font-4', name: '모던 폰트', fontFamily: 'Roboto', tier: 'PRO' },
  { id: 'font-5', name: '우아한 폰트', fontFamily: 'Georgia', tier: 'PRO' },
]

// 자막 색상 템플릿
export interface ColorTemplate {
  id: string
  name: string
  color: string
  tier: 'LIGHT' | 'PRO'
}

export const colorTemplates: ColorTemplate[] = [
  { id: 'color-1', name: '흰색', color: '#FFFFFF', tier: 'LIGHT' },
  { id: 'color-2', name: '검은색', color: '#000000', tier: 'LIGHT' },
  { id: 'color-3', name: '노란색', color: '#FFD700', tier: 'LIGHT' },
  { id: 'color-4', name: '빨간색', color: '#FF0000', tier: 'PRO' },
  { id: 'color-5', name: '파란색', color: '#0000FF', tier: 'PRO' },
  { id: 'color-6', name: '초록색', color: '#00FF00', tier: 'PRO' },
]

// 배경음악 템플릿
export interface BgmTemplate {
  id: string
  name: string
  description: string
  preview: string // Supabase Storage 파일 이름 (예: 'bgm1.mp3') 또는 로컬 경로
  tier: 'LIGHT' | 'PRO'
  // Supabase Storage 사용 여부 (true면 preview를 파일명으로 사용, false면 로컬 경로로 사용)
  useSupabaseStorage?: boolean
}

export const bgmTemplates: BgmTemplate[] = [
  { 
    id: 'bgm-1', 
    name: '밝은 배경음악', 
    description: '경쾌하고 밝은 느낌', 
    preview: 'bgm1/bgm1.mp3', 
    tier: 'LIGHT',
    useSupabaseStorage: true,
  },
  { 
    id: 'bgm-2', 
    name: '차분한 배경음악', 
    description: '편안하고 차분한 느낌', 
    preview: 'bgm2/bgm2.mp3', 
    tier: 'LIGHT',
    useSupabaseStorage: true,
  },
  { 
    id: 'bgm-3', 
    name: '에너지 넘치는 배경음악', 
    description: '역동적이고 활기찬 느낌', 
    preview: 'bgm3/bgm3.mp3', 
    tier: 'PRO',
    useSupabaseStorage: true,
  },
  { 
    id: 'bgm-4', 
    name: '감성적인 배경음악', 
    description: '부드럽고 감성적인 느낌', 
    preview: 'bgm4/bgm4.mp3', 
    tier: 'PRO',
    useSupabaseStorage: true,
  },
  { 
    id: 'bgm-5', 
    name: '트렌디한 배경음악', 
    description: '모던하고 세련된 느낌', 
    preview: 'bgm5/bgm5.mp3', 
    tier: 'PRO',
    useSupabaseStorage: true,
  },
  { 
    id: 'bgm-6', 
    name: '신나는 배경음악', 
    description: '밝고 신나는 느낌', 
    preview: 'bgm6/bgm6.mp3', 
    tier: 'LIGHT',
    useSupabaseStorage: true,
  },
  { 
    id: 'bgm-7', 
    name: '로맨틱한 배경음악', 
    description: '로맨틱하고 따뜻한 느낌', 
    preview: 'bgm7/bgm7.mp3', 
    tier: 'PRO',
    useSupabaseStorage: true,
  },
  { 
    id: 'bgm-8', 
    name: '집중력 높이는 배경음악', 
    description: '집중하기 좋은 차분한 느낌', 
    preview: 'bgm8/bgm8.mp3', 
    tier: 'PRO',
    useSupabaseStorage: true,
  },
  { 
    id: 'bgm-9', 
    name: '활기찬 배경음악', 
    description: '생동감 넘치는 느낌', 
    preview: 'bgm9/bgm9.mp3', 
    tier: 'LIGHT',
    useSupabaseStorage: true,
  },
  { 
    id: 'bgm-10', 
    name: '몽환적인 배경음악', 
    description: '몽환적이고 신비로운 느낌', 
    preview: 'bgm10/bgm10.mp3', 
    tier: 'PRO',
    useSupabaseStorage: true,
  },
  { 
    id: 'bgm-11', 
    name: '웅장한 배경음악', 
    description: '웅장하고 장엄한 느낌', 
    preview: 'bgm11/bgm11.mp3', 
    tier: 'PRO',
    useSupabaseStorage: true,
  },
]

/**
 * BGM 템플릿의 실제 URL을 가져옵니다 (동기 버전).
 * Supabase Storage를 사용하는 경우 Storage URL을 반환하고,
 * 그렇지 않은 경우 로컬 경로를 반환합니다.
 * 
 * 주의: 이 함수는 클라이언트 사이드에서만 동작합니다.
 * 서버 사이드에서는 로컬 경로를 반환합니다.
 */
export function getBgmTemplateUrlSync(template: BgmTemplate): string {
  if (template.useSupabaseStorage && typeof window !== 'undefined') {
    try {
      // 동적 import를 사용하되, 이미 로드된 경우를 위해 try-catch 사용
      const { getBgmStorageUrl } = require('@/lib/utils/supabase-storage')
      // preview 경로를 그대로 사용 (예: 'bgm1/bgm1.mp3')
      const storageUrl = getBgmStorageUrl(template.preview)
      if (storageUrl) {
        return storageUrl
      }
    } catch (error) {
      // 모듈이 아직 로드되지 않았거나 에러 발생 시 기본 경로 반환
    }
    // Storage URL을 가져오지 못한 경우, 기본 경로 반환
    return `/bgm/${template.preview}`
  }
  // 서버 사이드이거나 Supabase Storage를 사용하지 않는 경우
  return template.preview.startsWith('/') ? template.preview : `/bgm/${template.preview}`
}

/**
 * BGM 템플릿의 실제 URL을 가져옵니다 (비동기 버전).
 * Supabase Storage를 사용하는 경우 Storage URL을 반환하고,
 * 그렇지 않은 경우 로컬 경로를 반환합니다.
 */
export async function getBgmTemplateUrl(template: BgmTemplate): Promise<string> {
  if (template.useSupabaseStorage && typeof window !== 'undefined') {
    try {
      const { getBgmStorageUrl } = await import('@/lib/utils/supabase-storage')
      const storageUrl = getBgmStorageUrl(template.preview)
      if (storageUrl) {
        return storageUrl
      }
    } catch (error) {
      console.error('BGM Storage URL 가져오기 실패:', error)
    }
    // Storage URL을 가져오지 못한 경우, 기본 경로 반환
    return `/bgm/${template.preview}`
  }
  // 서버 사이드이거나 Supabase Storage를 사용하지 않는 경우
  return template.preview.startsWith('/') ? template.preview : `/bgm/${template.preview}`
}

// 전환효과 템플릿
export interface TransitionTemplate {
  id: string
  name: string
  description: string
  tier: 'LIGHT' | 'PRO'
}

export const transitionTemplates: TransitionTemplate[] = [
  { id: 'trans-1', name: '페이드', description: '부드럽게 전환', tier: 'LIGHT' },
  { id: 'trans-2', name: '슬라이드', description: '좌우로 슬라이드', tier: 'LIGHT' },
  { id: 'trans-3', name: '줌', description: '확대/축소 효과', tier: 'PRO' },
  { id: 'trans-4', name: '회전', description: '회전 효과', tier: 'PRO' },
  { id: 'trans-5', name: '와이프', description: '지우개 효과', tier: 'PRO' },
]

// 인트로 템플릿
export interface IntroTemplate {
  id: string
  name: string
  description: string
  preview: string
  tier: 'LIGHT' | 'PRO'
}

export const introTemplates: IntroTemplate[] = [
  { id: 'intro-1', name: '심플 인트로', description: '깔끔하고 심플한 인트로', preview: '/intros/intro1.mp4', tier: 'LIGHT' },
  { id: 'intro-2', name: '동적인 인트로', description: '에너지 넘치는 인트로', preview: '/intros/intro2.mp4', tier: 'LIGHT' },
  { id: 'intro-3', name: '프리미엄 인트로', description: '고급스러운 인트로', preview: '/intros/intro3.mp4', tier: 'PRO' },
  { id: 'intro-4', name: '트렌디 인트로', description: '모던한 인트로', preview: '/intros/intro4.mp4', tier: 'PRO' },
  { id: 'intro-5', name: '감성 인트로', description: '부드러운 인트로', preview: '/intros/intro5.mp4', tier: 'PRO' },
]

