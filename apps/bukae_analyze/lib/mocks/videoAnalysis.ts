import type { VideoAnalysis } from '@/lib/types/domain'

export const MOCK_VIDEO_ANALYSIS: VideoAnalysis = {
  thumbnail: {
    imageUrl: 'https://picsum.photos/seed/thumbnail/360/640',
    mainText: '최고의 가성비폰 TOP 4',
    textRatio: 0.38,
    layoutComposition: '결과 이미지 선노출 + 숫자 강조형 — 4개의 폰 이미지를 상단에 배치하고 하단에 큼직한 숫자로 순위 강조',
    colors: ['#FF3B30', '#FFFFFF', '#1C1C1E', '#FFD700'],
    ctrGrade: '상위 15%',
    why: '숫자("TOP 4")와 결과 이미지 선노출이 결합되어 클릭 전에 이미 "내가 얻을 것"을 예측할 수 있게 한다. 고대비(빨강+흰색) 배경이 피드에서 시각적 주목도를 높이며, 가격/성능 욕망을 자극하는 "가성비"라는 단어가 심리적 진입 장벽을 낮춘다.',
    evidence: [
      'ctrGrade: 상위 15%',
      'layoutComposition: 결과 이미지 선노출 + 숫자 강조형',
      'colors: 고대비 빨강+흰색 조합',
      'numberEmphasis: "TOP 4" 숫자 강조',
    ],
    crossValidation: {
      match: true,
      evidence: 'praiseKeywords에 "썸네일 보고 클릭했어요" 포함, topThemes에 "가격 비교" 언급',
    },
    facePresence: '없음 — 제품 중심 구성',
    numberEmphasis: 'TOP 4 강조 — 구체적 수치로 영상 범위를 예고',
    emotionTrigger: '욕망 (가성비 + 최고라는 확신 심어주기)',
  },

  hook: {
    durationSec: 9,
    openingType: 'bold claim',
    emotionTrigger: 'curiosity',
    pacing: 'fast',
    why: '"이 중 하나가 진짜 최고다"라는 bold claim으로 시작해 시청자가 답을 알기 위해 영상을 끝까지 보게 유도한다. 빠른 컷 전환(fast pacing)이 지루함을 제거하고, 가성비 욕망을 지닌 타겟층의 호기심을 즉시 자극한다.',
    evidence: [
      'openingType: bold claim',
      'emotionTrigger: curiosity',
      'pacing: fast — 컷 전환 평균 0.8초',
    ],
    crossValidation: {
      match: true,
      evidence: 'topThemes에 "첫 부분부터 재밌었다" 언급, sentimentRatio 긍정 82%',
    },
    viewerPositioning: '"스마트폰 교체를 고민 중인 분들이라면 꼭 보세요"',
    visualHook: 'jump cut — 4개 폰을 빠르게 순차 클로즈업',
    firstSentence: '이 중에서 진짜 살 만한 폰이 뭔지, 제가 다 써보고 골라드릴게요.',
  },

  comment: {
    targetAudienceSignal: '30~40대 직장인, 스마트폰 교체 주기를 고민 중인 실용주의 소비자. 가격 대비 성능을 최우선으로 고려하며 브랜드보다 실사용 후기를 신뢰하는 성향.',
    topThemes: [
      '가격 비교 — 각 모델 실구매 가격 언급 댓글 다수',
      '배터리 수명 — "배터리가 제일 중요한데" 류 반복',
      '카메라 성능 — 일상 사진 품질에 대한 구체적 질문',
    ],
    requestPatterns: [
      '중저가 안드로이드 단독 비교 영상 요청',
      '아이폰 vs 안드로이드 비교 요청',
      '실제 사용 1개월 후기 영상 요청',
    ],
    confusionPoints: [
      '3번 모델 가격이 영상 촬영 시점과 달라 혼란',
      'AP 성능 수치 설명이 너무 전문적이라 이해 어렵다는 반응',
    ],
    sentimentRatio: {
      positive: 0.82,
      negative: 0.06,
      neutral: 0.12,
    },
    keywords: [
      '썸네일 보고 클릭',
      '설명이 깔끔해요',
      '비교가 제일 잘 됐어요',
      '바로 구매했어요',
      '덕분에 결정했습니다',
    ],
    why: '댓글의 82%가 긍정이며, 전환 댓글(구매/결정 완료) 41개가 확인된다. "설명이 깔끔해요"라는 칭찬 패턴은 복잡한 스펙을 쉽게 풀어내는 편집 방식이 핵심 성공 요인임을 직접 증명한다. 타겟(구매 고민 중인 실용주의자)이 정확히 적중된 결과.',
    evidence: [
      'sentimentRatio: 긍정 82%',
      'conversionComments: 41개',
      'praiseKeywords: "설명이 깔끔해요" 반복',
      'targetAudienceSignal: 구매 결정 단계 소비자 다수 확인',
    ],
    conversionComments: 41,
  },

  structure: {
    overview: '30~40대 실용주의 소비자를 대상으로 한 6분 분량의 스마트폰 가성비 비교 리뷰. 4개 모델을 동일 기준(카메라·배터리·성능·가격)으로 직접 비교하여 구매 결정을 돕는 것이 핵심 목적.',
    storyStructure: '① 훅(0~9초): "이 중 하나가 진짜 최고다" bold claim → ② 비교 기준 제시(10~30초): 4가지 평가 항목 공개 → ③ 순차 리뷰(30초~4분30초): 각 모델을 기준에 따라 점수화 → ④ 최종 순위 공개(4분30초~5분30초): 드라마틱한 순위 발표 → ⑤ CTA(5분30초~6분): 구매 링크 안내 + 댓글 질문 유도',
    editingPoints: '컷 전환이 0.8초 평균으로 빠르며, 각 모델 소개 시 스코어 카드 그래픽 자막이 팝업 형태로 등장. BGM은 경쾌한 일렉트로닉으로 속도감을 보강. 핵심 수치는 빨간색 텍스트로 강조 처리.',
    targetAudience: '30~40대 직장인 중 스마트폰 교체를 앞두고 있으며, 100만원 이하 가성비 모델을 찾는 실용주의 소비자. 브랜드 팬덤보다 객관적 비교 데이터를 신뢰하는 성향.',
    viralPoints: '① "TOP 4" 순위 공개 포맷 — 결과가 궁금해서 끝까지 보게 만드는 구조 ② 예상 밖 1위(비주류 브랜드) — 공유 욕구 자극 ③ 가격 대비 성능 스코어카드 — 댓글에서 캡처 공유 다수 발생',
    trendContext: '2024년 하반기 중저가 스마트폰 경쟁이 격화되며 소비자의 비교 니즈가 급등한 시점에 출시. 갤럭시 A 시리즈와 샤오미 경쟁 구도가 뜨거울 때 "가성비" 키워드 검색량이 40% 증가한 흐름을 정확히 타고 있음.',
    ctaStrategy: '영상 종료 15초 전부터 구매 링크를 화면 하단 자막으로 상시 노출. 마지막 멘트: "지금 어떤 폰 쓰시나요? 댓글로 알려주세요" — 댓글 참여를 유도하여 알고리즘 노출을 높이는 이중 CTA 구조.',
  },
}
