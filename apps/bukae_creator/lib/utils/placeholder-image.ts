/**
 * 로컬에서 생성한 placeholder 이미지 유틸리티
 * 외부 서비스(via.placeholder.com) 의존성을 제거하여 네트워크 오류 방지
 */

/**
 * UTF-8 문자열을 Base64로 인코딩 (한글 지원)
 */
function encodeToBase64(str: string): string {
  // 브라우저 환경
  if (typeof window !== 'undefined') {
    try {
      // TextEncoder를 사용하여 UTF-8 바이트 배열로 변환 후 Base64 인코딩
      const encoder = new TextEncoder()
      const bytes = encoder.encode(str)
      const binary = String.fromCharCode(...bytes)
      return btoa(binary)
    } catch {
      // fallback: encodeURIComponent 사용
      return btoa(unescape(encodeURIComponent(str)))
    }
  }
  // Node.js 환경
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64')
  }
  // 최종 fallback
  return btoa(unescape(encodeURIComponent(str)))
}

/**
 * SVG 기반 placeholder 이미지 Data URL 생성
 * @param width 이미지 너비
 * @param height 이미지 높이
 * @param bgColor 배경색 (hex 코드, 기본값: #a78bfa)
 * @param textColor 텍스트 색상 (hex 코드, 기본값: #ffffff)
 * @param text 표시할 텍스트 (선택사항, 한글 지원)
 */
export function createPlaceholderImageUrl(
  width: number = 200,
  height: number = 200,
  bgColor: string = '#a78bfa',
  textColor: string = '#ffffff',
  text?: string
): string {
  // 텍스트에 특수문자가 있으면 이스케이프 처리
  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      ${text ? `
        <text 
          x="50%" 
          y="50%" 
          font-family="Arial, sans-serif" 
          font-size="${Math.min(width, height) / 6}" 
          fill="${textColor}" 
          text-anchor="middle" 
          dominant-baseline="middle"
        >${escapeXml(text)}</text>
      ` : ''}
    </svg>
  `.trim()

  // Base64 인코딩 (한글 지원)
  return `data:image/svg+xml;base64,${encodeToBase64(svg)}`
}

/**
 * 상품 이미지용 기본 placeholder
 */
export const PRODUCT_PLACEHOLDER = createPlaceholderImageUrl(200, 200, '#a78bfa', '#ffffff', 'Image')

/**
 * 씬 이미지용 placeholder (씬 번호 포함)
 */
export function getScenePlaceholder(sceneIndex: number): string {
  return createPlaceholderImageUrl(200, 200, '#a78bfa', '#ffffff', `Scene${sceneIndex + 1}`)
}

/**
 * 텍스트가 포함된 placeholder
 */
export function getTextPlaceholder(text: string, width: number = 200, height: number = 200): string {
  // 한글 텍스트는 최대 2글자만 표시
  const displayText = text.length > 2 ? text.substring(0, 2) : text
  return createPlaceholderImageUrl(width, height, '#a78bfa', '#ffffff', displayText)
}

