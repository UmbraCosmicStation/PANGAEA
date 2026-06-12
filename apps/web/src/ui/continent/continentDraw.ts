import {
  activityColor,
  BLOCK_SIZE,
  blockShadow,
  isoProject,
  rgbToCss,
  sideColor,
  timeEnv,
} from '@pangaea/core';
import type { Scene, SceneBlock } from './continentLayout';

/**
 * 블록 캔버스 드로잉 + 히트 테스트 (M1-C1, C7, C8)
 */

export interface Camera {
  zoom: number;
  panX: number;
  panY: number;
}

function toScreen(cam: Camera, wx: number, wy: number): { sx: number; sy: number } {
  const iso = isoProject(wx, wy);
  return { sx: iso.sx * cam.zoom + cam.panX, sy: iso.sy * cam.zoom + cam.panY };
}

/** 블록의 아이소 상단면 4꼭짓점 (화면 좌표, lift = 높이만큼 위로) */
function topFace(cam: Camera, b: SceneBlock, lift: number) {
  const s = BLOCK_SIZE;
  const p1 = toScreen(cam, b.x, b.y);
  const p2 = toScreen(cam, b.x + s, b.y);
  const p3 = toScreen(cam, b.x + s, b.y + s);
  const p4 = toScreen(cam, b.x, b.y + s);
  const dy = lift * cam.zoom;
  return [
    { x: p1.sx, y: p1.sy - dy },
    { x: p2.sx, y: p2.sy - dy },
    { x: p3.sx, y: p3.sy - dy },
    { x: p4.sx, y: p4.sy - dy },
  ] as const;
}

export interface RevealState {
  landId: string;
  /** 0(바닷속) → 1(완전 등장) */
  t: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  cam: Camera,
  opts: {
    hour: number;
    selectedId: string | null;
    hoveredId: string | null;
    reveal?: RevealState | null;
    /** 검색 하이라이트 — 셋에 없는 블록은 디밍 (M2-A4) */
    highlightIds?: ReadonlySet<string> | null;
  },
): void {
  const env = timeEnv(opts.hour);
  const detailed = cam.zoom >= 0.7; // LOD: 0.7x 미만 = 색 덩어리 (M1-C8)
  const revealEase = opts.reveal ? easeOutCubic(opts.reveal.t) : 1;

  // 섬 테두리선 (반투명)
  for (const island of scene.islands) {
    const corners = [
      toScreen(cam, island.x, island.y),
      toScreen(cam, island.x + island.width, island.y),
      toScreen(cam, island.x + island.width, island.y + island.height),
      toScreen(cam, island.x, island.y + island.height),
    ];
    ctx.beginPath();
    ctx.moveTo(corners[0]!.sx, corners[0]!.sy);
    for (const c of corners.slice(1)) ctx.lineTo(c.sx, c.sy);
    ctx.closePath();
    ctx.strokeStyle = `rgba(255,255,255,${0.10 + env.illuminance * 0.08})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    // 섬 바닥 (옅은 해변색)
    ctx.fillStyle = `rgba(255,244,214,${0.05 + env.illuminance * 0.05})`;
    ctx.fill();
  }

  // 블록 (depth 순 정렬 가정 — 화가 알고리즘)
  for (const b of scene.blocks) {
    // 섬 등장 연출 (M1-E3): 해당 토지 블록이 바다에서 솟아오름
    const revealing = opts.reveal && b.landId === opts.reveal.landId;
    // 검색 디밍: 매치 블록만 밝게, 나머지 opacity 30% (기획서 §4.9.5)
    const dimmed = opts.highlightIds != null && !opts.highlightIds.has(b.tabletId);
    const alpha = (revealing ? revealEase : 1) * (dimmed ? 0.3 : 1);
    if (alpha < 1) ctx.globalAlpha = alpha;
    const heightScale = revealing ? revealEase : 1;

    const top = activityColor(b.activity, env.nightness);
    const side = sideColor(top);
    const faceTop = topFace(cam, b, b.h * heightScale);
    const faceBottom = topFace(cam, b, 0);

    // 그림자 (M1-C7 — 태양 위치 기반)
    if (detailed) {
      const shadow = blockShadow(b.h, opts.hour);
      if (shadow) {
        ctx.beginPath();
        ctx.moveTo(faceBottom[0].x + shadow.dx * cam.zoom, faceBottom[0].y + shadow.dy * cam.zoom);
        for (const p of faceBottom.slice(1)) {
          ctx.lineTo(p.x + shadow.dx * cam.zoom, p.y + shadow.dy * cam.zoom);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(0,0,0,${shadow.opacity})`;
        ctx.fill();
      }
    }

    if (detailed) {
      // 좌측면 (꼭짓점 4→3 아래)
      ctx.beginPath();
      ctx.moveTo(faceTop[3].x, faceTop[3].y);
      ctx.lineTo(faceTop[2].x, faceTop[2].y);
      ctx.lineTo(faceBottom[2].x, faceBottom[2].y);
      ctx.lineTo(faceBottom[3].x, faceBottom[3].y);
      ctx.closePath();
      ctx.fillStyle = rgbToCss(side);
      ctx.fill();

      // 우측면 (꼭짓점 1→2 아래) — 약간 더 어둡게
      ctx.beginPath();
      ctx.moveTo(faceTop[1].x, faceTop[1].y);
      ctx.lineTo(faceTop[2].x, faceTop[2].y);
      ctx.lineTo(faceBottom[2].x, faceBottom[2].y);
      ctx.lineTo(faceBottom[1].x, faceBottom[1].y);
      ctx.closePath();
      ctx.fillStyle = rgbToCss([
        Math.round(side[0] * 0.85),
        Math.round(side[1] * 0.85),
        Math.round(side[2] * 0.85),
      ]);
      ctx.fill();
    }

    // 상단면
    ctx.beginPath();
    ctx.moveTo(faceTop[0].x, faceTop[0].y);
    for (const p of faceTop.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    const hovered = opts.hoveredId === b.tabletId;
    ctx.fillStyle = hovered
      ? rgbToCss([
          Math.min(255, Math.round(top[0] * 1.2)),
          Math.min(255, Math.round(top[1] * 1.2)),
          Math.min(255, Math.round(top[2] * 1.2)),
        ])
      : rgbToCss(top);
    ctx.fill();

    // 선택 발광 (금색, M1-C5)
    if (opts.selectedId === b.tabletId) {
      ctx.save();
      ctx.shadowColor = 'rgba(240,201,92,0.9)';
      ctx.shadowBlur = 8 * cam.zoom;
      ctx.strokeStyle = '#F0C95C';
      ctx.lineWidth = Math.max(1.5, 1.5 * cam.zoom);
      ctx.stroke();
      ctx.restore();
    }

    if (alpha < 1) ctx.globalAlpha = 1;
  }

  // 안개 걷힘 (M1-E3): 등장 중인 섬 위에 흰 안개가 옅어진다
  if (opts.reveal) {
    const island = scene.islands.find((i) => i.landId === opts.reveal!.landId);
    if (island && revealEase < 1) {
      const center = toScreen(cam, island.x + island.width / 2, island.y + island.height / 2);
      const radius = Math.max(island.width, island.height) * cam.zoom * 1.2;
      const grad = ctx.createRadialGradient(center.sx, center.sy, 0, center.sx, center.sy, radius);
      const alpha = (1 - revealEase) * 0.65;
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(center.sx - radius, center.sy - radius, radius * 2, radius * 2);
    }
  }
}

/** 히트 테스트 — 앞(depth 큰 쪽)에서부터 상단면 다이아몬드 포함 여부 검사 */
export function hitTest(scene: Scene, cam: Camera, px: number, py: number): SceneBlock | null {
  for (let i = scene.blocks.length - 1; i >= 0; i--) {
    const b = scene.blocks[i]!;
    const face = topFace(cam, b, b.h);
    if (pointInPolygon(px, py, face)) return b;
    // 측면 영역도 대략 포함 (상단면~바닥면 사이)
    const bottom = topFace(cam, b, 0);
    const hull = [face[0], face[1], bottom[2], bottom[3]];
    if (pointInPolygon(px, py, hull)) return b;
  }
  return null;
}

function pointInPolygon(
  px: number,
  py: number,
  poly: ReadonlyArray<{ x: number; y: number }>,
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** 라벨 위치 — 섬 좌상단의 화면 좌표 (M1-C6, 라벨 오프셋 -20px) */
export function labelPosition(cam: Camera, islandX: number, islandY: number) {
  const { sx, sy } = toScreen(cam, islandX, islandY);
  return { x: sx, y: sy - 20 };
}
