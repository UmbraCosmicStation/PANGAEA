import type { SortMode } from '../../types/config';
import type { Tablet } from '../../types/schema';
import { tabletSizeBytes } from '../../types/schema';
import { RUNE_STATUSES, RUNE_TYPES } from '../../types/runes';

/**
 * 섬 내부 블록 정렬 (기획서 §4.6, §4.7)
 * 산/활성도/최신: 점수 높은 판 → 그리드 중앙. 상태별/유형별: 룬 그룹핑(행 우선).
 */

export interface BlockPlacement {
  tabletId: string;
  col: number;
  row: number;
}

export interface IslandGrid {
  cols: number;
  rows: number;
  placements: BlockPlacement[];
}

/** 섬 그리드 치수: cols = ceil(sqrt(n × 1.15)) (기획서 §4.4) */
export function islandGridDims(tabletCount: number): { cols: number; rows: number } {
  if (tabletCount <= 0) return { cols: 0, rows: 0 };
  const cols = Math.ceil(Math.sqrt(tabletCount * 1.15));
  const rows = Math.ceil(tabletCount / cols);
  return { cols, rows };
}

/**
 * 1D spiral-center: 가장 큰 값을 중앙 인덱스, 나머지 좌우 교대 (기획서 §4.6).
 * 내림차순 정렬된 입력을 가정하지 않음 — 내부에서 정렬.
 */
export function spiralCenterOrder<T>(items: T[], score: (item: T) => number): T[] {
  const sorted = [...items].sort((a, b) => score(b) - score(a));
  const n = sorted.length;
  const result: T[] = new Array(n);
  const center = Math.floor((n - 1) / 2);
  let offset = 0;
  for (let i = 0; i < n; i++) {
    // i=0 → center, i=1 → center+1, i=2 → center-1, i=3 → center+2 ...
    if (i === 0) {
      result[center] = sorted[i]!;
    } else if (i % 2 === 1) {
      offset += 1;
      result[center + offset] = sorted[i]!;
    } else {
      result[center - offset] = sorted[i]!;
    }
  }
  return result;
}

/** 그리드 셀을 중앙으로부터의 거리 오름차순으로 나열 (2D 산 배치용) */
export function cellsByCenterDistance(cols: number, rows: number): Array<[number, number]> {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cells.push([c, r]);
  }
  cells.sort((a, b) => {
    const da = (a[0] - cx) ** 2 + (a[1] - cy) ** 2;
    const db = (b[0] - cx) ** 2 + (b[1] - cy) ** 2;
    if (da !== db) return da - db;
    // 결정적 타이브레이크: 행 → 열
    return a[1] - b[1] || a[0] - b[0];
  });
  return cells;
}

function scoreOf(tablet: Tablet, mode: SortMode, activityById: ReadonlyMap<string, number>): number {
  switch (mode) {
    case 'mountain':
      return tabletSizeBytes(tablet);
    case 'activity':
      return activityById.get(tablet.id) ?? 0;
    case 'recent':
      return new Date(tablet.createdAt).getTime();
    default:
      return 0;
  }
}

function groupKeyIndex(tablet: Tablet, mode: SortMode): number {
  if (mode === 'status') return RUNE_STATUSES.indexOf(tablet.status);
  if (mode === 'type') return RUNE_TYPES.indexOf(tablet.type);
  return 0;
}

/**
 * 섬 내부 블록 배치. 동일 입력 → 동일 배치 (결정적, QA #4).
 */
export function layoutIslandBlocks(
  tablets: Tablet[],
  mode: SortMode,
  activityById: ReadonlyMap<string, number> = new Map(),
): IslandGrid {
  const { cols, rows } = islandGridDims(tablets.length);
  if (tablets.length === 0) return { cols, rows, placements: [] };

  if (mode === 'status' || mode === 'type') {
    // 룬 그룹핑: 그룹 순서 → 그룹 내 용량 내림차순, 행 우선 채움
    const sorted = [...tablets].sort((a, b) => {
      const g = groupKeyIndex(a, mode) - groupKeyIndex(b, mode);
      if (g !== 0) return g;
      const s = tabletSizeBytes(b) - tabletSizeBytes(a);
      if (s !== 0) return s;
      return a.id.localeCompare(b.id);
    });
    return {
      cols,
      rows,
      placements: sorted.map((t, i) => ({
        tabletId: t.id,
        col: i % cols,
        row: Math.floor(i / cols),
      })),
    };
  }

  // 산/활성도/최신: 점수 내림차순 → 중앙 가까운 셀부터 배정
  const sorted = [...tablets].sort((a, b) => {
    const s = scoreOf(b, mode, activityById) - scoreOf(a, mode, activityById);
    if (s !== 0) return s;
    return a.id.localeCompare(b.id);
  });
  const cells = cellsByCenterDistance(cols, rows);
  return {
    cols,
    rows,
    placements: sorted.map((t, i) => ({
      tabletId: t.id,
      col: cells[i]![0],
      row: cells[i]![1],
    })),
  };
}
