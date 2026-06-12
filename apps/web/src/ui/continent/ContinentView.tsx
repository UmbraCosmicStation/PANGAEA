import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Scan, Search, SunMoon, X } from 'lucide-react';
import { timeEnv, zoomToFit, type SortMode, type TimeMode } from '@pangaea/core';
import { useTabletStore } from '../../state/tabletStore';
import { useLandStore } from '../../state/landStore';
import { useUiStore } from '../../state/uiStore';
import { useToastStore } from '../../state/toastStore';
import { useSearchStore } from '../../state/searchStore';
import { OceanCanvas } from '../ocean/OceanCanvas';
import { buildScene, isoBounds } from './continentLayout';
import {
  drawScene,
  hitTest,
  labelPosition,
  type Camera,
  type RevealState,
} from './continentDraw';
import { DetailPanel } from './DetailPanel';
import { NewTabletFab } from './NewTabletFab';
import { Dropdown } from '../components/Dropdown';
import { Glass } from '../components/Glass';

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'mountain', label: '산 (용량)' },
  { value: 'activity', label: '활성도' },
  { value: 'recent', label: '최신' },
  { value: 'status', label: '상태별' },
  { value: 'type', label: '유형별' },
];

function currentHour(mode: TimeMode): number {
  if (mode === 'day') return 13;
  if (mode === 'night') return 22;
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

/** 대륙 뷰 — 앱의 홈 (M1-C1~C8) */
export function ContinentView() {
  const navigate = useNavigate();
  const tablets = useTabletStore((s) => s.tablets);
  const activityLog = useTabletStore((s) => s.activityLog);
  const lands = useLandStore((s) => s.lands);
  const settings = useUiStore((s) => s.settings);
  const selectedId = useUiStore((s) => s.selectedTabletId);
  const select = useUiStore((s) => s.select);
  const highlightIds = useSearchStore((s) => s.highlightIds);

  const [camera, setCamera] = useState<Camera>({ zoom: 1, panX: 0, panY: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hourTick, setHourTick] = useState(0);
  const [reveal, setReveal] = useState<RevealState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const hour = useMemo(
    () => currentHour(settings.timeMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.timeMode, hourTick],
  );

  // 1분마다 시간 갱신 (시스템 연동 시 조명이 흐른다)
  useEffect(() => {
    const t = setInterval(() => setHourTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // 밤이면 글래스 UI 틴트 전환 (기획서 §4.8.1 — UI 틴트)
  useEffect(() => {
    const night = timeEnv(hour).nightness > 0.5;
    document.documentElement.dataset.mode = night ? 'night' : 'day';
  }, [hour]);

  const scene = useMemo(() => {
    const activityOf = useTabletStore.getState().activityOf;
    return buildScene([...lands.values()], [...tablets.values()], settings.sortMode, activityOf);
    // activityLog 변경 시 색이 바뀌어야 하므로 의존성에 포함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lands, tablets, settings.sortMode, activityLog]);

  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const bb = isoBounds(scene.bounds);
    const { zoom, panX, panY } = zoomToFit(bb, el.clientWidth, el.clientHeight);
    setCamera({ zoom: Math.max(0.35, Math.min(zoom, 4)), panX, panY });
  }, [scene.bounds]);

  // 첫 진입 시 줌 핏
  const fittedRef = useRef(false);
  useEffect(() => {
    if (!fittedRef.current && scene.blocks.length >= 0) {
      fit();
      fittedRef.current = true;
    }
  }, [fit, scene.blocks.length]);

  // 첫 섬 솟아오르기 연출 (M1-E3, 0.8초 + 안개 걷힘)
  useEffect(() => {
    const landId = useUiStore.getState().pendingRevealLandId;
    if (!landId) return;
    useUiStore.getState().setPendingReveal(null);
    let raf = 0;
    const start = performance.now();
    const DURATION = 800;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setReveal({ landId, t });
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setReveal(null);
        const show = useToastStore.getState().show;
        show('첫 번째 땅이 솟아올랐습니다 🏝', 'success', 3000);
        setTimeout(() => show('🗿 더 기록하면 대륙이 자랍니다', 'info', 3500), 1500);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 캔버스 리사이즈 + 다시 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawScene(ctx, scene, cameraRef.current, {
        hour,
        selectedId,
        hoveredId,
        reveal,
        highlightIds,
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [scene, camera, hour, selectedId, hoveredId, reveal, highlightIds]);

  // 휠 줌 (커서 기준, passive:false 필요)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setCamera((cam) => {
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const zoom = Math.max(0.35, Math.min(4, cam.zoom * factor));
        const k = zoom / cam.zoom;
        return { zoom, panX: mx - (mx - cam.panX) * k, panY: my - (my - cam.panY) * k };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // 팬(드래그) + 관성 + 클릭/더블클릭 판별
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;
    let vx = 0;
    let vy = 0;
    let inertiaRaf = 0;
    let lastClickAt = 0;
    let lastClickTarget: string | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      cancelAnimationFrame(inertiaRaf);
      dragging = true;
      moved = false;
      lastX = e.clientX;
      lastY = e.clientY;
      vx = 0;
      vy = 0;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        if (moved) {
          vx = dx;
          vy = dy;
          setCamera((cam) => ({ ...cam, panX: cam.panX + dx, panY: cam.panY + dy }));
        }
        lastX = e.clientX;
        lastY = e.clientY;
      } else {
        const rect = el.getBoundingClientRect();
        const hit = hitTest(scene, cameraRef.current, e.clientX - rect.left, e.clientY - rect.top);
        setHoveredId(hit?.tabletId ?? null);
        el.style.cursor = hit ? 'pointer' : 'grab';
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        // 관성
        const decay = () => {
          vx *= 0.92;
          vy *= 0.92;
          if (Math.abs(vx) + Math.abs(vy) < 0.5) return;
          setCamera((cam) => ({ ...cam, panX: cam.panX + vx, panY: cam.panY + vy }));
          inertiaRaf = requestAnimationFrame(decay);
        };
        inertiaRaf = requestAnimationFrame(decay);
        return;
      }
      // 클릭: 선택 / 더블클릭: 에디터
      const rect = el.getBoundingClientRect();
      const hit = hitTest(scene, cameraRef.current, e.clientX - rect.left, e.clientY - rect.top);
      const now = performance.now();
      if (hit && hit.tabletId === lastClickTarget && now - lastClickAt < 350) {
        navigate(`/edit/${hit.tabletId}`);
        return;
      }
      lastClickAt = now;
      lastClickTarget = hit?.tabletId ?? null;
      useUiStore.getState().select(hit?.tabletId ?? null);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(inertiaRaf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
  }, [scene, navigate]);

  // 단축키: Ctrl+0 줌핏, Escape 선택해제 (M1 — 기획서 §4.9.6)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        fit();
      } else if (e.key === 'Escape') {
        select(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fit, select]);

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const mx = el.clientWidth / 2;
    const my = el.clientHeight / 2;
    setCamera((cam) => {
      const zoom = Math.max(0.35, Math.min(4, cam.zoom * factor));
      const k = zoom / cam.zoom;
      return { zoom, panX: mx - (mx - cam.panX) * k, panY: my - (my - cam.panY) * k };
    });
  };

  const cycleTimeMode = () => {
    const order: TimeMode[] = ['system', 'day', 'night'];
    const next = order[(order.indexOf(settings.timeMode) + 1) % order.length]!;
    void useUiStore.getState().updateSettings({ timeMode: next });
  };

  const selected = selectedId ? (tablets.get(selectedId) ?? null) : null;
  const showLabels = settings.showLabels && camera.zoom >= 0.5;

  return (
    <div ref={containerRef} className="relative h-full touch-none select-none overflow-hidden">
      <OceanCanvas hour={hour} />
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* 토지 라벨 (DOM 오버레이, M1-C6) */}
      {showLabels &&
        scene.islands.map((island) => {
          const pos = labelPosition(camera, island.x, island.y);
          return (
            <div
              key={island.landId}
              className="pointer-events-none absolute whitespace-nowrap font-serif-kr text-xs font-bold text-text-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
              style={{ left: pos.x, top: pos.y, opacity: island.type === 'archive' ? 0.5 : 1 }}
            >
              {island.name}
              {island.pinned && <span className="text-accent"> ★</span>}
              {camera.zoom >= 0.7 && (
                <span className="ml-1 font-sans font-normal text-text-2">
                  {island.tabletCount}판
                </span>
              )}
            </div>
          );
        })}

      {/* 상단 바 */}
      <header className="glass-bar absolute inset-x-0 top-0 z-20 flex h-12 items-center gap-2 border-b border-(--glass-border) px-3">
        <span className="font-display text-sm font-bold tracking-[0.25em] text-text-1">
          PANGAEA
        </span>
        <div className="flex-1" />
        <button
          className="glass spring rounded-lg p-1.5 text-text-2 transition-colors hover:text-text-1"
          onClick={() => useSearchStore.getState().setOpen(true)}
          title="검색 (Ctrl+K)"
        >
          <Search size={16} />
        </button>
        <Dropdown
          value={settings.sortMode}
          options={SORT_OPTIONS}
          onChange={(sortMode) => void useUiStore.getState().updateSettings({ sortMode })}
        />
        <button
          className="glass spring rounded-lg p-1.5 text-text-2 transition-colors hover:text-text-1"
          onClick={cycleTimeMode}
          title={`시간: ${settings.timeMode === 'system' ? '시스템 연동' : settings.timeMode === 'day' ? '항상 낮' : '항상 밤'}`}
        >
          <SunMoon size={16} />
        </button>
      </header>

      {/* 줌 컨트롤 */}
      <Glass className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-1 rounded-xl p-1.5 lg:bottom-14">
        <button className="p-1 text-text-2 hover:text-text-1" onClick={() => zoomBy(1.3)} aria-label="줌 인">
          <Plus size={16} />
        </button>
        <button className="p-1 text-text-2 hover:text-text-1" onClick={fit} aria-label="줌 핏">
          <Scan size={16} />
        </button>
        <button className="p-1 text-text-2 hover:text-text-1" onClick={() => zoomBy(1 / 1.3)} aria-label="줌 아웃">
          <Minus size={16} />
        </button>
        <span className="font-mono text-[10px] text-text-2">{Math.round(camera.zoom * 100)}%</span>
      </Glass>

      {/* 검색 하이라이트 해제 칩 (M2-A4) */}
      {highlightIds && (
        <button
          className="glass absolute left-1/2 top-14 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-accent"
          onClick={() => useSearchStore.getState().clearHighlight()}
        >
          검색 결과 {highlightIds.size}개 표시 중 <X size={13} />
        </button>
      )}

      {/* 범례 */}
      <Glass className="absolute bottom-16 left-3 z-20 hidden items-center gap-2 rounded-lg px-3 py-1.5 sm:flex lg:bottom-3">
        <span className="text-[10px] text-text-2">조용</span>
        <span
          className="h-1.5 w-16 rounded-full"
          style={{
            background: 'linear-gradient(to right, rgb(95,158,105), rgb(220,205,58), rgb(225,68,42))',
          }}
        />
        <span className="text-[10px] text-text-2">활발 · 1칸=1판 · 높이=용량</span>
      </Glass>

      <NewTabletFab />

      {selected && <DetailPanel tablet={selected} onClose={() => select(null)} />}
    </div>
  );
}
