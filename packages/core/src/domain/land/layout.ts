import { islandGridDims } from './sort';

/**
 * 섬 배치 알고리즘 — 가중 그리드 배치 (기획서 §4.4)
 */

export const BLOCK_SIZE = 18;
export const BLOCK_GAP = 1;
export const ISLAND_GAP = 54; // 블록 크기 × 3
export const ISLAND_PADDING = 4;
export const CANVAS_MARGIN = 48;

export interface IslandInput {
  landId: string;
  tabletCount: number;
  pinned: boolean;
  isDock: boolean;
}

export interface IslandPlacement {
  landId: string;
  /** 탑다운(논리) 좌표 px */
  x: number;
  y: number;
  width: number;
  height: number;
  cols: number;
  rows: number;
}

export function islandPixelDims(tabletCount: number): {
  cols: number;
  rows: number;
  width: number;
  height: number;
} {
  const { cols, rows } = islandGridDims(Math.max(tabletCount, 1));
  const cell = BLOCK_SIZE + BLOCK_GAP;
  return {
    cols,
    rows,
    width: cols * cell + ISLAND_PADDING * 2,
    height: rows * cell + ISLAND_PADDING * 2,
  };
}

/** 정렬: 핀 우선 → tablet_count 내림차순 → 부두는 항상 마지막 (기획서 §4.4) */
export function orderIslands(lands: IslandInput[]): IslandInput[] {
  return [...lands].sort((a, b) => {
    if (a.isDock !== b.isDock) return a.isDock ? 1 : -1;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.tabletCount !== b.tabletCount) return b.tabletCount - a.tabletCount;
    return a.landId.localeCompare(b.landId);
  });
}

/** 행 기반 래핑 배치. 동일 입력 → 동일 배치 (결정적). */
export function layoutIslands(lands: IslandInput[], canvasWidth: number): IslandPlacement[] {
  const ordered = orderIslands(lands);
  const placements: IslandPlacement[] = [];
  let cursorX = CANVAS_MARGIN;
  let cursorY = CANVAS_MARGIN;
  let maxRowHeight = 0;

  for (const land of ordered) {
    const dims = islandPixelDims(land.tabletCount);
    if (cursorX + dims.width > canvasWidth - CANVAS_MARGIN && cursorX > CANVAS_MARGIN) {
      cursorX = CANVAS_MARGIN;
      cursorY += maxRowHeight + ISLAND_GAP;
      maxRowHeight = 0;
    }
    placements.push({
      landId: land.landId,
      x: cursorX,
      y: cursorY,
      width: dims.width,
      height: dims.height,
      cols: dims.cols,
      rows: dims.rows,
    });
    cursorX += dims.width + ISLAND_GAP;
    maxRowHeight = Math.max(maxRowHeight, dims.height);
  }
  return placements;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function boundingBox(placements: IslandPlacement[]): BoundingBox {
  if (placements.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of placements) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.width);
    maxY = Math.max(maxY, p.y + p.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 줌 핏: 모든 섬이 화면에 들어오는 최적 줌 (최대 2.5x) */
export function zoomToFit(
  bb: BoundingBox,
  viewportW: number,
  viewportH: number,
  padding = 40,
): { zoom: number; panX: number; panY: number } {
  if (bb.width === 0 || bb.height === 0) return { zoom: 1, panX: 0, panY: 0 };
  const zoom = Math.min(
    (viewportW - padding * 2) / bb.width,
    (viewportH - padding * 2) / bb.height,
    2.5,
  );
  const panX = viewportW / 2 - (bb.x + bb.width / 2) * zoom;
  const panY = viewportH / 2 - (bb.y + bb.height / 2) * zoom;
  return { zoom, panX, panY };
}

/** 영역 수용량 가드레일 (기획서 §2.3) */
export const WARD_GUARDRAIL = { softLimit: 50, warnAt: 40 } as const;

export type WardCapacity = 'ok' | 'crowded' | 'over';

export function wardCapacity(directTabletCount: number): WardCapacity {
  if (directTabletCount >= WARD_GUARDRAIL.softLimit) return 'over';
  if (directTabletCount >= WARD_GUARDRAIL.warnAt) return 'crowded';
  return 'ok';
}
