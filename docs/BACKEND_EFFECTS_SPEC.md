# 백엔드 인코딩용 전환·움직임 효과 명세

프론트(PixiJS/TypeScript)와 **동일한 수식**으로 Python 백엔드에서 전환 효과·움직임 효과를 구현할 때 참고하는 문서입니다.  
코드 위치와 수식만 정리했으므로, 이 명세만으로도 동일하게 포팅 가능합니다.

---

## 1. 공통: 진행률(progress)과 이징(easing)

### 1.1 진행률 클램프

- **수식**: `progress = max(0, min(1, rawProgress))`
- **용도**: 모든 효과에서 진행률을 0~1로 고정할 때 사용.

### 1.2 이징 함수 (Easing)

진행률 `t` (0~1)를 넣었을 때 이징된 값 반환.  
**움직임 효과(Motion)**에서만 사용하며, **전환 효과(Transition)**는 아래 1.3의 고정 이징만 사용.

| 타입 | 수식 |
|------|------|
| `linear` | `t` |
| `ease-in` | `t * t` |
| `ease-out` | `1 - (1-t)*(1-t)` |
| `ease-in-out` | `t < 0.5 ? 2*t*t : 1 - (-2*t+2)**2 / 2` |
| `ease-out-cubic` | `1 - (1-t)**3` |
| `ease-in-cubic` | `t**3` |

### 1.3 전환 효과용 이징 (고정)

- **수식**: `eased = 1 - (1 - progress)**3` (ease-out-cubic)
- **적용**: 모든 **전환 효과(Transition)**에 동일 적용.  
  프론트 참조: `useProTransportRenderer.ts` 내 `applySceneStartTransition`, `useTransitionEffects.ts` 내 `applyDirectTransition`.

---

## 2. 전환 효과 (Transition) — 씬 A → 씬 B

- **의미**: 이전 씬(from)과 다음 씬(to) 사이 전환.  
  `progress = 0` → 이전 씬만 보임, `progress = 1` → 다음 씬만 보임.
- **진행률**: `progress = (t - transitionStartTime) / transitionDuration`, 클램프 0~1.
- **이징**: 위 1.3 적용 후 `eased`로 아래 수식 사용.

### 2.1 지원 타입 및 수식

**공통 변수**

- `to`: 다음 씬 프레임(이미지/비디오)의 **기본** 상태 (x, y, width, height, rotation, alpha).
- `from`: 이전 씬 프레임의 **기본** 상태 (없으면 생략).
- `eased`: 0~1, 위 1.3 적용값.
- `stageWidth`, `stageHeight`: 스테이지(캔버스) 크기.

| 효과 | to 프레임 | from 프레임 (있을 때) |
|------|-----------|------------------------|
| **none** | alpha=1, 나머지 기본값 | alpha=0 |
| **fade** | alpha = eased | alpha = 1 - eased |
| **slide-left** | x = toBaseX + offset*(1-eased), offset = max(stageW,stageH)*0.1 | x = fromBaseX - offset*eased |
| **slide-right** | x = toBaseX - offset*(1-eased) | x = fromBaseX + offset*eased |
| **slide-up** | y = toBaseY + offset*(1-eased) | y = fromBaseY - offset*eased |
| **slide-down** | y = toBaseY - offset*(1-eased) | y = fromBaseY + offset*eased |
| **zoom-in** | width = toBaseW*(0.5+0.5*eased), height = toBaseH*(0.5+0.5*eased), alpha = eased | alpha = 1 - eased |
| **zoom-out** | width = toBaseW*(1.5-0.5*eased), height = toBaseH*(1.5-0.5*eased), alpha = eased | alpha = 1 - eased |
| **rotate** | rotation = toBaseRotation - 2*π*(1-eased), alpha = eased | rotation = fromBaseRotation + 2*π*eased, alpha = 1 - eased |
| **blur** | alpha=1, blur 강도 = 30*(1-eased) (선형, 끝에서 0) | alpha = 1 - eased |
| **glitch** | x = toBaseX + jitter, jitter = (1-eased)*8*sin(progress*40), alpha = eased | x = fromBaseX - jitter, alpha = 1 - eased |
| **circle** | alpha=1, 원형 마스크 반지름 = maxR*eased, maxR = sqrt(toW²+toH²)*0.6 | alpha = 1 - eased |

- **ripple / wave / circular**: 프론트에서는 shader 또는 별도 구현일 수 있음.  
  위 목록에 없는 타입은 우선 `fade`와 동일하게 처리하거나, 프론트 shader 코드를 추가로 공유받아 포팅하는 것이 좋습니다.

### 2.2 전환 타이밍

- `transitionStartTime`: 해당 씬의 시작 시점(초).
- `transitionDuration`: 씬 설정값 (기본 0.5초).
- 매 프레임(또는 인코딩 시 각 타임스탬프 t)에서  
  `progress = clamp((t - transitionStartTime) / transitionDuration)`  
  계산 후 위 수식으로 to/from 프레임의 위치·크기·회전·알파(·블러 등)를 적용하면 됩니다.

---

## 3. 움직임 효과 (Motion) — 씬 내 이미지 애니메이션

- **의미**: 한 씬 안에서 이미지가 슬라이드/줌/회전/페이드 등으로 움직임.
- **진행률**:  
  `elapsed = sceneLocalT - motion.startSecInScene`  
  `progress = clamp(elapsed / motion.durationSec)`  
  (sceneLocalT = 씬 시작을 0으로 한 로컬 시간)
- **활성 구간**: `elapsed >= -0.001` 그리고 `elapsed <= motion.durationSec + 0.001` 일 때만 효과 적용, 그 외에는 baseState 유지.
- **이징**: 위 1.2의 `motion.easing` 타입으로 `progress`에 적용한 값을 `eased`로 사용.

### 3.1 Motion 설정 구조 (타입)

```ts
// 프론트 타입 참고: hooks/video/effects/motion/types.ts
MotionConfig = {
  type: 'slide-left'|'slide-right'|'slide-up'|'slide-down'|'zoom-in'|'zoom-out'|'rotate'|'fade',
  startSecInScene: number,  // 씬 내 시작 시점(초)
  durationSec: number,
  easing: 'linear'|'ease-in'|'ease-out'|'ease-in-out'|'ease-out-cubic'|'ease-in-cubic',
  params: {
    direction?: 'left'|'right'|'up'|'down',  // slide 보조
    distance?: number,   // 슬라이드 거리(픽셀), 기본 100
    scaleFrom?: number, scaleTo?: number,   // zoom, 기본 1, 1.5 등
    rotationFrom?: number, rotationTo?: number,  // 도 단위, 기본 0, 360
    alphaFrom?: number, alphaTo?: number     // fade, 기본 0, 1
  }
}
```

### 3.2 수식 (MotionEvaluator와 동일)

- **baseState**: 효과 적용 전 이미지 상태 (x, y, scaleX, scaleY, rotation, alpha).  
  프론트에서는 Fabric(편집) 기준 위치/스케일을 사용.

**slide-left / slide-right / slide-up / slide-down**

- 슬라이드는 "반대 방향에서 원래 위치로 오는" 방향.
- `distance = params.distance ?? 100`
- slide-left: `x = baseX + distance * (1 - eased)`  
  slide-right: `x = baseX - distance * (1 - eased)`  
  slide-up: `y = baseY + distance * (1 - eased)`  
  slide-down: `y = baseY - distance * (1 - eased)`  
  (direction이 있으면 type 대신 direction으로 위와 같이 매핑)

**zoom-in / zoom-out**

- zoom-in:  
  `fromScale = baseScale * (scaleFrom || 0.8)`, `toScale = baseScale * scaleTo`  
  `scale = fromScale + (toScale - fromScale) * eased`
- zoom-out:  
  `fromScale = baseScale * (scaleFrom || 1.2)`, `toScale = baseScale * scaleTo`  
  `scale = fromScale + (toScale - fromScale) * eased`  
  (baseScale은 baseState.scaleX / scaleY)

**rotate**

- `rotationRad = (rotationFrom + (rotationTo - rotationFrom) * eased) * (π/180)`  
  `rotation = baseRotation + rotationRad`

**fade**

- `alpha = alphaFrom + (alphaTo - alphaFrom) * eased`

---

## 4. 프론트 코드 위치 (참고용)

| 항목 | 파일 경로 |
|------|-----------|
| 전환 progress + 수식 (Pro 트랙) | `apps/bukae_creator/app/video/create/pro/step3/hooks/playback/useProTransportRenderer.ts` — `applySceneStartTransition` |
| 전환 직접 수식 (공용) | `apps/bukae_creator/hooks/video/renderer/transitions/useTransitionEffects.ts` — `applyDirectTransition` |
| 움직임 수식 | `apps/bukae_creator/hooks/video/effects/motion/MotionEvaluator.ts` |
| 이징 | `apps/bukae_creator/hooks/video/effects/motion/easing.ts` |
| Motion 타입/파라미터 | `apps/bukae_creator/hooks/video/effects/motion/types.ts` |
| 전환 효과 타입 목록 | `apps/bukae_creator/hooks/video/types/effects.ts`, `lib/data/transitions.ts` |

---

## 5. Python 포팅 시 체크리스트

1. **진행률**: 전환은 `(t - transitionStart) / duration` 클램프; 움직임은 `(sceneLocalT - startSecInScene) / durationSec` 클램프.
2. **이징**: 전환은 `1 - (1-p)**3` 고정; 움직임은 설정된 easing 테이블 적용.
3. **전환**: to/from 두 프레임에 대해 위 2.1 표의 수식만 적용하면 동일 시각.
4. **움직임**: baseState + MotionEvaluator 수식으로 매 프레임 위치/스케일/회전/알파 계산.
5. **blur/circle/glitch**: 블러 강도·원형 마스크 반지름·jitter 수식만 맞추면 됨.  
   shader 기반 ripple/wave/circular는 별도 shader 코드 또는 수식 공유 후 포팅 가능.

이 명세와 위 파일들을 함께 전달하면, 백엔드에서 전환·움직임 효과를 최대한 똑같이 구현할 수 있습니다.
