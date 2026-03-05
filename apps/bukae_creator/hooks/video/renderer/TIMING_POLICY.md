# 렌더링 타이밍 정책 (단일 기준)

Step3(Pro) 미리보기는 아래 기준 하나로 맞춘다.

---

## 1. 기준: "오디오(세그먼트) = tSec = 씬 경계 = 전환 시작"

- transport 시간 `tSec`, 오디오 세그먼트, 씬 시작 시점, 전환 시작 시점은 모두 **TTS duration 합산 타임라인**을 사용한다.
- transition 길이/scene gap은 씬 시작 시점 계산에 더하지 않는다.

즉:

- 씬 i 시작 = `sum(TTS[0] .. TTS[i-1])`
- 전환(i-1 -> i) 시작 = `sum(TTS[0] .. TTS[i-1])`

---

## 2. 구현 위치

| 용도 | 파일 | 내용 |
|------|------|------|
| 씬 경계 계산 | `app/video/create/pro/step3/utils/segmentDuration.ts` | `resolvePlayableSegmentAtTime`의 `sceneStartTime`이 TTS 기준 시작 시점 |
| Pro 씬 해석 | `app/video/create/pro/step3/utils/proPlaybackUtils.ts` | `resolveProSceneAtTime`가 `sceneStartTime`, `sceneTimeInSegment` 반환 |
| 전환 활성/진행률 계산 | `app/video/create/pro/step3/utils/transitionFrameState.ts` | 시작 버퍼 포함 전환 활성 여부와 progress 계산 |
| 실제 전환 적용 | `app/video/create/pro/step3/hooks/playback/useProTransportRenderer.ts` | `applySceneStartTransition`에서 스프라이트 전환 적용 |
| 오디오 세그먼트 | `hooks/video/audio/useTtsTrack.ts` | `buildSegmentsFromTimeline`이 TTS duration 누적으로 세그먼트 생성 |

---

## 3. 한 프레임 밀림 방지

- 전환 시작 경계에서 부동소수점/프레임 지연으로 `relativeTime`이 잠깐 음수가 될 수 있다.
- 이를 위해 시작 버퍼 `0.02s`(약 1~2프레임)를 사용한다.
- 진행률 계산은 `Math.max(0, relative / duration)`로 음수 진행률을 0으로 고정한다.

---

## 4. 움직임 전환에서 이전 씬 리셋 금지

- 움직임 전환(`slide-*`, `zoom-*`)에서는 이전 씬 스프라이트를 base transform으로 매 프레임 리셋하지 않는다.
- 이렇게 해야 이전 씬의 마지막 움직임 상태가 유지되어 전환 시작 시 "한 프레임 되돌아감"이 발생하지 않는다.

---

## 5. UI 시크 타임라인은 별도

- UI 표시용 `timeline.ts`의 `getSceneStartTime`은 렌더 경계 계산의 source of truth가 아니다.
- 렌더/전환 계산은 항상 Pro Step3 세그먼트 기반(`segmentDuration`/`proPlaybackUtils`)을 사용한다.
