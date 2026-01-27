# Step 3 렌더링 표준 (Transport(t) + renderAt(t)) — Shader 기반 전환(Transition)

> 목적  
> - Step 3 미리보기/편집을 **편집기급(Seek/Pause/Resume 결정적)** 으로 안정화  
> - 전환효과(Transition)는 **Shader(픽셀 단위 합성)** 를 “표준”으로 채택  
> - Motion(움직임)은 **이미지(sprite)에만 적용**, 자막은 독립 처리  
> - 프리뷰와 서버(FFmpeg) 결과 차이를 줄이기 위한 **스펙/좌표계/정렬** 규칙 고정

---

## 0) 핵심 결론(한 줄)

- 시간의 정답은 `t` 하나(Transport)
- `renderAt(t)`는 같은 t에 대해 같은 프레임(결정성)
- Motion(이미지)은 수식 기반으로 t에서 즉시 계산
- Transition(씬↔씬)은 **Shader Pass**로 처리 (A/B 텍스처 + progress)
- 자막은 “박스(TextBox)+정렬”을 서버와 동일 의미로 계산, Motion 영향 없음

---

## 1) 전체 구조: “이중 루프” 유지 + 상태 업데이트는 Transport(t)만

### 1.1 PixiJS Ticker 루프 (그림만 담당)
- 매 프레임 `app.render()`
- 캔버스에 실제로 그리는 유일한 진입점
- 상태 업데이트/시간 계산 금지

### 1.2 Transport 루프 (상태만 담당)
- 재생 중 rAF 루프에서:
  - `t = transport.getTime()`
  - `renderAt(t)` 호출 → Pixi 객체 속성 업데이트
- 정지/일시정지/seek 시:
  - `renderAt(t)` 한 번 호출로 즉시 해당 프레임 표시

---

## 2) renderAt(t) 표준 파이프라인 (순서 고정)

`renderAt(t)`는 아래 순서로만 동작한다.

1) **씬/파트 계산**
- `sceneIndex`, `partIndex` 결정
- `sceneStartTime`, `sceneLocalT = t - sceneStartTime`

2) **리소스 준비(로드/캐시)**
- 필요한 sprite/text/폰트가 준비되지 않으면 preload 시작 후 return

3) **컨테이너 구성 보장**
- 현재 씬 container 존재 보장
- 전환 구간이면 이전 씬 container도 유지
- 전환 구간 밖에서만 이전 씬 정리

4) **Base State 리셋 (필수)**
- 누적 오차/상태 누수 방지
- 현재 씬 이미지(sprite) 기본값으로 리셋:
  - position / scale / rotation / alpha / visible / filters
- 전환 구간 밖이면 이전 씬도 정상 상태로 정리
- 자막은 별도 단계에서 최종 세팅(리셋 단계에서는 visible/alpha 최소만)

5) **Motion 적용 (이미지 전용)**
- `sceneLocalT`로 진행률 계산 → 즉시 값 세팅
- Motion은 이미지(sprite)에만 적용 (자막은 영향 없음)

6) **Transition 적용 (Shader Pass, 씬↔씬 전환)**
- 전환 구간에서만:
  - A(이전 씬) 텍스처, B(현재 씬) 텍스처 준비
  - `progress = clamp((t - transitionStart) / duration)`
  - Shader uniform에 progress 주입
  - “전환 전용 Quad”를 통해 최종 화면 출력
- 전환 구간 밖에서는 전환 pass 비활성화

7) **자막 적용 (Subtitle)**
- partIndex 기반 텍스트 렌더
- 서버와 동일 의미의 박스/정렬 계산
- 자막 애니메이션도 t 기반으로 평가(누적 금지)

8) **중복 렌더 스킵(옵션)**
- Motion/Transition이 없고 t가 동일하면 스킵 가능
- 단, seek 직후/편집 직후는 강제 렌더

---

## 3) Motion(이미지) — 수식 기반 표준(필수)

> 현재 요구사항: “움직임(슬라이드/확대/축소/회전)은 이미지에만 적용”

- Motion은 “play”가 아니라 t에서 즉시 계산:
  - `progress = clamp((sceneLocalT - motionStartSec) / motionDurationSec)`
  - `eased = easing(progress)`
- 결과를 sprite에 즉시 세팅:
  - x/y, scaleX/scaleY, rotation, alpha 등

권장 정책:
- 슬라이드/확대/축소/회전/페이드는 모두 수식 기반으로 통일
- GSAP는 Motion에 쓰지 않는 것을 1순위로 권장(결정성/서버 매핑 유리)

---

## 4) Transition(전환) — Shader 표준(핵심 변경점)

### 4.1 Shader 전환의 기본 형태
전환은 항상 다음 입력을 가진다:
- Texture A = 이전 씬의 화면(또는 씬 container 렌더 결과)
- Texture B = 현재 씬의 화면
- Uniform `progress` = 0..1 (Transport의 t로 계산)
- (옵션) Uniform `seed`, `noiseScale`, `center`, `softness`, `direction` 등

Shader는 “progress에 따라 A와 B를 픽셀 단위로 합성”한다.

### 4.2 전환 구현의 표준 아키텍처: RenderTexture A/B + Transition Quad
전환 구간에서만 다음을 수행:

1) **RenderTexture 캡처**
- A: 이전 씬 container를 RenderTexture로 렌더
- B: 현재 씬 container를 RenderTexture로 렌더

2) **Transition Quad 렌더**
- 화면 전체를 덮는 Quad(또는 Sprite)에 커스텀 Shader(Filter) 적용
- Shader 입력: A/B 텍스처 + progress
- 출력: 최종 화면

> 전환 구간 밖:
- Transition Quad 제거(또는 disabled)
- 현재 씬 container만 정상 렌더

### 4.3 Shader 전환을 renderAt(t)에 맞추는 규칙(절대 규칙)
- `.play()` 같은 시간 흐름은 금지
- 오직 `progress = (t - transitionStart)/duration`만이 전환의 시간
- seek/pause/resume은 progress만 재계산하면 즉시 동일 프레임 재현

### 4.4 추천 전환 목록(Shader로 구현)
- fade (A/B linear blend)
- wipe (좌→우/상→하/대각선) + softness
- circle wipe (center + radius + softness)
- glitch (noise + offset + RGB split)
- blur transition (progress 기반 blur + crossfade)
- mask/noise wipe (noise texture 기반)

---

## 5) GSAP 사용 규칙 (전환에서는 “불필요”가 기본)

이번 버전에서는 Transition을 Shader로 표준화하므로:
- 전환 연출은 원칙적으로 GSAP를 쓰지 않는다
- GSAP는 “UI 프리셋 편집기(파라미터 편집)” 같은 보조 용도로만 고려

> 만약 특정 전환에서 GSAP가 필요하면(예: progress 외 복합 파라미터 애니메이션):
- GSAP는 `.play()` 금지
- `renderAt(t)`에서 `relativeTime`으로 `seek`만 허용
- 단, 가능한 한 Shader uniform을 t로 직접 계산하는 것이 더 단순하고 결정적임

---

## 6) 자막(Subtitle) — 서버 의미와 동일하게 “박스+정렬”로 계산

### 6.1 자막은 TextBox(박스) + Align(정렬)이다
프론트가 저장/해석해야 하는 의미(Transform DTO):
- 원점: 좌상단(0,0)
- `x,y`: 박스의 Anchor(기준점) 좌표
- `width,height`: scale 적용 전 박스 크기
- `scaleX, scaleY`: 확대/축소
- `anchor.x, anchor.y`: (0..1) 박스 내 기준점 위치
- `hAlign`: left/center/right
- vAlign: 서버가 middle 고정이면 프론트도 middle 고정 권장

### 6.2 Anchor → Box Top-left 정규화(서버와 동일 의미)
- `Box_w = width * scaleX`
- `Box_h = height * scaleY`
- `Box_x = x - (Box_w * anchor.x)`
- `Box_y = y - (Box_h * anchor.y)`

### 6.3 박스 내부 정렬(서버와 동일 의미)
- 가로:
  - left:   `textX = Box_x`
  - center: `textX = Box_x + (Box_w - textWidth)/2`
  - right:  `textX = Box_x + Box_w - textWidth`
- 세로(서버 middle 고정):
  - `textY = Box_y + (Box_h - textHeight)/2`

### 6.4 자막 애니메이션도 t 기반 평가
- 예: 등장 1초 Slide Up(+30px)
  - `subtitleLocalT = t - subtitleStart`
  - `progress = clamp(subtitleLocalT / 1.0)`
  - `yOffset = (1 - eased(progress)) * 30`
  - `textY = alignedTextY + yOffset`
- 누적 업데이트 금지(이전 프레임 상태 참조 금지)

### 6.5 줄바꿈/메트릭 차이 가드레일
- 브라우저 vs FFmpeg 텍스트 렌더는 100% 동일하기 어렵다
- 1차 목표: 박스/정렬/좌표 의미를 동일하게 맞추기
- QC 단계에서 서버 프록시 프리뷰(저해상도)로 최종 확인 경로 확보 권장

---

## 7) 데이터 스펙(개념) — Motion/Transition/Subtitle

### 7.1 Motion(이미지) 스펙
- 대상: sceneIndex의 sprite
- 필드(개념):
  - type: slide | scale | rotate | fade | ...
  - startSecInScene, durationSec
  - easing
  - params: from/to 또는 방향+거리

### 7.2 Transition(씬) 스펙 — Shader 기반
- 대상: prevSceneIndex → sceneIndex
- 필드(개념):
  - type: shaderFade | shaderWipe | shaderCircle | shaderGlitch | ...
  - durationSec
  - easing
  - params: direction/center/softness/noiseScale/rgbSplitAmount 등
  - (옵션) noiseTextureId / maskTextureId

### 7.3 Subtitle(TextBox) 스펙
- transform DTO: `{x,y,width,height,scaleX,scaleY,anchor{x,y}}`
- style: fontFamily, fontSize, color, lineHeight, letterSpacing, stroke/shadow
- align: hAlign (+ vAlign은 middle 고정 권장)
- timing: startSec, durationSec, appearEffect
- content: partIndex 분할 정책(예: `|||`)

---

## 8) 운영/디버깅 체크리스트(QA/QC 필수)

- [ ] 플레이헤드 시간 표시(초+ms)
- [ ] ±1프레임 step(기본 30fps 가정) / ±0.1초 step
- [ ] 현재 활성 sceneIndex/partIndex 표시
- [ ] Motion 진행률(progress) 표시(이미지)
- [ ] Transition 진행률(progress) 표시 + 현재 Transition type 표시
- [ ] (옵션) 전환 디버그:
  - A/B RenderTexture 미리보기 토글
  - uniform 값(progress/softness/center) 표시
- [ ] (옵션) 자막 디버그:
  - Box_x, Box_y, Box_w, Box_h overlay
  - textX, textY overlay, anchor 표시점

---

## 9) 완료 기준(DoD)

- [ ] 타임라인 Seek 시 항상 클릭한 시간의 프레임이 즉시 렌더된다
- [ ] Pause/Resume이 “그 자리”를 보존한다
- [ ] 이미지 Motion(슬라이드/확대/축소/회전)이 t 기반으로 결정적으로 재현된다
- [ ] Transition(Shader) 전환 중에도 A/B 씬이 안정적으로 유지된다(검은 화면/깜빡임/누락 없음)
- [ ] 자막은 박스+정렬 규칙이 서버와 동일한 의미를 가진다(Anchor→TopLeft 정규화 포함)

---

## 10) 실무 우선순위(P0→P1)

### P0 (필수)
- Base State 리셋 단계 확립
- Motion(이미지) 수식 기반 표준화
- Transition Shader 파이프라인(Fade → Wipe → Circle 순) 구축
- 자막 박스/정렬(Anchor→TopLeft) 규칙 프리뷰 적용

### P1 (고도화)
- Glitch/Noise/Mask 기반 Shader 전환 추가
- Transition 파라미터(softness, center, noiseScale 등) UI 연동
- QC 단계 서버 프록시 프리뷰 도입(최종 일치 확인 경로)