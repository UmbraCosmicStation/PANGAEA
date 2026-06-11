import type { RunePriority, RuneStatus, RuneType } from './runes';

/** 판(Tablet) ID — ulid */
export type TabletId = string;
/** 토지(Land) ID */
export type LandId = string;

/** 부두(Dock) — 미분류 판이 모이는 고정 토지 (삭제 불가) */
export const DOCK_LAND_ID: LandId = 'dock';

/** 교차 정착(흔적, Trace) 엔트리 — 기획서 §7, §15.3 */
export interface CrossSettlement {
  landId: LandId;
  wardPath?: string;
  createdAt: string; // ISO 8601
}

/**
 * 판의 메타데이터 — `.md` front-matter 또는 `.meta.json` 사이드카에 직렬화 (기획서 §9.4, §15.1)
 */
export interface TabletMeta {
  id: TabletId;
  title: string;
  landId: LandId;
  wardPath?: string;
  status: RuneStatus;
  type: RuneType;
  priority: RunePriority;
  links: TabletId[];
  xset: CrossSettlement[];
  tags: string[];
  remindAt?: string; // ISO 8601 date
  pinned: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** 판(Tablet) = 메타 + 본문. 기본 단위는 파일. */
export interface Tablet extends TabletMeta {
  body: string;
}

/** 본문 UTF-8 바이트 수 — 블록 높이(용량) 계산의 데이터 소스. (코어는 DOM/Node 전역 미사용) */
export function tabletSizeBytes(tablet: Pick<Tablet, 'body'>): number {
  let len = 0;
  for (const ch of tablet.body) {
    const cp = ch.codePointAt(0) ?? 0;
    len += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
  }
  return len;
}

export const LAND_TYPES = ['area', 'goal', 'archive', 'dock'] as const;
export type LandType = (typeof LAND_TYPES)[number];

/** 토지(Land) — 지도 구획을 만드는 1급 컨테이너 (기획서 §2.1) */
export interface Land {
  id: LandId;
  name: string;
  type: LandType;
  deadline?: string; // ISO 8601 date — goal 타입만
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 활성도 일일 로그 엔트리 (기획서 §4.2) */
export interface ActivityEntry {
  tabletId: TabletId;
  date: string; // YYYY-MM-DD (로컬 타임존)
  editCount: number;
  viewCount: number;
  charDelta: number;
  /** 중복 제거용 — 마지막 저장/열람 시각 (epoch ms) */
  lastEditAt: number;
  lastViewAt: number;
}

/** 토지 간 다리(Bridge) — 기획서 §7.1 */
export interface Bridge {
  sourceLandId: LandId;
  targetLandId: LandId;
  linkCount: number;
  /** min(1, linkCount / 5) — 시각적 굵기 */
  strength: number;
  bidirectional: boolean;
}

/** 온보딩 프리셋 토지 (기획서 §2.1) */
export const PRESET_LANDS: ReadonlyArray<{ id: LandId; name: string }> = [
  { id: 'work', name: '일터' },
  { id: 'learn', name: '배움' },
  { id: 'health', name: '건강' },
  { id: 'home', name: '살림' },
  { id: 'finance', name: '재정' },
  { id: 'relations', name: '관계' },
  { id: 'hobby', name: '취미' },
];
