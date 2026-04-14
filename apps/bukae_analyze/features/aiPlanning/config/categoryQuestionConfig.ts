import type { VideoCategory, AiPlanningReferenceContext } from '@/lib/types/domain'
import type { AiQuestionOption } from '../types/viewModel'

// ─────────────────────────────────────────
// Q1 후킹
// ─────────────────────────────────────────
export function getHookingOptions(category: VideoCategory): AiQuestionOption[] {
  switch (category) {
    case 'self-narrative':
    case 'vlog':
      return [
        { value: 'achievement-reveal', label: '성취 결과 직접 공개' },
        { value: 'challenge-start', label: '도전 과정으로 시작' },
        { value: 'reversal', label: '반전 상황 제시' },
        { value: 'emotional-moment', label: '감정적 순간 공유' },
      ]
    case 'product-promo':
    case 'review':
      return [
        { value: 'usage-reveal', label: '제품 사용 장면 공개' },
        { value: 'before-after', label: '비포/애프터 비교' },
        { value: 'price-reveal', label: '가격 공개로 시선 집중' },
        { value: 'surprising-result', label: '놀라운 결과 공개' },
      ]
    case 'information':
      return [
        { value: 'shocking-fact', label: '충격적 사실 제시' },
        { value: 'loss-warning', label: '"모르면 손해" 경고' },
        { value: 'answer-first', label: '핵심 답부터 공개' },
        { value: 'question-start', label: '질문으로 시작' },
      ]
    case 'challenge-meme':
      return [
        { value: 'challenge-first', label: '챌린지 장면 먼저' },
        { value: 'humor-start', label: '유머로 시작' },
        { value: 'trend-keyword', label: '트렌드 키워드 공개' },
        { value: 'reaction-scene', label: '반응 유발 장면' },
      ]
    case 'interview-talk':
      return [
        { value: 'guest-reveal', label: '게스트 정체 공개' },
        { value: 'key-quote-first', label: '핵심 발언 클립 먼저' },
        { value: 'shock-preview', label: '충격 발언 예고' },
        { value: 'story-background', label: '스토리 배경 소개' },
      ]
    case 'tutorial':
      return [
        { value: 'result-first', label: '완성된 결과물 공개' },
        { value: 'problem-solve', label: '핵심 난관 해결 장면' },
        { value: 'before-after', label: '비포/애프터' },
        { value: 'time-cost', label: '시간·비용 절약 강조' },
      ]
  }
}

// ─────────────────────────────────────────
// Q2 스토리 방향 — 섹션 제목 + 선택지
// ─────────────────────────────────────────
interface StoryDirectionConfig {
  title: string
  options: AiQuestionOption[]
  hasCustomOption: boolean
}

export function getStoryDirectionConfig(category: VideoCategory): StoryDirectionConfig {
  switch (category) {
    case 'self-narrative':
    case 'vlog':
      return {
        title: '스토리 방향',
        hasCustomOption: false,
        options: [
          { value: 'result-first', label: '결과 먼저' },
          { value: 'process-first', label: '과정 먼저' },
          { value: 'reversal-center', label: '반전 중심' },
          { value: 'ai-recommend', label: 'AI 추천 보기' },
        ],
      }
    case 'product-promo':
    case 'review':
      return {
        title: '강조할 장점',
        hasCustomOption: true,
        options: [
          { value: 'convenience', label: '사용 편의성' },
          { value: 'price-value', label: '가격 대비 가치' },
          { value: 'quality', label: '품질/내구성' },
          { value: 'design', label: '디자인' },
        ],
      }
    case 'information':
      return {
        title: '전달 방식',
        hasCustomOption: false,
        options: [
          { value: 'list-summary', label: '리스트형 요약' },
          { value: 'storytelling', label: '스토리텔링형' },
          { value: 'qa-format', label: 'Q&A형' },
          { value: 'comparison', label: '비교형' },
          { value: 'ai-recommend', label: 'AI 추천 보기' },
        ],
      }
    case 'challenge-meme':
      return {
        title: '참여 방식',
        hasCustomOption: false,
        options: [
          { value: 'follow-along', label: '따라하기 유도' },
          { value: 'share-urge', label: '공유 유도' },
          { value: 'comment-engage', label: '댓글 참여' },
          { value: 'reaction-show', label: '반응 보여주기' },
          { value: 'ai-recommend', label: 'AI 추천 보기' },
        ],
      }
    case 'interview-talk':
      return {
        title: '진행 방향',
        hasCustomOption: false,
        options: [
          { value: 'guest-center', label: '게스트 중심' },
          { value: 'topic-center', label: '주제 중심' },
          { value: 'natural-flow', label: '대화 흐름 자연스럽게' },
          { value: 'ai-recommend', label: 'AI 추천 보기' },
        ],
      }
    case 'tutorial':
      return {
        title: '학습 방식',
        hasCustomOption: false,
        options: [
          { value: 'step-by-step', label: '단계별 설명' },
          { value: 'result-then-process', label: '완성 먼저 → 과정' },
          { value: 'comparison-explain', label: '비교 설명' },
          { value: 'ai-recommend', label: 'AI 추천 보기' },
        ],
      }
  }
}

// ─────────────────────────────────────────
// Q3 핵심 메시지
// ─────────────────────────────────────────
export function getCoreMessageOptions(category: VideoCategory): AiQuestionOption[] {
  switch (category) {
    case 'self-narrative':
    case 'vlog':
      return [
        { value: 'achievement-emphasis', label: '성취 결과 강조' },
        { value: 'effort-emphasis', label: '노력 과정 강조' },
        { value: 'realistic-advice', label: '현실 조언형' },
      ]
    case 'product-promo':
      return [
        { value: 'convenience', label: '진짜 편리해 보였으면 좋겠어요' },
        { value: 'price-value', label: '가격 대비 괜찮아 보였으면 좋겠어요' },
        { value: 'trustworthy', label: '믿고 살 만하다고 느꼈으면 좋겠어요' },
        { value: 'try-now', label: '당장 써보고 싶게 만들고 싶어요' },
      ]
    case 'review':
      return [
        { value: 'strong-recommend', label: '강력 추천' },
        { value: 'conditional-recommend', label: '조건부 추천 (이런 분께)' },
        { value: 'balanced-info', label: '장단점 균형 정보' },
      ]
    case 'information':
      return [
        { value: 'practical-info', label: '실용 정보 전달' },
        { value: 'trend-analysis', label: '트렌드 분석' },
        { value: 'expert-knowledge', label: '전문 지식 공유' },
      ]
    case 'challenge-meme':
      return [
        { value: 'fun-interest', label: '재미/가벼운 흥미' },
        { value: 'trend-participation', label: '트렌드 참여감' },
        { value: 'community-belonging', label: '공동체 소속감' },
      ]
    case 'interview-talk':
      return [
        { value: 'insight-delivery', label: '인사이트 전달' },
        { value: 'story-sharing', label: '스토리 공유' },
        { value: 'guest-expertise', label: '게스트 전문성 강조' },
      ]
    case 'tutorial':
      return [
        { value: 'easy-to-learn', label: '쉽게 배울 수 있다' },
        { value: 'practical-skill', label: '실용적 스킬 획득' },
        { value: 'expert-technique', label: '전문 기술 습득' },
      ]
  }
}

// ─────────────────────────────────────────
// Q4 원하는 반응 — 공통 선택지
// ─────────────────────────────────────────
export const AUDIENCE_REACTION_OPTIONS: AiQuestionOption[] = [
  { value: 'envy', label: '부러움' },
  { value: 'empathy', label: '공감' },
  { value: 'trust', label: '신뢰' },
  { value: 'information', label: '정보성 납득' },
  { value: 'purchase', label: '구매 욕구' },
  { value: 'fun', label: '웃음/흥미' },
  { value: 'next-episode', label: '다음 편 기대감' },
]

export function getAudienceReactionInsight(category: VideoCategory, ctx: AiPlanningReferenceContext): string {
  switch (category) {
    case 'self-narrative':
    case 'vlog':
      return `이 영상은 "${ctx.emotionTriggerLabel}"을 노렸어요. 비슷한 반응 방향이 어울릴 것 같아요.`
    case 'product-promo':
    case 'review':
      return `이 영상은 "${ctx.emotionTriggerLabel}" 반응을 유도했어요. 구매 욕구나 신뢰 형성 방향이 잘 맞을 것 같아요.`
    case 'information':
      return `이 영상은 "${ctx.emotionTriggerLabel}" 방식으로 시청자를 설득했어요. 정보성 납득이나 공유 욕구가 맞을 것 같아요.`
    case 'challenge-meme':
      return `이 영상은 "${ctx.emotionTriggerLabel}" 반응을 끌어냈어요. 웃음/흥미나 트렌드 참여감이 잘 맞아요.`
    case 'interview-talk':
      return `이 영상은 "${ctx.emotionTriggerLabel}"을 유도했어요. 신뢰나 공감 방향이 어울릴 것 같아요.`
    case 'tutorial':
      return `이 영상은 "${ctx.emotionTriggerLabel}" 반응을 만들었어요. 정보성 납득이나 저장 욕구가 맞을 것 같아요.`
  }
}

// ─────────────────────────────────────────
// Q5 CTA
// ─────────────────────────────────────────
export function getCtaOptions(category: VideoCategory): AiQuestionOption[] {
  switch (category) {
    case 'self-narrative':
    case 'vlog':
    case 'interview-talk':
      return [
        { value: 'comment', label: '댓글 달게 만들기' },
        { value: 'follow', label: '팔로우하게 만들기' },
        { value: 'next-episode', label: '다음 편 기다리게 만들기' },
      ]
    case 'product-promo':
    case 'review':
      return [
        { value: 'purchase', label: '구매하게 만들기' },
        { value: 'comment', label: '댓글 달게 만들기' },
        { value: 'follow', label: '팔로우하게 만들기' },
      ]
    case 'information':
    case 'tutorial':
      return [
        { value: 'save-share', label: '저장/공유하게 만들기' },
        { value: 'follow', label: '팔로우하게 만들기' },
        { value: 'comment', label: '댓글 달게 만들기' },
      ]
    case 'challenge-meme':
      return [
        { value: 'follow-along', label: '따라 만들게 만들기' },
        { value: 'share', label: '공유하게 만들기' },
        { value: 'follow', label: '팔로우하게 만들기' },
      ]
  }
}
