import type { VideoAnalysis } from '@/lib/types/domain'

/** UI용 샘플 영상 (분석 페이지 왼쪽 플레이어) — API 연동 시 실제 URL로 교체 */
export const MOCK_REFERENCE_VIDEO_URL =
  'https://www.w3.org/WAI/content-assets/wcag-act-rules/test-assets/av/video/mp4/sample-mp4-file.mp4'

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
    videoLengthMin: 0.58,
    sceneCount: 4,
    avgCutLengthSec: 1.5,
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
    overview: '30~40대 실용주의 소비자 대상 6분 스마트폰 가성비 비교 리뷰. 4개 모델을 동일 기준으로 직접 비교해 구매 결정을 돕는 것이 핵심 목적.',
    directorComment: '"TOP 4 비교" 포맷은 결과 궁금증을 끝까지 유지시키는 강력한 구조입니다. 순위 발표 전 긴장감을 쌓는 편집 리듬이 이 영상의 시청 완료율을 높이는 핵심입니다.',
    targetAudienceDescription: '브랜드 팬덤보다 객관적 비교 데이터를 신뢰하는 소비자. 가성비 키워드에 민감한 반응.',
    targetAudienceAttributes: ['30-40대 직장인', '교체 예정자', '100만원 이하', '실용주의'],
    storyStructure: [
      { timeframe: '00:00~00:09', title: '훅', description: '"이 중 하나가 진짜 최고다" bold claim으로 시선 즉시 고정' },
      { timeframe: '00:10~00:30', title: '비교 기준 제시', description: '카메라·배터리·성능·가격 4가지 평가 항목 공개' },
      { timeframe: '00:30~04:30', title: '순차 리뷰', description: '각 모델을 기준에 따라 점수화' },
      { timeframe: '04:30~05:30', title: '최종 순위 공개', description: '드라마틱한 순위 발표' },
      { timeframe: '05:30~06:00', title: 'CTA', description: '구매 링크 안내 + 댓글 질문 유도' },
    ],
    editingPoints: [
      { label: '컷', description: '전환 평균 0.8초, 빠른 템포 유지' },
      { label: '그래픽', description: '스코어카드 팝업 형태로 등장' },
      { label: 'BGM', description: '경쾌한 일렉트로닉으로 속도감' },
      { label: '강조', description: '핵심 수치는 빨간색 텍스트 처리' },
    ],
    viralPoints: [
      '"TOP 4" 순위 공개 포맷 — 결과가 궁금해서 끝까지 보게 만드는 구조',
      '예상 밖 1위(비주류 브랜드) — 공유 욕구 자극',
      '가격 대비 성능 스코어카드 — 댓글 캡처 공유 다수 발생',
    ],
    trendContextDescription: '2024년 하반기 중저가 스마트폰 경쟁 격화 시점 출시. 갤럭시 A 시리즈·샤오미 경쟁 구도가 뜨거울 때',
    trendInsights: [
      { value: '+40%', label: '"가성비" 키워드 검색량' },
      { value: '최적', label: '트렌드 진입 타이밍' },
    ],
    ctaStrategy: [
      { label: '링크', description: '종료 15초 전부터 구매 링크 하단 자막 상시 노출' },
      { label: '멘트', description: '"지금 어떤 폰 쓰시나요? 댓글로 알려주세요"' },
      { label: '효과', description: '댓글 참여 → 알고리즘 노출 높이는 이중 CTA 구조' },
    ],
  },
}
