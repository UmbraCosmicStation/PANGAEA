/** 뷰 모드 (기획서 §3.3) — M1은 isometric만 구현, 나머지는 M2+ */
export type ViewMode = 'isometric' | 'topdown' | 'quarter';

/** 바다 품질 (기획서 §4.8) */
export type OceanQuality = 'min' | 'mid' | 'max';

/** 시간 모드 (기획서 §4.8.1) */
export type TimeMode = 'system' | 'day' | 'night';

/** 대륙 정렬 모드 (기획서 §4.7) */
export type SortMode = 'mountain' | 'activity' | 'recent' | 'status' | 'type';

/** 대륙 테마 프리셋 (기획서 DS.2) */
export type OceanTheme = 'blue' | 'deep' | 'coral' | 'obsidian' | 'sunset';

export interface AppSettings {
  viewMode: ViewMode;
  oceanQuality: OceanQuality;
  timeMode: TimeMode;
  sortMode: SortMode;
  theme: OceanTheme;
  accentColor: string; // HEX
  showTotems: boolean;
  showMonoliths: boolean;
  showLabels: boolean;
  /** 자동 저장 간격(초). 0 = OFF */
  autosaveIntervalSec: 15 | 30 | 60 | 0;
  editorFontSizePx: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  viewMode: 'isometric',
  oceanQuality: 'mid',
  timeMode: 'system',
  sortMode: 'mountain',
  theme: 'blue',
  accentColor: '#F0C95C',
  showTotems: true,
  showMonoliths: true,
  showLabels: true,
  autosaveIntervalSec: 30,
  editorFontSizePx: 16,
};
