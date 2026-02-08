# 렌더링 타이밍 정책 (단일 기준)

**"뭐가 맞는지"** 에 대한 답: 아래 한 가지 기준만 맞추면 됩니다.

---

## 1. 기준: "오디오(세그먼트) = tSec = 씬 경계 = 전환 시작"

- **tSec(transport)** 과 **오디오 세그먼트** 는 **TTS duration만** 이어 붙인 타임라인을 씁니다. (transition/gap 없음)
- **렌더용 씬 경계** 도 같은 타임라인: **이전 씬들 TTS 합** = 다음 씬 시작.
- **전환(transition) 시작 시점** 도 동일: **이전 씬들 TTS 합** = 전환 시작. (gap 없음)

그래서:

- 씬 i 시작 = `sum(TTS(0) .. TTS(i-1))`
- 전환( i-1 → i ) 시작 = `sum(TTS(0) .. TTS(i-1))` (위와 동일)
- 세그먼트의 씬 i `startSec` = `sum(TTS(0) .. TTS(i-1))` (useTtsTrack과 동일)

**한 줄**: 모든 "시작 시점"은 **TTS duration만** 합산한 값 하나로 통일.

---

## 2. 구현 위치 (이걸로 맞춤)

| 용도 | 파일 | 내용 |
|------|------|------|
| 씬 경계(렌더) | `utils/timeline-render.ts` | `getSceneStartTimeFromTts`, `calculateSceneFromTime` → TTS 합만, transition/gap 없음 |
| 전환 시작 시점 | `utils/calculateTransitionTiming.ts` | `calculateTransitionStartTime` → TTS 합만, gap 없음 |
| 오디오 세그먼트 | `hooks/video/audio/useTtsTrack.ts` | `buildSegmentsFromTimeline` → `accumulatedTime += durationSec` 만 (이미 TTS만 사용) |

---

## 3. 타이밍 이슈 대응 (한 프레임 밀림 방지)

- **원인**: tSec이 경계를 넘는 그 한 프레임에 `relativeTime` 이 부동소수/지연으로 잠깐 음수가 되면, 전환 블록을 타지 않아 "돌아가는" 것처럼 보일 수 있음.
- **대응**: 전환을 **조금 일찍** 인식하도록 **시작 쪽 백버퍼** 사용.
  - `step6-applyTransition.ts`: `isTransitionActive` 시 `relativeTime >= -0.02` (약 1~2프레임)
  - `calculateTransitionTiming.ts`: `isTransitionInProgress` 도 동일하게 `relativeTime >= -0.02`
  - `progress` 는 `Math.max(0, relativeTime / transitionDuration)` 로 0 미만이면 0으로 유지.

---

## 4. 움직임 효과 시 "리셋" 하지 않기

- **step6**: 전환 시작 직후(progress < 0.01)에 **이전 씬 스프라이트**를 base로 리셋하는데, **움직임 효과(slide/zoom)** 일 때는 리셋하지 않음. (MOVEMENT_EFFECTS면 `resetBaseStateCallback` 호출 스킵)
- **step4**: 매 프레임 **현재 씬** base 리셋을 하는데, **전환 직전**(다음 씬 시작 − 0.05초 이내)이고 **다음 전환이 움직임 효과**일 때는 **현재 씬 스프라이트** 리셋만 스킵. (텍스트는 그대로 리셋)
- 그래서 현재 씬이 **움직임 끝난 위치**에서 그대로 다음 전환으로 넘어가고, step6에서도 이전 씬을 리셋하지 않아 슬라이드 아웃이 자연스럽게 이어짐.

---

## 5. UI/시크용은 예외

- **getSceneStartTime** (timeline.ts): 시크, 재생 구간, UI 표시용. `actualPlaybackDuration ?? scene.duration` + transition + gap 사용. **렌더 경계와는 별도**로 두고, 렌더 파이프라인에서는 사용하지 않음 (step1 → sceneStartTime 전달로 대체).

---

정리하면: **렌더/전환/오디오는 전부 "TTS 합만" 한 타임라인**이고, **그걸 쓰는 쪽이 맞는 것**입니다.
