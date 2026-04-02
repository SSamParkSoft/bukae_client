import * as fabric from 'fabric'

export const FABRIC_HANDLE_STYLE = {
  transparentCorners: false,
  cornerColor: '#5e8790',
  cornerStrokeColor: '#ffffff',
  cornerSize: 12,
  cornerStyle: 'rect' as const,
  borderColor: '#5e8790',
  borderScaleFactor: 2,
  padding: 8,
}

// Step3 공통 Fabric 핸들 스타일
export function applyFabricObjectDefaults() {
  fabric.Object.prototype.set(FABRIC_HANDLE_STYLE)

  if (fabric.Object.prototype.controls?.mtr) {
    fabric.Object.prototype.controls.mtr.offsetY = -30
  }
}

// 공통 Fabric 컨트롤 가시성 정책
export function applyCornerControlPolicy(target: fabric.Object) {
  if (typeof (target as { setControlsVisibility?: (options: Record<string, boolean>) => void }).setControlsVisibility === 'function') {
    ;(target as { setControlsVisibility: (options: Record<string, boolean>) => void }).setControlsVisibility({
      mtr: false,
      tl: true,
      tr: true,
      bl: true,
      br: true,
      ml: false,
      mt: false,
      mr: false,
      mb: false,
    })
  }
}
