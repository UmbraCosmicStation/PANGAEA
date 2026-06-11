import { create } from 'zustand';
import { DEFAULT_SETTINGS, type AppSettings, type TabletId } from '@pangaea/core';
import { getStorage } from '../data/storage';

/** UI 상태 스토어 — 줌/팬/선택/설정 (M1-A2c) */

interface UiState {
  // 대륙 뷰 카메라
  zoom: number;
  panX: number;
  panY: number;
  setCamera: (zoom: number, panX: number, panY: number) => void;

  // 선택
  selectedTabletId: TabletId | null;
  select: (id: TabletId | null) => void;

  // 설정
  settings: AppSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;

  // 온보딩
  onboarded: boolean;
  setOnboarded: (v: boolean) => Promise<void>;

  /** 판게아(공간) 이름 — 온보딩에서 설정 */
  spaceName: string;
  setSpaceName: (name: string) => Promise<void>;
}

export const useUiStore = create<UiState>((set, get) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  setCamera: (zoom, panX, panY) => set({ zoom, panX, panY }),

  selectedTabletId: null,
  select: (id) => set({ selectedTabletId: id }),

  settings: DEFAULT_SETTINGS,
  loadSettings: async () => {
    const storage = getStorage();
    const saved = await storage.readJson<Partial<AppSettings>>('settings');
    const onboarded = (await storage.readJson<boolean>('onboarded')) ?? false;
    const spaceName = (await storage.readJson<string>('space_name')) ?? '';
    set({ settings: { ...DEFAULT_SETTINGS, ...saved }, onboarded, spaceName });
  },
  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await getStorage().writeJson('settings', settings);
  },

  onboarded: false,
  setOnboarded: async (v) => {
    set({ onboarded: v });
    await getStorage().writeJson('onboarded', v);
  },

  spaceName: '',
  setSpaceName: async (name) => {
    set({ spaceName: name });
    await getStorage().writeJson('space_name', name);
  },
}));
