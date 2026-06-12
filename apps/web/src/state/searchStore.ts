import { create } from 'zustand';
import {
  dateKey,
  hasStructuredFilters,
  matchesFilters,
  parseSearchQuery,
  type TabletId,
} from '@pangaea/core';
import { MiniSearchEngine } from '../data/search/miniSearchEngine';
import { useTabletStore } from './tabletStore';
import { useLandStore } from './landStore';

/**
 * 검색 상태 (M2-A2~A4)
 * 인덱스는 열 때마다 tablets Map 참조가 바뀌었으면 전체 재색인 (수천 판까지 충분).
 */

const engine = new MiniSearchEngine();
let indexedRef: unknown = null;

function ensureIndex(): void {
  const tablets = useTabletStore.getState().tablets;
  if (tablets === indexedRef) return;
  engine.indexAll([...tablets.values()]);
  indexedRef = tablets;
}

function runSearch(query: string): TabletId[] {
  if (!query.trim()) return [];
  const filters = parseSearchQuery(query);
  const tablets = useTabletStore.getState().tablets;
  const lands = useLandStore.getState().lands;
  const today = dateKey(Date.now(), new Date().getTimezoneOffset());

  let candidates: TabletId[];
  if (filters.text) {
    ensureIndex();
    candidates = engine.search(filters.text);
  } else if (hasStructuredFilters(filters)) {
    // 필터만 있는 경우: 최근 수정 순 전체
    candidates = [...tablets.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((t) => t.id);
  } else {
    return [];
  }

  const resolveLandId = (nameOrId: string) => {
    if (lands.has(nameOrId)) return nameOrId;
    for (const l of lands.values()) if (l.name === nameOrId) return l.id;
    return undefined;
  };

  return candidates.filter((id) => {
    const t = tablets.get(id);
    return t ? matchesFilters(t, filters, { today, resolveLandId }) : false;
  });
}

interface SearchState {
  open: boolean;
  query: string;
  results: TabletId[];
  /** 대륙 뷰 하이라이트 — null = 비활성 */
  highlightIds: ReadonlySet<TabletId> | null;

  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  /** 현재 결과를 대륙 하이라이트로 적용 */
  applyHighlight: () => void;
  clearHighlight: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  open: false,
  query: '',
  results: [],
  highlightIds: null,

  setOpen: (open) => {
    if (open) ensureIndex();
    set({ open });
    if (!open) set({ query: '', results: [] });
  },

  setQuery: (query) => {
    set({ query, results: runSearch(query) });
  },

  applyHighlight: () => {
    const results = get().results;
    set({ highlightIds: results.length > 0 ? new Set(results) : null, open: false });
  },

  clearHighlight: () => set({ highlightIds: null }),
}));
