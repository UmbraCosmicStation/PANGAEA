import { create } from 'zustand';
import {
  createLand,
  DOCK_LAND_ID,
  PRESET_LANDS,
  type Land,
  type LandId,
} from '@pangaea/core';
import { getStorage } from '../data/storage';

/** 토지(Land) 스토어 (M1-A2c) */

interface LandState {
  lands: Map<LandId, Land>;
  loaded: boolean;

  loadAll: () => Promise<void>;
  /** 부두(Dock)가 없으면 생성 — 온보딩/부트스트랩에서 호출 */
  ensureDock: () => Promise<void>;
  createFromPreset: (presetIds: string[]) => Promise<void>;
  create: (name: string) => Promise<Land>;
  update: (id: LandId, patch: Partial<Omit<Land, 'id' | 'createdAt'>>) => Promise<void>;
  /** 토지 삭제 = 기록보관 (기획서 §15.2 — 즉시 삭제 금지) */
  archive: (id: LandId) => Promise<void>;
}

export const useLandStore = create<LandState>((set, get) => ({
  lands: new Map(),
  loaded: false,

  loadAll: async () => {
    const lands = await getStorage().listLands();
    set({ lands: new Map(lands.map((l) => [l.id, l])), loaded: true });
  },

  ensureDock: async () => {
    if (get().lands.has(DOCK_LAND_ID)) return;
    const dock = createLand({ id: DOCK_LAND_ID, name: '부두', type: 'dock' });
    await getStorage().writeLand(dock);
    set((s) => ({ lands: new Map(s.lands).set(dock.id, dock) }));
  },

  createFromPreset: async (presetIds) => {
    const storage = getStorage();
    const lands = new Map(get().lands);
    for (const presetId of presetIds) {
      const preset = PRESET_LANDS.find((p) => p.id === presetId);
      if (!preset || lands.has(preset.id)) continue;
      const land = createLand({ id: preset.id, name: preset.name });
      await storage.writeLand(land);
      lands.set(land.id, land);
    }
    set({ lands });
  },

  create: async (name) => {
    const land = createLand({ name });
    await getStorage().writeLand(land);
    set((s) => ({ lands: new Map(s.lands).set(land.id, land) }));
    return land;
  },

  update: async (id, patch) => {
    const prev = get().lands.get(id);
    if (!prev) return;
    if (prev.type === 'dock' && patch.type) return; // 부두는 타입 전환 불가 (기획서 §2.4)
    const next: Land = { ...prev, ...patch, id, updatedAt: new Date().toISOString() };
    await getStorage().writeLand(next);
    set((s) => ({ lands: new Map(s.lands).set(id, next) }));
  },

  archive: async (id) => {
    if (id === DOCK_LAND_ID) return; // 부두 삭제 불가
    await get().update(id, { type: 'archive' });
  },
}));
