import { describe, expect, it } from 'vitest';
import {
  cellsByCenterDistance,
  islandGridDims,
  layoutIslandBlocks,
  spiralCenterOrder,
} from '../domain/land/sort';
import {
  boundingBox,
  layoutIslands,
  orderIslands,
  wardCapacity,
  zoomToFit,
} from '../domain/land/layout';
import { createTablet } from '../domain/tablet/create';
import type { Tablet } from '../types/schema';

function tabletWithSize(title: string, bytes: number): Tablet {
  return { ...createTablet({ title, landId: 'work', now: '2026-06-11T00:00:00Z' }), body: 'a'.repeat(bytes) };
}

describe('sort', () => {
  it('spiralCenterOrder: 가장 큰 값이 중앙 인덱스에 온다', () => {
    const result = spiralCenterOrder([1, 5, 3, 2, 4], (x) => x);
    expect(result[2]).toBe(5); // 5개 → center = 2
    expect(result).toHaveLength(5);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('islandGridDims: cols = ceil(sqrt(n × 1.15))', () => {
    expect(islandGridDims(10)).toEqual({ cols: 4, rows: 3 });
    expect(islandGridDims(1)).toEqual({ cols: 2, rows: 1 });
    expect(islandGridDims(0)).toEqual({ cols: 0, rows: 0 });
  });

  it('산 정렬: 가장 큰 판이 그리드 중앙에 가장 가까운 셀에 배치된다', () => {
    const tablets = [
      tabletWithSize('작음', 100),
      tabletWithSize('가장 큼', 50_000),
      tabletWithSize('중간', 5_000),
    ];
    const grid = layoutIslandBlocks(tablets, 'mountain');
    const biggest = grid.placements.find((p) => p.tabletId === tablets[1]!.id)!;
    const centerCell = cellsByCenterDistance(grid.cols, grid.rows)[0]!;
    expect([biggest.col, biggest.row]).toEqual(centerCell);
  });

  it('동일 입력 → 동일 배치 (결정적, QA #4)', () => {
    const tablets = [tabletWithSize('a', 10), tabletWithSize('b', 20), tabletWithSize('c', 30)];
    const g1 = layoutIslandBlocks(tablets, 'mountain');
    const g2 = layoutIslandBlocks(tablets, 'mountain');
    expect(g1).toEqual(g2);
  });

  it('상태별 정렬: status 그룹 순서대로 행 우선 배치', () => {
    const a = { ...tabletWithSize('a', 10), status: 'done' as const };
    const b = { ...tabletWithSize('b', 10), status: 'inbox' as const };
    const grid = layoutIslandBlocks([a, b], 'status');
    const posB = grid.placements.find((p) => p.tabletId === b.id)!;
    const posA = grid.placements.find((p) => p.tabletId === a.id)!;
    // inbox가 status 순서상 앞 → 먼저 배치
    expect(posB.row * grid.cols + posB.col).toBeLessThan(posA.row * grid.cols + posA.col);
  });
});

describe('island layout', () => {
  const lands = [
    { landId: 'big', tabletCount: 40, pinned: false, isDock: false },
    { landId: 'dock', tabletCount: 99, pinned: false, isDock: true },
    { landId: 'pinned-small', tabletCount: 2, pinned: true, isDock: false },
    { landId: 'small', tabletCount: 5, pinned: false, isDock: false },
  ];

  it('정렬: 핀 우선 → 판수 내림차순 → 부두 마지막', () => {
    const ordered = orderIslands(lands).map((l) => l.landId);
    expect(ordered).toEqual(['pinned-small', 'big', 'small', 'dock']);
  });

  it('행 래핑: 캔버스 폭을 넘으면 다음 행으로', () => {
    const placements = layoutIslands(lands, 400);
    const rows = new Set(placements.map((p) => p.y));
    expect(rows.size).toBeGreaterThan(1);
    // 섬끼리 겹치지 않는다
    for (const a of placements) {
      for (const b of placements) {
        if (a === b) continue;
        const overlap =
          a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    }
  });

  it('줌 핏: 모든 섬이 뷰포트 안에 들어온다 (QA #16)', () => {
    const placements = layoutIslands(lands, 2000);
    const bb = boundingBox(placements);
    const { zoom } = zoomToFit(bb, 800, 600);
    expect(bb.width * zoom).toBeLessThanOrEqual(800);
    expect(bb.height * zoom).toBeLessThanOrEqual(600);
    expect(zoom).toBeLessThanOrEqual(2.5);
  });

  it('가드레일: 40=혼잡, 50=초과 (기획서 §2.3)', () => {
    expect(wardCapacity(39)).toBe('ok');
    expect(wardCapacity(40)).toBe('crowded');
    expect(wardCapacity(50)).toBe('over');
  });
});
