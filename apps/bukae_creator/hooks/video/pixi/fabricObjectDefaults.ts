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

// Fast/Pro 공통 Fabric 핸들 스타일
export function applyFabricObjectDefaults() {
  fabric.Object.prototype.set(FABRIC_HANDLE_STYLE)

  if (fabric.Object.prototype.controls?.mtr) {
    fabric.Object.prototype.controls.mtr.offsetY = -30
  }
}
