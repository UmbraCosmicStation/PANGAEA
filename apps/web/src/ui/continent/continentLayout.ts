import {
  BLOCK_GAP,
  BLOCK_SIZE,
  blockHeight,
  boundingBox,
  DOCK_LAND_ID,
  ISLAND_PADDING,
  isoProject,
  layoutIslandBlocks,
  layoutIslands,
  tabletSizeBytes,
  type Land,
  type SortMode,
  type Tablet,
  type TabletId,
} from '@pangaea/core';

/**
 * 대륙 장면 합성 (M1-C2) — core 순수 함수들을 화면용 데이터로 조립.
 * 좌표계: 탑다운 월드(px) → isoProject → 아이소 월드 → 카메라(zoom/pan) → 화면.
 */

export interface SceneBlock {
  tabletId: TabletId;
  landId: string;
  /** 탑다운 월드 좌표 (블록 좌상단) */
  x: number;
  y: number;
  /** 블록 높이(px) */
  h: number;
  activity: number;
  /** 깊이 정렬 키 */
  depth: number;
}

export interface SceneIsland {
  landId: string;
  name: string;
  pinned: boolean;
  type: Land['type'];
  tabletCount: number;
  /** 탑다운 월드 사각형 */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Scene {
  blocks: SceneBlock[];
  islands: SceneIsland[];
  /** 탑다운 월드 바운딩 박스 */
  bounds: { x: number; y: number; width: number; height: number };
}

const CELL = BLOCK_SIZE + BLOCK_GAP;
const WORLD_WIDTH = 1500;

export function buildScene(
  lands: Land[],
  tablets: Tablet[],
  sortMode: SortMode,
  activityOf: (id: TabletId) => number,
): Scene {
  const byLand = new Map<string, Tablet[]>();
  for (const t of tablets) {
    const list = byLand.get(t.landId) ?? [];
    list.push(t);
    byLand.set(t.landId, list);
  }

  // 판 0개인 토지도 섬으로 표시 (빈 섬), 부두는 비어 있으면 숨김
  const inputs = lands
    .filter((l) => l.type !== 'dock' || (byLand.get(l.id)?.length ?? 0) > 0)
    .map((l) => ({
      landId: l.id,
      tabletCount: byLand.get(l.id)?.length ?? 0,
      pinned: l.pinned,
      isDock: l.id === DOCK_LAND_ID,
    }));

  const placements = layoutIslands(inputs, WORLD_WIDTH);
  const landById = new Map(lands.map((l) => [l.id, l]));
  const activityMap = new Map(tablets.map((t) => [t.id, activityOf(t.id)]));

  const blocks: SceneBlock[] = [];
  const islands: SceneIsland[] = [];

  for (const p of placements) {
    const land = landById.get(p.landId);
    if (!land) continue;
    const landTablets = byLand.get(p.landId) ?? [];
    islands.push({
      landId: p.landId,
      name: land.name,
      pinned: land.pinned,
      type: land.type,
      tabletCount: landTablets.length,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
    });

    const grid = layoutIslandBlocks(landTablets, sortMode, activityMap);
    const tabletById = new Map(landTablets.map((t) => [t.id, t]));
    for (const placement of grid.placements) {
      const tablet = tabletById.get(placement.tabletId);
      if (!tablet) continue;
      const x = p.x + ISLAND_PADDING + placement.col * CELL;
      const y = p.y + ISLAND_PADDING + placement.row * CELL;
      blocks.push({
        tabletId: tablet.id,
        landId: p.landId,
        x,
        y,
        h: blockHeight(tabletSizeBytes(tablet)),
        activity: activityMap.get(tablet.id) ?? 0,
        depth: x + y, // 아이소 깊이: sy = (x+y)/2 에 비례
      });
    }
  }

  blocks.sort((a, b) => a.depth - b.depth);
  return { blocks, islands, bounds: boundingBox(placements) };
}

/** 아이소 월드 바운딩 박스 (줌 핏용) — 탑다운 4꼭짓점을 투영 */
export function isoBounds(bounds: Scene['bounds']): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const corners = [
    isoProject(bounds.x, bounds.y),
    isoProject(bounds.x + bounds.width, bounds.y),
    isoProject(bounds.x, bounds.y + bounds.height),
    isoProject(bounds.x + bounds.width, bounds.y + bounds.height),
  ];
  const xs = corners.map((c) => c.sx);
  const ys = corners.map((c) => c.sy);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}
