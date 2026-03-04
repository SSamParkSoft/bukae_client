#Supabase 임시 스토리지 자동 정리 (GitHub Actions + Cleanup API)

# 목적

Supabase 스토리지의 **pro_upload**, **media** 두 버킷에 올라간 임시 파일을 **생성 시점 기준 1시간이 지나면 자동 삭제**한다. Next.js API가 Supabase Storage API로 삭제하고, **GitHub Actions가 1시간마다 그 API를 호출**하는 구조로 운영한다.

# 아키텍처

1. **Next.js API**
    - `/api/videos/pro/cleanup` → `pro_upload` 버킷 정리
    - `/api/media/cleanup` 또는 `/api/images/cleanup` → `media`(또는 `images`) 버킷 정리
    - 공통: `handleStorageBucketCleanup` — 버킷 스캔 후 1시간 지난 파일만 삭제
2. **보안**
    - 각 Cleanup API는 헤더 `x-admin-secret` 로 보호
    - 환경 변수: `ADMIN_PRO_UPLOAD_CLEANUP_SECRET`, `ADMIN_MEDIA_CLEANUP_SECRET`(또는 `ADMIN_IMAGES_CLEANUP_SECRET`)
3. **스케줄러**
    - **Private GitHub 레포** 하나에서 Actions 워크플로 정의
    - 1시간마다 두 Cleanup API를 POST 호출
    - 시크릿은 레포 Settings → Secrets and variables → Actions 에 저장

# 사전 준비

- Supabase에 `pro_upload`, `media`(또는 `images`) 버킷 존재
- Next API 및 해당 환경 변수 설정 완료
- 배포된 서비스 URL이 외부에서 접근 가능

# GitHub 레포 설정

1. Private 레포 생성 (예: `bukae-scheduler`)
2. 배포 없이 Actions만 사용
3. Secrets 추가:
    - `ADMIN_PRO_UPLOAD_CLEANUP_SECRET`
    - `ADMIN_MEDIA_CLEANUP_SECRET` (또는 `ADMIN_IMAGES_CLEANUP_SECRET`)

# 워크플로 예시

`.github/workflows/storage-cleanup.yml`:

```yaml
name: Supabase Storage Cleanup

on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: pro_upload cleanup
        run: |
          curl -X POST \
            -H "x-admin-secret: ${{ secrets.ADMIN_PRO_UPLOAD_CLEANUP_SECRET }}" \
            https://YOUR_DOMAIN/api/videos/pro/cleanup

      - name: media cleanup
        run: |
          curl -X POST \
            -H "x-admin-secret: ${{ secrets.ADMIN_MEDIA_CLEANUP_SECRET }}" \
            https://YOUR_DOMAIN/api/media/cleanup
```

- `cron: '0 * * * *'` = 매 정시(1시간마다)
- `YOUR_DOMAIN` 을 실제 배포 도메인으로 변경
- media 대신 images 사용 시 URL을 `/api/images/cleanup` 으로 변경

# 확인 방법

- Actions 탭에서 `Run workflow` 로 수동 실행 후 로그에서 curl 응답 확인
- 응답 예: `{ "success": true, "scanned": N, "deleted": M }`
- Supabase Storage 콘솔에서 1시간 지난 파일이 사라졌는지 확인

# 문제 시 체크

- `x-admin-secret` 값이 Next 환경 변수와 일치하는지
- API URL/경로가 맞는지
- 버킷 이름이 API에서 사용하는 이름과 일치하는지