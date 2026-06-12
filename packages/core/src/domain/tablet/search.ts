import type { RunePriority, RuneStatus, RuneType } from '../../types/runes';
import { isRunePriority, isRuneStatus, isRuneType } from '../../types/runes';
import type { TabletMeta } from '../../types/schema';

/**
 * 검색 필터 문법 파서 (기획서 §8.6.3) — 순수 함수
 *
 * status:active type:note priority:high  → AND 조합 (같은 키 반복 = OR)
 * land:일터                               → 토지 스코프
 * #회의 #Q3                               → 태그 AND
 * "정확한 문구"                            → 구문 (텍스트로 취급)
 * created:7d / updated:today              → 날짜 필터
 * 나머지                                  → 전문검색 텍스트
 */

export interface SearchFilters {
  text: string;
  status: RuneStatus[];
  type: RuneType[];
  priority: RunePriority[];
  /** 토지 이름 또는 ID */
  land?: string;
  tags: string[];
  createdWithinDays?: number;
  updatedToday?: boolean;
}

export function parseSearchQuery(query: string): SearchFilters {
  const filters: SearchFilters = { text: '', status: [], type: [], priority: [], tags: [] };
  const textParts: string[] = [];

  // 따옴표 구문 보존 토크나이즈
  const tokens = query.match(/"[^"]*"|\S+/g) ?? [];

  for (const raw of tokens) {
    if (raw.startsWith('"') && raw.endsWith('"')) {
      textParts.push(raw.slice(1, -1));
      continue;
    }
    if (raw.startsWith('#') && raw.length > 1) {
      filters.tags.push(raw.slice(1));
      continue;
    }
    const sep = raw.indexOf(':');
    if (sep > 0) {
      const key = raw.slice(0, sep).toLowerCase();
      const value = raw.slice(sep + 1);
      if (key === 'status' && isRuneStatus(value)) {
        filters.status.push(value);
        continue;
      }
      if (key === 'type' && isRuneType(value)) {
        filters.type.push(value);
        continue;
      }
      if (key === 'priority' && isRunePriority(value)) {
        filters.priority.push(value);
        continue;
      }
      if (key === 'land' && value) {
        filters.land = value;
        continue;
      }
      if (key === 'created') {
        const m = /^(\d+)d$/.exec(value);
        if (m) {
          filters.createdWithinDays = Number(m[1]);
          continue;
        }
      }
      if (key === 'updated' && value === 'today') {
        filters.updatedToday = true;
        continue;
      }
    }
    textParts.push(raw);
  }

  filters.text = textParts.join(' ').trim();
  return filters;
}

/** 텍스트 외 구조화 필터가 하나라도 있는가 */
export function hasStructuredFilters(f: SearchFilters): boolean {
  return (
    f.status.length > 0 ||
    f.type.length > 0 ||
    f.priority.length > 0 ||
    f.tags.length > 0 ||
    f.land !== undefined ||
    f.createdWithinDays !== undefined ||
    f.updatedToday === true
  );
}

export interface MatchContext {
  /** 로컬 YYYY-MM-DD */
  today: string;
  /** 토지 이름/ID → ID 해석 (미지정 시 land 필터는 ID 비교만) */
  resolveLandId?: (nameOrId: string) => string | undefined;
}

/** 구조화 필터 매칭 — 키 간 AND, 같은 키 내 OR, 태그는 AND (기획서 §8.6.3) */
export function matchesFilters(meta: TabletMeta, f: SearchFilters, ctx: MatchContext): boolean {
  if (f.status.length > 0 && !f.status.includes(meta.status)) return false;
  if (f.type.length > 0 && !f.type.includes(meta.type)) return false;
  if (f.priority.length > 0 && !f.priority.includes(meta.priority)) return false;

  if (f.land !== undefined) {
    const landId = ctx.resolveLandId?.(f.land) ?? f.land;
    if (meta.landId !== landId) return false;
  }

  if (f.tags.length > 0) {
    const tagSet = new Set(meta.tags.map((t) => t.toLowerCase()));
    if (!f.tags.every((t) => tagSet.has(t.toLowerCase()))) return false;
  }

  if (f.createdWithinDays !== undefined) {
    const cutoff = new Date(ctx.today + 'T00:00:00').getTime() - f.createdWithinDays * 86_400_000;
    if (new Date(meta.createdAt).getTime() < cutoff) return false;
  }

  if (f.updatedToday) {
    if (!meta.updatedAt.startsWith(ctx.today)) return false;
  }

  return true;
}
