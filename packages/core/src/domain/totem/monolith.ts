import type { TabletMeta } from '../../types/schema';
import {
  PRIORITY_TOTEMS,
  STATUS_TOTEMS,
  TYPE_TOTEMS,
  type Altitude,
} from './altitude';

/**
 * 모노리스 위 대표 토템 (기획서 §5.4)
 * Primary: share(top1) >= 0.40. 판 < 5개면 생략. Secondary: share >= 0.25, 최대 2개.
 */

export interface MonolithSummary {
  /** null = 대표 토템 없음 (혼합 또는 판 부족) */
  primary: string | null;
  secondary: string[];
  /** 판 5개 이상 + top1 < 40% → 혼합 상태 */
  mixed: boolean;
}

export const MONOLITH_MIN_TABLETS = 5;
export const PRIMARY_SHARE = 0.4;
export const SECONDARY_SHARE = 0.25;

function runeValueOf(meta: TabletMeta, altitude: Altitude): string | null {
  if (altitude === 'status') return meta.status;
  if (altitude === 'type') return meta.type;
  if (altitude === 'priority') return meta.priority;
  return null;
}

function symbolOf(value: string, altitude: Altitude): string {
  if (altitude === 'status') return STATUS_TOTEMS[value as keyof typeof STATUS_TOTEMS];
  if (altitude === 'type') return TYPE_TOTEMS[value as keyof typeof TYPE_TOTEMS];
  return PRIORITY_TOTEMS[value as keyof typeof PRIORITY_TOTEMS];
}

export function monolithSummary(tablets: ReadonlyArray<TabletMeta>, altitude: Altitude): MonolithSummary {
  if (altitude === 'bridges' || altitude === 'health' || tablets.length < MONOLITH_MIN_TABLETS) {
    return { primary: null, secondary: [], mixed: false };
  }

  const counts = new Map<string, number>();
  for (const t of tablets) {
    const v = runeValueOf(t, altitude);
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const total = tablets.length;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const top = sorted[0];
  const primary = top && top[1] / total >= PRIMARY_SHARE ? symbolOf(top[0], altitude) : null;

  const secondary = sorted
    .filter(([v, c]) => c / total >= SECONDARY_SHARE && (!top || v !== top[0] || primary === null))
    .filter(([v]) => !(primary !== null && top && v === top[0]))
    .slice(0, 2)
    .map(([v]) => symbolOf(v, altitude));

  return { primary, secondary, mixed: primary === null };
}
