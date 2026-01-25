# PHASE 0 — Step 3 편집기급 재생(Transport) 고도화

> 목표: 현재 Step 3(미리보기/편집)의 타임라인 문제(Seek/Pause/Resume 비결정성)를 해결하고, **TTS 다중 세그먼트 + 비디오 트랙**까지 확장 가능한 "편집기급" 재생 엔진(Transport)을 구축한다.

---

## 0. 범위(Scope)

### In-scope (PHASE 0)
- Step 3 재생/정지/이동(seek) 동작을 **타임라인 시간 `t`(sec)** 중심으로 재설계
- TTS 오디오를 **여러 파일(세그먼트)로 구성된 단일 연속 트랙**으로 취급하여 정확히 동기화
- 렌더링(Pixi/GSAP)은 `renderAt(t)` 방식으로 **결정적(deterministic)** 으로 동작
- QA/QC용 최소 도구(플레이헤드 표시, step, 현재 활성 세그먼트 표시, 마커)

### Out-of-scope (다음 단계)
- 사용자 비디오 편집 Proxy 생성(Phase 2)
- QC용 서버 프록시 프리뷰 렌더(Phase 3)
- WebCodecs/WASM/MSE 도입(Phase 4)

---

## 1. 문제 정의(현재 증상)

### 증상 A — 타임라인 클릭 후 재생 시작 위치 불일치
- 타임라인을 눌러 재생하면 **클릭한 위치가 아니라** 특정 TTS 파일의 재생지점/경계에서 시작

### 증상 B — 일시정지/재생 재개가 "그 자리"를 보존하지 못함
- 일시정지 시 현재 프레임/오디오 위치를 유지하지 못하고 **TTS 세그먼트 종료 지점으로 점프**

> 위 두 증상은 공통적으로 "재생 기준 클럭"과 "세그먼트 스케줄링"이 파일 단위/이벤트 기반으로 동작하면서 타임라인 `t`와 분리되어 있기 때문에 발생한다.

---

## 2. PHASE 0의 핵심 원칙

1) **Single Source of Truth = 타임라인 시간 `t`(sec)**
- UI 플레이헤드, 오디오, 애니메이션, 자막/오버레이는 모두 동일한 `t`를 기준으로 계산한다.

2) **오디오(WebAudio)를 마스터 클럭으로 사용**
- 재생 중 시간은 `AudioContext.currentTime` 기반으로 계산한다.
- 화면 렌더(Pixi/GSAP)는 항상 `t`를 입력받아 `renderAt(t)`로 그린다.

3) **TTS는 "파일 N개"가 아니라 "연속 트랙"**
- 세그먼트 테이블 `{startSec, durationSec, url, ...}` 기반으로 현재 `t`에 대응하는 세그먼트를 선택하여 정확한 offset으로 재생한다.

4) **Pause/Seek는 상태 머신으로 결정적으로 처리**
- pause 시 현재 `t`를 저장하고 모든 오디오 소스를 stop하되, 상태가 진행(ended)되지 않도록 한다.

---

## 3. 목표 동작(정의)

### 3.1 Seek
- 타임라인을 클릭하여 `seek(t)`를 호출하면:
  - 플레이헤드는 즉시 `t`로 이동
  - (재생 중이면) 오디오/효과는 `t` 기준으로 즉시 재스케줄
  - (일시정지 상태면) 정지된 상태에서 해당 프레임을 표시

### 3.2 Pause
- `pause()` 호출 시:
  - **현재 `t`를 저장**
  - 오디오 재생(모든 세그먼트 소스)을 stop
  - 화면은 `t` 위치에서 고정

### 3.3 Resume
- `play()` 호출 시:
  - 저장된 `t`에서 정확히 재개
  - TTS는 `t`에 해당하는 세그먼트를 찾아 offset으로 시작

---

## 4. 제안 구현 아키텍처(PHASE 0)

### 4.1 모듈 구성
- `Transport` : 편집기 재생 엔진(단일 클럭/상태)
- `TtsTrack` : 세그먼트 테이블 + 오디오 버퍼 로딩/스케줄러
- `RendererAdapter` : `renderAt(t)` 실행(Pixi/GSAP 제어)
- `TimelineUI` : 플레이헤드/마커/단축키/step

### 4.2 데이터 모델(초안)

```ts
export type TtsSegment = {
  id: string;
  url: string;
  startSec: number;      // 타임라인 기준 시작
  durationSec: number;
  sceneId?: string;
  textRange?: { start: number; end: number };
};

export type TransportState = {
  isPlaying: boolean;
  timelineOffsetSec: number;   // 일시정지/정지 시점의 t
  audioCtxStartSec: number;    // play() 시점의 audioContext.currentTime
  playbackRate: number;        // 1.0 기본
};
```

### 4.3 시간 계산(정의)

```ts
function getTimelineTimeSec(state: TransportState, audioCtxNowSec: number) {
  if (!state.isPlaying) return state.timelineOffsetSec;
  return state.timelineOffsetSec + (audioCtxNowSec - state.audioCtxStartSec) * state.playbackRate;
}
```

---

## 5. 구현 티켓(정확한 작업 단위)

> 아래 티켓은 “무엇을 만들고/바꾸고/삭제할지”를 코드 단위로 명확히 나눈 작업 목록이다.

### P0-T1. `Transport` 모듈/훅 도입

**목표**: Step 3의 모든 재생 상태를 단일 엔진으로 통합.

- 생성
  - `src/features/editor/transport/Transport.ts` (또는 기존 구조에 맞는 경로)
  - `src/features/editor/transport/useTransport.ts`

- 제공 API(필수)
  - `play()` / `pause()` / `seek(sec)` / `setRate(rate)` / `getTime()`
  - 이벤트/구독: `onTick(t)` 또는 `useSyncExternalStore` 기반 스토어

- 수용 기준(Acceptance)
  - `getTime()`이 재생/정지 상태에서 정의한 시간 계산 규칙을 따른다.
  - `seek()` 후 `getTime()`이 즉시 목표 t를 반환한다.

### P0-T2. `TtsTrack` 세그먼트 테이블 도입 + 스케줄러

**목표**: TTS 여러 파일을 “연속 트랙”으로 취급하여 t 기반으로 정확히 재생.

- 생성
  - `src/features/editor/audio/TtsTrack.ts`
  - `src/features/editor/audio/useTtsTrack.ts`

- 구현 요구사항
  - 입력: `segments: TtsSegment[]`
  - 기능
    - `preload(segments)` : URL → AudioBuffer 로딩(동시성 제한 포함)
    - `playFrom(tSec, transportAudioCtxTimeSec)` : `tSec`에 해당하는 세그먼트부터 스케줄
    - `stopAll()` : 현재 재생 중인 AudioBufferSourceNode 정리
    - `getActiveSegment(tSec)` : 현재 세그먼트/오프셋 반환(디버깅용)

- 스케줄링 전략(권장)
  - 재생 시작 시점에 “현재 세그먼트 + 다음 1~2개”를 미리 스케줄(lookahead)
  - `setInterval` 또는 `requestAnimationFrame` 기반의 lookahead loop

- 수용 기준(Acceptance)
  - 타임라인 `seek(t)` 시, 해당 t가 속한 세그먼트를 정확한 offset으로 재생한다.
  - `pause()` 후 `play()` 재개 시, 동일 t에서 이어진다(점프 없음).

### P0-T3. Step 3 훅/상태 통합(기존 훅 정리)

**목표**: `useTimelinePlayer`, `useTtsPreview`, `useFullPlayback` 등 분산된 재생 상태를 `Transport`로 일원화.

- 변경
  - `useTimelinePlayer`는 제거 또는 내부에서 `useTransport`로 위임
  - `useTtsPreview`는 `useTtsTrack`으로 대체
  - `useFullPlayback`는 `transportTimeSec`를 받아 Pixi/GSAP 렌더로직만 담당하도록 축소

- 수용 기준(Acceptance)
  - 재생 상태(source of truth)는 오직 `Transport`에서만 관리한다.
  - UI가 오디오/렌더 상태를 직접 조작하지 않는다(Transport API 호출만).

### P0-T4. 렌더러 `renderAt(t)` 표준화(결정성 확보)

**목표**: 동일한 t 입력에 대해 항상 동일한 프레임을 렌더.

- 변경
  - Pixi 렌더 루프를 “현재 시간 기반 update”에서 “t 기반 상태 계산”으로 전환
  - GSAP 애니메이션은 어댑터를 두어 `seek(t)` 및 `pause()`가 정확히 반영되도록 구성

- 수용 기준(Acceptance)
  - `seek(t)` 후 화면 프레임이 즉시 t에 맞게 업데이트된다.
  - `pause()` 시 화면이 그대로 정지한다(프레임 흔들림/점프 없음).

### P0-T5. QA/QC 도구(최소 세트) 추가

- 추가 UI
  - 플레이헤드 시간 표시(초+ms)
  - ±1프레임 step(기본 fps=30 가정), ±0.1초 step
  - 현재 활성 TTS 세그먼트 id + offset 표시
  - 씬 시작/끝, 전환 시작/끝 마커 표시

- 수용 기준(Acceptance)
  - QA가 특정 타임스탬프에서 play/pause/step으로 문제를 재현/확인할 수 있다.

### P0-T6. 자동화 테스트/회귀 방지(최소)

- 단위 테스트(권장)
  - `Transport.getTime()` 계산 테스트
  - `seek/pause/resume` 상태 머신 테스트
  - `TtsTrack.getActiveSegment(t)` 정확성 테스트

- 수용 기준(Acceptance)
  - 타임라인 회귀(점프/경계 재생)가 재발하지 않도록 핵심 로직에 테스트가 존재한다.

---

## 6. 권장 구현 세부(오디오)

### 6.1 WebAudio 기반 재생(권장 이유)
- `<audio>` 여러 개를 파일 단위로 교체하는 방식은 이벤트 타이밍/버퍼링/ended 처리로 인해 편집기급 결정성을 확보하기 어렵다.
- AudioBuffer + AudioBufferSourceNode 스케줄링은 seek/pause/resume을 "t" 기준으로 강제하기 용이하다.

### 6.2 스케줄러 의사코드

```ts
// playFrom(tSec) 호출 시
// 1) 현재 세그먼트 찾기
// 2) 현재 세그먼트는 offset부터 재생
// 3) 다음 세그먼트 1~2개 미리 start 예약

function scheduleFrom(tSec: number, startAtAudioCtx: number) {
  stopAll();

  let { segIndex, offsetInSeg } = findSegmentAt(tSec);
  let when = startAtAudioCtx;

  for (let i = segIndex; i < segments.length && i < segIndex + 3; i++) {
    const seg = segments[i];
    const buffer = bufferMap.get(seg.id);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = playbackRate;

    const offset = (i === segIndex) ? offsetInSeg : 0;
    const dur = seg.durationSec - offset;

    src.connect(masterGain);
    src.start(when, offset, dur);
    activeSources.push(src);

    when += dur / playbackRate;
  }
}
```

---

## 7. 완료 기준(Definition of Done)

PHASE 0는 아래 조건이 만족되면 완료로 본다.

- [ ] 타임라인 클릭(Seek) 시 **항상 클릭 위치에서** 재생이 시작된다.
- [ ] Pause 시 **그 자리에서** 멈추고 Resume 시 **그 자리에서** 이어진다.
- [ ] TTS가 여러 파일로 분리되어 있어도 재생 위치가 세그먼트 경계에 끌려가지 않는다.
- [ ] 프리뷰 렌더는 `renderAt(t)`로 동작하며, 동일 t에 대해 동일 프레임을 재현할 수 있다.
- [ ] QA/QC 도구(시간 표시, step, 활성 세그먼트/오프셋 표시)가 존재한다.

---

## 8. 다음 단계로의 연결(Phase 2 준비 포인트)

PHASE 0 완료 후, 사용자 비디오 편집을 위한 Phase 2에 즉시 연결할 수 있도록 아래를 준비한다.

- `Composition Spec` v1 초안(트랙/클립/효과/오디오 믹스) 수립
- `VideoTrack` 인터페이스를 `Transport` 기준으로 설계
  - `syncTo(tSec)` / `seekClip(tSec)` 형태로 확장 가능하도록

