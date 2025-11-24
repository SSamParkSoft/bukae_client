// 컨셉 타입
export type ConceptType = 'viral' | 'product-info' | 'review' | 'daily-review' | 'promotional' | 'calm-explanation' | 'emotional'

// 말투 타입
export type ToneType = string

// 컨셉별 말투 옵션
export const conceptTones: Record<ConceptType, Array<{ id: string; label: string; tier: 'LIGHT' | 'PRO' }>> = {
  viral: [
    { id: 'viral-1', label: '이걸 나만 모르고 있었네', tier: 'LIGHT' },
    { id: 'viral-2', label: '와 이런게 있다고?', tier: 'PRO' },
    { id: 'viral-3', label: '또 사고 싶으니 추천', tier: 'PRO' },
    { id: 'viral-4', label: '이거 한 번 써보세요', tier: 'PRO' },
    { id: 'viral-5', label: '일상이 도파민으로 가득해졌습니다', tier: 'PRO' },
    { id: 'viral-6', label: '없으면 손해보는 꿀템 소개', tier: 'PRO' },
    { id: 'viral-7', label: '이거 얼마주고 샀어?', tier: 'PRO' },
    { id: 'viral-8', label: '아니 웬걸...', tier: 'PRO' },
    { id: 'viral-9', label: '5점 줄게요', tier: 'PRO' },
    { id: 'viral-10', label: '어 이 제품 뭐지?', tier: 'PRO' },
    { id: 'viral-11', label: '희대의 아이템을 가져왔다', tier: 'PRO' },
    { id: 'viral-12', label: '이거 완전 난리 났거든요?', tier: 'PRO' },
    { id: 'viral-13', label: '니 이거 안 써봤제?', tier: 'PRO' },
    { id: 'viral-14', label: '덕분에 두배로 행복해졌어요', tier: 'PRO' },
  ],
  'product-info': [
    { id: 'info-1', label: '신뢰감 가는 아나운서', tier: 'LIGHT' },
    { id: 'info-2', label: '인스타그램 인플루언서', tier: 'PRO' },
    { id: 'info-3', label: '테크 전문 유튜버', tier: 'PRO' },
    { id: 'info-4', label: '트렌디한 마케팅 전문가', tier: 'PRO' },
    { id: 'info-5', label: '살림꾼 블로거', tier: 'PRO' },
    { id: 'info-6', label: '대학생 쇼핑광 친구', tier: 'PRO' },
    { id: 'info-7', label: '흥분한 세일즈맨', tier: 'PRO' },
    { id: 'info-8', label: '발랄한 틱톡커', tier: 'PRO' },
  ],
  review: [
    { id: 'review-1', label: '신뢰감 가는 아나운서', tier: 'LIGHT' },
    { id: 'review-2', label: '인스타그램 인플루언서', tier: 'PRO' },
    { id: 'review-3', label: '테크 전문 유튜버', tier: 'PRO' },
    { id: 'review-4', label: '트렌디한 마케팅 전문가', tier: 'PRO' },
    { id: 'review-5', label: '살림꾼 블로거', tier: 'PRO' },
    { id: 'review-6', label: '대학생 쇼핑광 친구', tier: 'PRO' },
    { id: 'review-7', label: '흥분한 세일즈맨', tier: 'PRO' },
    { id: 'review-8', label: '발랄한 틱톡커', tier: 'PRO' },
  ],
  'daily-review': [
    { id: 'daily-1', label: '일상적인 대화 톤', tier: 'LIGHT' },
    { id: 'daily-2', label: '친구에게 추천하는 느낌', tier: 'LIGHT' },
    { id: 'daily-3', label: '솔직한 후기 스타일', tier: 'PRO' },
    { id: 'daily-4', label: '편안한 일상 리뷰', tier: 'PRO' },
    { id: 'daily-5', label: '자연스러운 대화체', tier: 'PRO' },
  ],
  promotional: [
    { id: 'promo-1', label: '홍보 전문가', tier: 'LIGHT' },
    { id: 'promo-2', label: '광고 카피라이터', tier: 'PRO' },
    { id: 'promo-3', label: '세일즈 전문가', tier: 'PRO' },
    { id: 'promo-4', label: '마케팅 전문가', tier: 'PRO' },
    { id: 'promo-5', label: '프로모션 전문가', tier: 'PRO' },
  ],
  'calm-explanation': [
    { id: 'calm-1', label: '차분한 설명자', tier: 'LIGHT' },
    { id: 'calm-2', label: '교육자 스타일', tier: 'PRO' },
    { id: 'calm-3', label: '전문가 해설', tier: 'PRO' },
    { id: 'calm-4', label: '안정적인 나레이션', tier: 'PRO' },
    { id: 'calm-5', label: '신뢰감 있는 설명', tier: 'PRO' },
  ],
  emotional: [
    { id: 'emo-1', label: '감성적인 톤', tier: 'LIGHT' },
    { id: 'emo-2', label: '따뜻한 감성', tier: 'PRO' },
    { id: 'emo-3', label: '로맨틱한 스타일', tier: 'PRO' },
    { id: 'emo-4', label: '감동적인 나레이션', tier: 'PRO' },
    { id: 'emo-5', label: '부드러운 감성톤', tier: 'PRO' },
  ],
}

// 컨셉 옵션
export const conceptOptions: Array<{ id: ConceptType; label: string; tier: 'LIGHT' | 'PRO' }> = [
  { id: 'viral', label: '바이럴형', tier: 'LIGHT' },
  { id: 'product-info', label: '상품 정보형', tier: 'LIGHT' },
  { id: 'review', label: '리뷰형', tier: 'PRO' },
  { id: 'daily-review', label: '일상적 리뷰 스타일', tier: 'LIGHT' },
  { id: 'promotional', label: '홍보형/광고 스타일', tier: 'PRO' },
  { id: 'calm-explanation', label: '차분한 설명 스타일', tier: 'LIGHT' },
  { id: 'emotional', label: '감성톤', tier: 'PRO' },
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
  preview: string
  tier: 'LIGHT' | 'PRO'
}

export const bgmTemplates: BgmTemplate[] = [
  { id: 'bgm-1', name: '밝은 배경음악', description: '경쾌하고 밝은 느낌', preview: '/bgm/bgm1.mp3', tier: 'LIGHT' },
  { id: 'bgm-2', name: '차분한 배경음악', description: '편안하고 차분한 느낌', preview: '/bgm/bgm2.mp3', tier: 'LIGHT' },
  { id: 'bgm-3', name: '에너지 넘치는 배경음악', description: '역동적이고 활기찬 느낌', preview: '/bgm/bgm3.mp3', tier: 'PRO' },
  { id: 'bgm-4', name: '감성적인 배경음악', description: '부드럽고 감성적인 느낌', preview: '/bgm/bgm4.mp3', tier: 'PRO' },
  { id: 'bgm-5', name: '트렌디한 배경음악', description: '모던하고 세련된 느낌', preview: '/bgm/bgm5.mp3', tier: 'PRO' },
]

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

