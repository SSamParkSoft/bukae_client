#!/bin/bash
# Vercel Build Check Script
# 각 앱이 독립적으로 배포되도록 변경된 파일을 확인합니다.
# 사용법: bash scripts/vercel-build-check.sh <viewer|creator>

APP_NAME=$1

if [ -z "$APP_NAME" ]; then
  echo "Error: App name is required"
  echo "Usage: $0 <viewer|creator>"
  exit 1
fi

# Vercel 환경에서 실행 중인지 확인
if [ -z "$VERCEL" ]; then
  # 로컬 테스트 모드 - 항상 빌드
  echo "Local test mode: Building $APP_NAME"
  exit 0
fi

# Git이 사용 가능한지 확인
if ! command -v git &> /dev/null; then
  echo "Git not found: Building $APP_NAME (fallback)"
  exit 0
fi

# 현재 커밋과 이전 커밋 비교
# Vercel에서는 HEAD와 HEAD^를 비교하거나, 이전 배포와 비교할 수 있습니다
PREVIOUS_SHA="HEAD^"
CURRENT_SHA="HEAD"

# 이전 커밋이 존재하는지 확인
if ! git rev-parse "$PREVIOUS_SHA" &> /dev/null; then
  # 첫 커밋이거나 비교할 이전 커밋이 없으면 빌드
  echo "No previous commit found: Building $APP_NAME"
  exit 0
fi

# 변경된 파일 목록 가져오기
CHANGED_FILES=$(git diff --name-only "$PREVIOUS_SHA" "$CURRENT_SHA" 2>/dev/null)

if [ -z "$CHANGED_FILES" ]; then
  # 변경된 파일이 없으면 스킵 (이론적으로는 발생하지 않아야 함)
  echo "No changed files: Skipping $APP_NAME build"
  exit 1
fi

# 앱별 관련 경로 확인
if [ "$APP_NAME" = "viewer" ]; then
  # viewer 관련 파일이 변경되었는지 확인
  if echo "$CHANGED_FILES" | grep -qE "^apps/bukae_viewer/"; then
    echo "Building viewer: apps/bukae_viewer/ files changed"
    # Ignored Build Step에서는 0이 스킵, 1이 빌드 진행
    exit 1
  fi
  
  # 공유 패키지 변경 확인
  if echo "$CHANGED_FILES" | grep -qE "^packages/shared/"; then
    echo "Building viewer: packages/shared/ files changed"
    exit 1
  fi
  
  # 루트 설정 파일 변경 확인 (의존성 변경 등)
  if echo "$CHANGED_FILES" | grep -qE "^package\.json$|^pnpm-workspace\.yaml$|^pnpm-lock\.yaml$|^tsconfig\.json$"; then
    echo "Building viewer: root config files changed"
    exit 1
  fi
  
  # viewer 관련 파일이 변경되지 않았으면 스킵
  echo "Skipping viewer build: No relevant files changed"
  exit 0

elif [ "$APP_NAME" = "creator" ]; then
  # creator 관련 파일이 변경되었는지 확인
  if echo "$CHANGED_FILES" | grep -qE "^apps/bukae_creator/"; then
    echo "Building creator: apps/bukae_creator/ files changed"
    # Ignored Build Step에서는 0이 스킵, 1이 빌드 진행
    exit 1
  fi
  
  # 공유 패키지 변경 확인
  if echo "$CHANGED_FILES" | grep -qE "^packages/shared/"; then
    echo "Building creator: packages/shared/ files changed"
    exit 1
  fi
  
  # 루트 설정 파일 변경 확인
  if echo "$CHANGED_FILES" | grep -qE "^package\.json$|^pnpm-workspace\.yaml$|^pnpm-lock\.yaml$|^tsconfig\.json$"; then
    echo "Building creator: root config files changed"
    exit 1
  fi
  
  # creator 관련 파일이 변경되지 않았으면 스킵
  echo "Skipping creator build: No relevant files changed"
  exit 0

else
  echo "Error: Unknown app name: $APP_NAME"
  echo "Valid app names: viewer, creator"
  exit 1
fi

