/**
 * MCP Browser 자동 연결 헬퍼
 * 개발 환경에서 localhost:3000, localhost:3001에 접속 시 MCP 브라우저가 자동으로 연결되도록 합니다.
 */

export function initMcpBrowserHelper() {
  // 개발 환경에서만 실행
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  // 클라이언트 사이드에서만 실행
  if (typeof window === 'undefined') {
    return
  }

  const hostname = window.location.hostname
  const port = window.location.port

  // localhost:3000 또는 localhost:3001인지 확인
  const isTargetPort = (hostname === 'localhost' || hostname === '127.0.0.1') && 
                       (port === '3000' || port === '3001')

  if (!isTargetPort) {
    return
  }

  // MCP 브라우저 연결을 위한 메타 정보 추가
  // (실제 연결은 Cursor IDE의 MCP 서버가 처리)
  console.log(`[MCP Browser] localhost:${port}에 연결되었습니다.`)
  console.log('[MCP Browser] MCP 브라우저 도구를 사용하여 콘솔, 네트워크 등을 확인할 수 있습니다.')
  
  // 개발 환경에서 MCP 브라우저 연결을 위한 플래그 설정
  if (typeof window !== 'undefined') {
    ;(window as any).__MCP_BROWSER_ENABLED__ = true
    ;(window as any).__MCP_BROWSER_PORT__ = port
  }
}

