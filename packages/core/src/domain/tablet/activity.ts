import type { ActivityEntry, TabletId } from '../../types/schema';

/**
 * 활성도(Activity) 계산 (기획서 §4.2)
 *
 * activity = min(1.0, raw / cap)
 * raw = edit×0.4 + view×0.1 + |char_delta|×0.002, cap = 5.0
 */

export const ACTIVITY_CONFIG = {
  editWeight: 0.4,
  viewWeight: 0.1,
  charWeight: 0.002,
  cap: 5.0,
  /** 같은 세션 30초 내 재저장은 1회로 카운트 */
  editDedupMs: 30_000,
  /** 10분 내 재열람은 1회로 카운트 */
  viewDedupMs: 600_000,
  /** 어제 이전 데이터 보관 일수 */
  keepDays: 3,
} as const;

/** 로컬 타임존 기준 YYYY-MM-DD */
export function dateKey(epochMs: number, tzOffsetMinutes: number): string {
  const local = new Date(epochMs - tzOffsetMinutes * 60_000);
  return local.toISOString().slice(0, 10);
}

export function emptyEntry(tabletId: TabletId, date: string): ActivityEntry {
  return {
    tabletId,
    date,
    editCount: 0,
    viewCount: 0,
    charDelta: 0,
    lastEditAt: 0,
    lastViewAt: 0,
  };
}

/** 활성도 0~1. 엔트리가 없거나 날짜가 다르면(자정 리셋) 0. */
export function computeActivity(entry: ActivityEntry | undefined, today: string): number {
  if (!entry || entry.date !== today) return 0;
  const raw =
    entry.editCount * ACTIVITY_CONFIG.editWeight +
    entry.viewCount * ACTIVITY_CONFIG.viewWeight +
    Math.abs(entry.charDelta) * ACTIVITY_CONFIG.charWeight;
  return Math.min(1, raw / ACTIVITY_CONFIG.cap);
}

/**
 * 편집(저장) 기록. 30초 내 재저장은 editCount 미증가, charDelta는 누적.
 * 윈도우 앵커는 "마지막으로 카운트된 저장" 시점 — 카운트될 때만 갱신.
 * 날짜가 바뀌었으면 새 엔트리로 리셋(자정 리셋).
 */
export function recordEdit(
  prev: ActivityEntry | undefined,
  args: { tabletId: TabletId; today: string; now: number; charDelta: number },
): ActivityEntry {
  const base = prev && prev.date === args.today ? prev : emptyEntry(args.tabletId, args.today);
  const dedup = base.lastEditAt > 0 && args.now - base.lastEditAt < ACTIVITY_CONFIG.editDedupMs;
  return {
    ...base,
    editCount: base.editCount + (dedup ? 0 : 1),
    charDelta: base.charDelta + Math.abs(args.charDelta),
    lastEditAt: dedup ? base.lastEditAt : args.now,
  };
}

/** 열람 기록. 10분 내 재열람은 viewCount 미증가. 앵커는 마지막 카운트 시점. */
export function recordView(
  prev: ActivityEntry | undefined,
  args: { tabletId: TabletId; today: string; now: number },
): ActivityEntry {
  const base = prev && prev.date === args.today ? prev : emptyEntry(args.tabletId, args.today);
  const dedup = base.lastViewAt > 0 && args.now - base.lastViewAt < ACTIVITY_CONFIG.viewDedupMs;
  return {
    ...base,
    viewCount: base.viewCount + (dedup ? 0 : 1),
    lastViewAt: dedup ? base.lastViewAt : args.now,
  };
}

/** keepDays보다 오래된 엔트리 제거 (기획서: 3일 보관 후 삭제) */
export function pruneActivityLog(log: ActivityEntry[], today: string): ActivityEntry[] {
  const cutoff = new Date(today + 'T00:00:00Z').getTime() - ACTIVITY_CONFIG.keepDays * 86_400_000;
  return log.filter((e) => new Date(e.date + 'T00:00:00Z').getTime() >= cutoff);
}
