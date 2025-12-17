import localFont from 'next/font/local'

export type SubtitleFontId =
  | 'gmarket_sans'
  | 'pretendard'
  | 'noto_sans_kr'
  | 'noto_serif_kr'
  | 'nanum_gothic'
  | 'nanum_myeongjo'
  | 'gowun_dodum'
  | 'gowun_batang'
  | 'do_hyeon'
  | 'jua'
  | 'black_han_sans'

export type SubtitleFontOption = {
  id: SubtitleFontId
  label: string
  fontFamily: string
  weights: number[]
}

// NOTE
// - `next/font/local`은 내부적으로 해시된 font-family를 생성하므로,
//   Timeline에는 안정적인 fontId를 저장하고, 렌더 시점에만 resolve합니다.
// - preload: false 로 두고(폰트 10개 + 다중 weight preload 폭증 방지),
//   Step4에서 선택된 폰트만 document.fonts.load()로 선로딩합니다.

const gmarketSans = localFont({
  src: [
    { path: '../app/fonts/subtitles/gmarket_sans/GmarketSansTTFLight.ttf', weight: '300', style: 'normal' },
    { path: '../app/fonts/subtitles/gmarket_sans/GmarketSansTTFMedium.ttf', weight: '500', style: 'normal' },
    { path: '../app/fonts/subtitles/gmarket_sans/GmarketSansTTFBold.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
})

const pretendard = localFont({
  src: [
    {
      path: '../app/fonts/subtitles/pretendard/PretendardVariable.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  preload: false,
})

const notoSansKr = localFont({
  src: [
    {
      path: '../app/fonts/subtitles/noto_sans_kr/NotoSansKR[wght].ttf',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  preload: false,
})

const notoSerifKr = localFont({
  src: [
    {
      path: '../app/fonts/subtitles/noto_serif_kr/NotoSerifKR[wght].ttf',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  preload: false,
})

const nanumGothic = localFont({
  src: [
    { path: '../app/fonts/subtitles/nanum_gothic/NanumGothic-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../app/fonts/subtitles/nanum_gothic/NanumGothic-Bold.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
})

const nanumMyeongjo = localFont({
  src: [
    { path: '../app/fonts/subtitles/nanum_myeongjo/NanumMyeongjo-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../app/fonts/subtitles/nanum_myeongjo/NanumMyeongjo-Bold.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
})

const gowunDodum = localFont({
  src: [{ path: '../app/fonts/subtitles/gowun_dodum/GowunDodum-Regular.ttf', weight: '400', style: 'normal' }],
  display: 'swap',
  preload: false,
})

const gowunBatang = localFont({
  src: [
    { path: '../app/fonts/subtitles/gowun_batang/GowunBatang-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../app/fonts/subtitles/gowun_batang/GowunBatang-Bold.ttf', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
})

const doHyeon = localFont({
  src: [{ path: '../app/fonts/subtitles/do_hyeon/DoHyeon-Regular.ttf', weight: '400', style: 'normal' }],
  display: 'swap',
  preload: false,
})

const jua = localFont({
  src: [{ path: '../app/fonts/subtitles/jua/Jua-Regular.ttf', weight: '400', style: 'normal' }],
  display: 'swap',
  preload: false,
})

const blackHanSans = localFont({
  src: [{ path: '../app/fonts/subtitles/black_han_sans/BlackHanSans-Regular.ttf', weight: '400', style: 'normal' }],
  display: 'swap',
  preload: false,
})

export const SUBTITLE_DEFAULT_FONT_ID: SubtitleFontId = 'pretendard'
export const SUBTITLE_DEFAULT_WEIGHTS = [400, 700] as const

export const SUBTITLE_FONT_OPTIONS: SubtitleFontOption[] = [
  { id: 'gmarket_sans', label: 'Gmarket Sans', fontFamily: gmarketSans.style.fontFamily, weights: [300, 500, 700] },
  { id: 'pretendard', label: 'Pretendard', fontFamily: pretendard.style.fontFamily, weights: [300, 400, 500, 700, 900] },
  { id: 'noto_sans_kr', label: 'Noto Sans KR', fontFamily: notoSansKr.style.fontFamily, weights: [300, 400, 500, 700, 900] },
  { id: 'noto_serif_kr', label: 'Noto Serif KR', fontFamily: notoSerifKr.style.fontFamily, weights: [300, 400, 500, 700, 900] },
  { id: 'nanum_gothic', label: '나눔고딕', fontFamily: nanumGothic.style.fontFamily, weights: [400, 700] },
  { id: 'nanum_myeongjo', label: '나눔명조', fontFamily: nanumMyeongjo.style.fontFamily, weights: [400, 700] },
  { id: 'gowun_dodum', label: '고운돋움', fontFamily: gowunDodum.style.fontFamily, weights: [400] },
  { id: 'gowun_batang', label: '고운바탕', fontFamily: gowunBatang.style.fontFamily, weights: [400, 700] },
  { id: 'do_hyeon', label: '도현', fontFamily: doHyeon.style.fontFamily, weights: [400] },
  { id: 'jua', label: '주아', fontFamily: jua.style.fontFamily, weights: [400] },
  { id: 'black_han_sans', label: 'Black Han Sans', fontFamily: blackHanSans.style.fontFamily, weights: [400] },
]

const OPTION_BY_ID = new Map<SubtitleFontId, SubtitleFontOption>(SUBTITLE_FONT_OPTIONS.map((o) => [o.id, o]))

export function isSubtitleFontId(value: unknown): value is SubtitleFontId {
  return typeof value === 'string' && OPTION_BY_ID.has(value as SubtitleFontId)
}

export function resolveSubtitleFontFamily(idOrCssFamily: string | undefined | null): string {
  if (!idOrCssFamily) return OPTION_BY_ID.get(SUBTITLE_DEFAULT_FONT_ID)!.fontFamily

  // Backward compatibility: 기존 데이터에 남아 있는 값들 정리
  const normalized = idOrCssFamily.trim()
  if (normalized === 'Pretendard-Bold' || normalized === 'Pretendard') {
    return OPTION_BY_ID.get('pretendard')!.fontFamily
  }

  if (isSubtitleFontId(normalized)) {
    return OPTION_BY_ID.get(normalized)!.fontFamily
  }

  // 기존 UI에서 사용되던 시스템 폰트 문자열(Arial 등)은 그대로 사용
  return normalized
}

export function resolveSubtitleFontWeights(idOrCssFamily: string | undefined | null): number[] {
  if (!idOrCssFamily) return [...SUBTITLE_DEFAULT_WEIGHTS]
  const normalized = idOrCssFamily.trim()
  if (normalized === 'Pretendard-Bold' || normalized === 'Pretendard') return OPTION_BY_ID.get('pretendard')!.weights
  if (isSubtitleFontId(normalized)) return OPTION_BY_ID.get(normalized)!.weights
  return [...SUBTITLE_DEFAULT_WEIGHTS]
}

export function getSubtitleFontOption(id: SubtitleFontId): SubtitleFontOption {
  return OPTION_BY_ID.get(id)!
}


