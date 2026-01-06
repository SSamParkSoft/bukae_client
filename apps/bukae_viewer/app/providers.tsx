'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState, useEffect } from 'react'
import { initMcpBrowserHelper } from '@/lib/utils/mcp-browser-helper'

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  
  // 개발 환경에서 MCP 브라우저 헬퍼 초기화
  useEffect(() => {
    initMcpBrowserHelper()
  }, [])
  
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

