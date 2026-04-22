import type { VideoAnalysis } from '@/lib/types/domain'

/** UI용 샘플 영상 (분석 페이지 왼쪽 플레이어) — API 연동 시 실제 URL로 교체 */
export const MOCK_REFERENCE_VIDEO_URL =
  'https://www.w3.org/WAI/content-assets/wcag-act-rules/test-assets/av/video/mp4/sample-mp4-file.mp4'

export const MOCK_VIDEO_ANALYSIS: VideoAnalysis = {
  thumbnail: {
    imageUrl: 'https://picsum.photos/seed/thumbnail/360/640',
    mainText: '최고의 가성비폰 TOP 4',
    colors: ['#FF3B30', '#FFFFFF', '#1C1C1E', '#FFD700'],
    ctrGrade: '상위 15%',
    why: '숫자("TOP 4")와 결과 이미지 선노출이 결합되어 클릭 전에 이미 "내가 얻을 것"을 예측할 수 있게 한다.',
    evidence: [
      'ctrGrade: 상위 15%',
      'layoutComposition: 결과 이미지 선노출 + 숫자 강조형',
      'colors: 고대비 빨강+흰색 조합',
      'numberEmphasis: "TOP 4" 숫자 강조',
    ],
    facePresence: '없음 — 제품 중심 구성',
    numberEmphasis: 'TOP 4 강조 — 구체적 수치로 영상 범위를 예고',
    emotionTrigger: '욕망 (가성비 + 최고라는 확신 심어주기)',
  },

  hook: {
    hookRange: '0~9초',
    durationSec: 9,
    videoLengthMin: 0.58,
    avgCutLengthSec: 1.5,
    openingType: 'bold claim',
    emotionTrigger: 'curiosity',
    pacing: 'fast',
    why: '"이 중 하나가 진짜 최고다"라는 bold claim으로 시작해 시청자가 답을 알기 위해 영상을 끝까지 보게 유도한다.',
    evidence: [
      'openingType: bold claim',
      'emotionTrigger: curiosity',
      'pacing: fast — 컷 전환 평균 0.8초',
    ],
    viewerPositioning: '"스마트폰 교체를 고민 중인 분들이라면 꼭 보세요"',
    visualHook: 'jump cut — 4개 폰을 빠르게 순차 클로즈업',
    firstSentence: '이 중에서 진짜 살 만한 폰이 뭔지, 제가 다 써보고 골라드릴게요.',
  },

  structure: {
    overview: '30~40대 실용주의 소비자 대상 6분 스마트폰 가성비 비교 리뷰. 4개 모델을 동일 기준으로 직접 비교해 구매 결정을 돕는 것이 핵심 목적.',
    targetAudienceDescription: '브랜드 팬덤보다 객관적 비교 데이터를 신뢰하는 소비자. 가성비 키워드에 민감한 반응.',
    targetAudienceAttributes: ['30-40대 직장인', '교체 예정자', '100만원 이하', '실용주의'],
    storyStructure: [
      { timeframe: '00.00s - 00.09s', title: '훅', description: '"이 중 하나가 진짜 최고다" bold claim으로 시선 즉시 고정' },
      { timeframe: '00.10s - 00.30s', title: '문제 제기', description: '카메라·배터리·성능·가격 4가지 평가 항목 공개' },
      { timeframe: '00.30s - 04.30s', title: '증명/데모', description: '각 모델을 기준에 따라 점수화' },
      { timeframe: '04.30s - 05.30s', title: 'CTA', description: '드라마틱한 순위 발표 + 구매 링크 안내' },
    ],
    viralPointCards: [
      {
        title: '"TOP 4" 순위 공개 포맷',
        summary: '결과가 궁금해서 끝까지 보게 만드는 구조',
      },
      {
        title: '예상 밖 1위 (비주류 브랜드)',
        summary: '공유 욕구 자극',
      },
      {
        title: '가격 대비 성능 스코어카드',
        summary: '댓글 캡처 공유 다수 발생',
      },
    ],
  },
}
