import { create } from 'zustand';
import {
  computeActivity,
  createTablet,
  dateKey,
  pruneActivityLog,
  recordEdit,
  recordView,
  tabletSizeBytes,
  type ActivityEntry,
  type LandId,
  type Tablet,
  type TabletId,
  type TabletMeta,
} from '@pangaea/core';
import { getStorage } from '../data/storage';

/**
 * 판(Tablet) 스토어 (M1-A2c)
 * 액션 흐름: Domain 함수 → Storage → 상태 갱신 (기획서 §16.0)
 */

function today(): string {
  return dateKey(Date.now(), new Date().getTimezoneOffset());
}

interface TabletState {
  tablets: Map<TabletId, Tablet>;
  /** 오늘의 활성도 로그 (tabletId → entry) */
  activityLog: Map<TabletId, ActivityEntry>;
  loaded: boolean;

  loadAll: () => Promise<void>;
  create: (args: { title: string; landId: LandId; wardPath?: string; body?: string }) => Promise<Tablet>;
  /** 본문 저장 — 활성도 edit 기록 + updatedAt 갱신 */
  saveBody: (id: TabletId, body: string) => Promise<void>;
  /** 메타(룬/태그/제목 등) 갱신 */
  updateMeta: (id: TabletId, patch: Partial<Omit<TabletMeta, 'id' | 'createdAt'>>) => Promise<void>;
  moveToLand: (id: TabletId, landId: LandId, wardPath?: string) => Promise<void>;
  remove: (id: TabletId) => Promise<void>;
  /** 열람 기록 (에디터/상세 패널 열기) */
  recordViewFor: (id: TabletId) => Promise<void>;
  /** 활성도 0~1 조회 */
  activityOf: (id: TabletId) => number;
}

async function persistActivity(log: Map<TabletId, ActivityEntry>): Promise<void> {
  await getStorage().writeJson('activity_log', [...log.values()]);
}

export const useTabletStore = create<TabletState>((set, get) => ({
  tablets: new Map(),
  activityLog: new Map(),
  loaded: false,

  loadAll: async () => {
    const storage = getStorage();
    const tablets = await storage.listTablets();
    const rawLog = (await storage.readJson<ActivityEntry[]>('activity_log')) ?? [];
    const pruned = pruneActivityLog(rawLog, today());
    set({
      tablets: new Map(tablets.map((t) => [t.id, t])),
      activityLog: new Map(pruned.map((e) => [e.tabletId, e])),
      loaded: true,
    });
  },

  create: async (args) => {
    const tablet = createTablet(args);
    await getStorage().writeTablet(tablet);
    set((s) => ({ tablets: new Map(s.tablets).set(tablet.id, tablet) }));
    return tablet;
  },

  saveBody: async (id, body) => {
    const prev = get().tablets.get(id);
    if (!prev) return;
    const charDelta = tabletSizeBytes({ body }) - tabletSizeBytes(prev);
    const next: Tablet = { ...prev, body, updatedAt: new Date().toISOString() };
    await getStorage().writeTablet(next);

    const entry = recordEdit(get().activityLog.get(id), {
      tabletId: id,
      today: today(),
      now: Date.now(),
      charDelta,
    });
    const activityLog = new Map(get().activityLog).set(id, entry);
    set((s) => ({ tablets: new Map(s.tablets).set(id, next), activityLog }));
    await persistActivity(activityLog);
  },

  updateMeta: async (id, patch) => {
    const prev = get().tablets.get(id);
    if (!prev) return;
    const next: Tablet = { ...prev, ...patch, id, updatedAt: new Date().toISOString() };
    await getStorage().writeTablet(next);
    set((s) => ({ tablets: new Map(s.tablets).set(id, next) }));
  },

  moveToLand: async (id, landId, wardPath) => {
    await get().updateMeta(id, { landId, wardPath });
  },

  remove: async (id) => {
    await getStorage().deleteTablet(id);
    set((s) => {
      const tablets = new Map(s.tablets);
      tablets.delete(id);
      return { tablets };
    });
  },

  recordViewFor: async (id) => {
    const entry = recordView(get().activityLog.get(id), {
      tabletId: id,
      today: today(),
      now: Date.now(),
    });
    const activityLog = new Map(get().activityLog).set(id, entry);
    set({ activityLog });
    await persistActivity(activityLog);
  },

  activityOf: (id) => computeActivity(get().activityLog.get(id), today()),
}));
