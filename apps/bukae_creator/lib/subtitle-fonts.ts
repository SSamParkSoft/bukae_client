import { getFontStorageUrl } from '@/lib/utils/supabase-storage'

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
// - Supabase Storage에서 폰트를 동적으로 로드합니다.
// - Timeline에는 안정적인 fontId를 저장하고, 렌더 시점에 fontFamily로 resolve합니다.
// - 폰트는 클라이언트 사이드에서 동적으로 로드되며, 필요할 때만 로드됩니다.

// 폰트 파일 경로 매핑 (Supabase Storage 경로)
type FontFileMapping = {
  fontId: SubtitleFontId
  files: Array<{ path: string; weight: number | string; style?: string }>
}

const FONT_FILE_MAPPINGS: FontFileMapping[] = [
  {
    fontId: 'gmarket_sans',
    files: [
      { path: 'gmarket_sans/GmarketSansTTFLight.ttf', weight: 300 },
      { path: 'gmarket_sans/GmarketSansTTFMedium.ttf', weight: 500 },
      { path: 'gmarket_sans/GmarketSansTTFBold.ttf', weight: 700 },
    ],
  },
  {
    fontId: 'pretendard',
    files: [{ path: 'pretendard/PretendardVariable.woff2', weight: '100 900' }],
  },
  {
    fontId: 'noto_sans_kr',
    files: [{ path: 'noto_sans_kr/NotoSansKR.ttf', weight: '100 900' }],
  },
  {
    fontId: 'noto_serif_kr',
    files: [{ path: 'noto_serif_kr/NotoSerifKR.ttf', weight: '100 900' }],
  },
  {
    fontId: 'nanum_gothic',
    files: [
      { path: 'nanum_gothic/NanumGothic-Regular.ttf', weight: 400 },
      { path: 'nanum_gothic/NanumGothic-Bold.ttf', weight: 700 },
    ],
  },
  {
    fontId: 'nanum_myeongjo',
    files: [
      { path: 'nanum_myeongjo/NanumMyeongjo-Regular.ttf', weight: 400 },
      { path: 'nanum_myeongjo/NanumMyeongjo-Bold.ttf', weight: 700 },
    ],
  },
  {
    fontId: 'gowun_dodum',
    files: [{ path: 'gowun_dodum/GowunDodum-Regular.ttf', weight: 400 }],
  },
  {
    fontId: 'gowun_batang',
    files: [
      { path: 'gowun_batang/GowunBatang-Regular.ttf', weight: 400 },
      { path: 'gowun_batang/GowunBatang-Bold.ttf', weight: 700 },
    ],
  },
  {
    fontId: 'do_hyeon',
    files: [{ path: 'do_hyeon/DoHyeon-Regular.ttf', weight: 400 }],
  },
  {
    fontId: 'jua',
    files: [{ path: 'jua/Jua-Regular.ttf', weight: 400 }],
  },
  {
    fontId: 'black_han_sans',
    files: [{ path: 'black_han_sans/BlackHanSans-Regular.ttf', weight: 400 }],
  },
]

// 폰트 Family 이름 생성 (일관된 이름 사용)
function getFontFamilyName(fontId: SubtitleFontId): string {
  return `Subtitle-${fontId.split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`
}

export const SUBTITLE_DEFAULT_FONT_ID: SubtitleFontId = 'pretendard'
export const SUBTITLE_DEFAULT_WEIGHTS = [400, 700] as const

export const SUBTITLE_FONT_OPTIONS: SubtitleFontOption[] = [
  { id: 'gmarket_sans', label: 'Gmarket Sans', fontFamily: getFontFamilyName('gmarket_sans'), weights: [300, 500, 700] },
  { id: 'pretendard', label: 'Pretendard', fontFamily: getFontFamilyName('pretendard'), weights: [300, 400, 500, 700, 900] },
  { id: 'noto_sans_kr', label: 'Noto Sans KR', fontFamily: getFontFamilyName('noto_sans_kr'), weights: [300, 400, 500, 700, 900] },
  { id: 'noto_serif_kr', label: 'Noto Serif KR', fontFamily: getFontFamilyName('noto_serif_kr'), weights: [300, 400, 500, 700, 900] },
  { id: 'nanum_gothic', label: '나눔고딕', fontFamily: getFontFamilyName('nanum_gothic'), weights: [400, 700] },
  { id: 'nanum_myeongjo', label: '나눔명조', fontFamily: getFontFamilyName('nanum_myeongjo'), weights: [400, 700] },
  { id: 'gowun_dodum', label: '고운돋움', fontFamily: getFontFamilyName('gowun_dodum'), weights: [400] },
  { id: 'gowun_batang', label: '고운바탕', fontFamily: getFontFamilyName('gowun_batang'), weights: [400, 700] },
  { id: 'do_hyeon', label: '도현', fontFamily: getFontFamilyName('do_hyeon'), weights: [400] },
  { id: 'jua', label: '주아', fontFamily: getFontFamilyName('jua'), weights: [400] },
  { id: 'black_han_sans', label: 'Black Han Sans', fontFamily: getFontFamilyName('black_han_sans'), weights: [400] },
]

const OPTION_BY_ID = new Map<SubtitleFontId, SubtitleFontOption>(SUBTITLE_FONT_OPTIONS.map((o) => [o.id, o]))

// 로드된 폰트 추적 (중복 로드 방지)
const loadedFonts = new Set<SubtitleFontId>()

/**
 * Supabase Storage에서 폰트를 동적으로 로드합니다.
 * @param fontId - 로드할 폰트 ID
 */
export async function loadSubtitleFont(fontId: SubtitleFontId): Promise<void> {
  if (typeof window === 'undefined') return
  if (loadedFonts.has(fontId)) return

  const mapping = FONT_FILE_MAPPINGS.find((m) => m.fontId === fontId)
  if (!mapping) {
    console.warn(`폰트 매핑을 찾을 수 없습니다: ${fontId}`)
    return
  }

  const fontFamily = getFontFamilyName(fontId)
  const fontFaces: FontFace[] = []

  for (const file of mapping.files) {
    const storageUrl = getFontStorageUrl(file.path)
    if (!storageUrl) {
      console.warn(`폰트 Storage URL을 가져올 수 없습니다: ${file.path}`)
      continue
    }

    const fontFace = new FontFace(
      fontFamily,
      `url(${storageUrl})`,
      {
        weight: typeof file.weight === 'string' ? file.weight : file.weight.toString(),
        style: file.style || 'normal',
        display: 'swap',
      }
    )

    try {
      await fontFace.load()
      fontFaces.push(fontFace)
    } catch (error) {
      console.error(`폰트 로드 실패 (${fontId}/${file.path}):`, error)
    }
  }

  // document.fonts에 추가
  for (const fontFace of fontFaces) {
    if (!document.fonts.check(`${fontFace.weight} 16px ${fontFamily}`)) {
      document.fonts.add(fontFace)
    }
  }

  loadedFonts.add(fontId)
}

/**
 * 여러 폰트를 한 번에 로드합니다.
 */
export async function loadSubtitleFonts(fontIds: SubtitleFontId[]): Promise<void> {
  await Promise.all(fontIds.map((id) => loadSubtitleFont(id)))
}

/**
 * 클라이언트 사이드에서 모든 폰트의 @font-face를 동적으로 주입합니다.
 * 이 함수는 클라이언트 사이드에서만 호출되어야 합니다.
 */
export function initializeSubtitleFonts(): void {
  if (typeof window === 'undefined') return

  // 이미 초기화되었는지 확인
  if ((window as any).__subtitleFontsInitialized) return
  ;(window as any).__subtitleFontsInitialized = true

  // 모든 폰트에 대해 @font-face 생성
  for (const mapping of FONT_FILE_MAPPINGS) {
    const fontFamily = getFontFamilyName(mapping.fontId)

    for (const file of mapping.files) {
      const storageUrl = getFontStorageUrl(file.path)
      if (!storageUrl) continue

      const weight = typeof file.weight === 'string' ? file.weight : `${file.weight}`
      const style = file.style || 'normal'

      // @font-face 스타일 생성
      const styleElement = document.createElement('style')
      styleElement.textContent = `
        @font-face {
          font-family: '${fontFamily}';
          src: url('${storageUrl}') format('${file.path.endsWith('.woff2') ? 'woff2' : 'truetype'}');
          font-weight: ${weight};
          font-style: ${style};
          font-display: swap;
        }
      `
      document.head.appendChild(styleElement)
    }
  }
}

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
