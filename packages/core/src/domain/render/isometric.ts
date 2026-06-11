/**
 * 아이소메트릭 변환 (기획서 §4.3)
 */

export const ISO_COS = Math.cos(Math.PI / 6); // ≈ 0.866
export const ISO_SIN = 0.5;

export const BLOCK_HEIGHT_MIN = 2;
export const BLOCK_HEIGHT_MAX = 11;

/** 탑다운 좌표 (x, y) → 아이소메트릭 화면 좌표 (sx, sy) */
export function isoProject(x: number, y: number, scale = 1): { sx: number; sy: number } {
  return {
    sx: (x - y) * ISO_COS * scale,
    sy: (x + y) * ISO_SIN * scale,
  };
}

/** z-order (화가 알고리즘): y값이 큰 블록이 앞 (기획서 §4.3) */
export function zOrder(col: number, row: number, gridCols: number): number {
  return row * gridCols + col;
}

/** 블록 높이 = 2 + min(9, volume_kb / 20 × 9) (기획서 §4.3) */
export function blockHeight(sizeBytes: number): number {
  const kb = sizeBytes / 1024;
  return BLOCK_HEIGHT_MIN + Math.min(9, (kb / 20) * 9);
}
