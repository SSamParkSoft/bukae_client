#!/bin/bash
# 자동 빌드 오류 수정 스크립트
# pnpm build 실행 시 빌드 오류가 발생하면 자동으로 수정 후 재빌드

set -e

echo "🏗️ 빌드 시작..."

# 실제 빌드 명령 (무한 루프 방지를 위해 build:raw 사용)
BUILD_CMD="pnpm build:raw"

# 1차 빌드 시도
if $BUILD_CMD "$@" 2>&1; then
    echo ""
    echo "✅ 빌드 성공!"
    exit 0
fi

BUILD_FAILED=$?
echo ""
echo "⚠️ 빌드 실패. 자동 수정 시도 중..."
echo ""

# 자동 수정 플래그
FIXED=false

# 1. 린트 에러 자동 수정
echo "📝 린트 에러 수정 중..."
LINT_OUTPUT=$(pnpm lint --fix 2>&1 || true)
if echo "$LINT_OUTPUT" | grep -qE "fixed|Fixed|✖.*fixed"; then
    echo "  ✓ 린트 에러가 수정되었습니다"
    FIXED=true
else
    echo "  ℹ️ 수정할 린트 에러가 없습니다"
fi

# 2. TypeScript 타입 에러 확인 및 누락된 타입 패키지 설치
echo "🔍 TypeScript 에러 확인 중..."
TS_ERRORS=$(pnpm exec tsc --noEmit 2>&1 || true)

if echo "$TS_ERRORS" | grep -q "Cannot find module.*@types/"; then
    echo "📦 누락된 타입 패키지 설치 중..."
    MISSING_TYPES=$(echo "$TS_ERRORS" | grep -oP "Cannot find module.*@types/\K\w+" | sort -u || true)
    if [ -n "$MISSING_TYPES" ]; then
        for type in $MISSING_TYPES; do
            echo "  → @types/$type 설치 중..."
            pnpm add -D @types/$type || true
        done
        FIXED=true
        echo "  ✓ 타입 패키지가 설치되었습니다"
    fi
fi

# 수정된 내용이 있으면 재빌드
if [ "$FIXED" = true ]; then
    echo ""
    echo "🔄 수정된 내용으로 재빌드 중..."
    echo ""
    if $BUILD_CMD "$@" 2>&1; then
        echo ""
        echo "✅ 빌드 성공!"
        exit 0
    fi
    echo ""
    echo "⚠️ 재빌드 후에도 실패했습니다."
fi

# 여전히 실패하면 에러 표시
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ 빌드 실패 - 수동 확인이 필요합니다"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "빌드 로그를 확인하거나 수동으로 수정해주세요."
exit $BUILD_FAILED
