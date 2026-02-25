# Pro Step3 Hooks 캐시 가이드

이 디렉토리의 캐시는 모두 **런타임 메모리(ref/Map)** 기반입니다.

## 사용처

### `useProStep3Container.ts`
- TTS 캐시
  - `ttsCacheRef: Map<string, { blob, durationSec, url }>`
  - 목적: 동일 대사/보이스 조합의 재합성 방지, duration 재활용
- 비디오 리소스 캐시
  - `videoTexturesRef: Map<number, PIXI.Texture>`
  - `videoElementsRef: Map<number, HTMLVideoElement>`
  - 목적: 씬 전환 시 비디오 텍스처 재생성 최소화
- 오디오 참조 캐시
  - `ttsAudioRefsRef: Map<number, HTMLAudioElement>`

## 왜 필요한가

- Step3 편집/미리보기 중 실시간 반응성 확보
- 씬 이동/재생 시 불필요한 리소스 재생성 감소

## 정리 정책

- 언마운트 시 URL revoke + Map clear로 메모리 해제
- 이 캐시는 localStorage에 저장하지 않음 (세션 경계 보장)
