#!/bin/bash

# 개발 서버 시작
next dev -p 3000 &
SERVER_PID=$!

# 서버가 준비될 때까지 대기 (최대 30초)
echo "서버 시작 대기 중..."
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "서버가 준비되었습니다. Chrome 브라우저를 엽니다..."
    open -a "Google Chrome" http://localhost:3000
    break
  fi
  sleep 1
done

# 서버 프로세스가 종료될 때까지 대기
wait $SERVER_PID
