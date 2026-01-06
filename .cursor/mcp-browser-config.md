# MCP Browser 자동 연결 설정

## localhost:3000 및 localhost:3001 자동 연결

개발 환경에서 localhost:3000과 localhost:3001에 접속할 때 Chrome DevTools MCP가 자동으로 연결되도록 설정합니다.

### 설정 방법

1. Cursor IDE에서 MCP 브라우저 서버가 활성화되어 있어야 합니다.
2. 개발 서버 시작 시 자동으로 브라우저가 연결됩니다.

### 포트별 연결

- **localhost:3000**: bukae_creator 앱 (메인 앱)
- **localhost:3001**: bukae_viewer 앱 (뷰어 앱)

### 개발 서버 시작

```bash
# bukae_creator (포트 3000)
cd apps/bukae_creator
pnpm dev

# bukae_viewer (포트 3001)  
cd apps/bukae_viewer
pnpm dev
```

### MCP 브라우저 연결 확인

MCP 브라우저가 자동으로 연결되면 다음 명령어로 확인할 수 있습니다:
- `browser_snapshot`: 현재 페이지 스냅샷 확인
- `browser_console_messages`: 콘솔 메시지 확인
- `browser_network_requests`: 네트워크 요청 확인

