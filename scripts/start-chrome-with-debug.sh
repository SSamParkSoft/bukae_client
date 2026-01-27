#!/bin/bash

# Chrome을 원격 디버깅 포트로 시작하는 스크립트

# 기존 Chrome 프로세스 확인
CHROME_PID=$(pgrep -f "Google Chrome" | head -1)

if [ -n "$CHROME_PID" ]; then
  echo "Chrome이 이미 실행 중입니다. 원격 디버깅을 활성화하려면:"
  echo "1. Chrome에서 chrome://inspect#remote-debugging 접속"
  echo "2. 'Discover network targets' 활성화"
  exit 0
fi

# Chrome을 원격 디버깅 포트로 시작
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-debug-profile" \
  http://localhost:3000/video/create/step3 &

echo "Chrome이 원격 디버깅 포트 9222로 시작되었습니다."
echo "Chrome DevTools MCP가 이 포트를 통해 연결할 수 있습니다."
