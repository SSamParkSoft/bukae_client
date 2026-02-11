# Step3 구조 가이드

Step3 코드는 아래 2가지 축으로 분리합니다.

- 트랙 축: `shared` / `fast` / `pro`
- 레이어 축: `ui` / `hooks` / `model`

## 폴더 의미

- `shared/*`: fast/pro 모두가 재사용하는 코드
- `fast/step3/*`: fast 전용 코드
- `pro/step3/*`: pro 전용 코드
- `ui/*`: React 컴포넌트
- `hooks/*`: 상태, 재생, 렌더링, 이벤트 로직
- `model/*`: 타입/순수 유틸/도메인 계산

## 경계 규칙

- fast는 pro를 직접 import 하지 않습니다.
- pro는 fast를 직접 import 하지 않습니다.
- shared는 fast/pro를 직접 import 하지 않습니다.
- `_step3-components`, `_hooks/step3`, `_utils/step3` 경로는 신규 코드에서 사용하지 않습니다.

## 레거시 브릿지

아래 경로는 하위 호환용 re-export이며 `@deprecated` 입니다.

- `app/video/create/_step3-components/index.ts`
- `app/video/create/_hooks/step3/index.ts`
- `app/video/create/_utils/step3/index.ts`
