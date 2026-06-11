import { describe, expect, it } from 'vitest';
import {
  computeActivity,
  dateKey,
  pruneActivityLog,
  recordEdit,
  recordView,
} from '../domain/tablet/activity';
import type { ActivityEntry } from '../types/schema';

const TODAY = '2026-06-11';
const T0 = new Date('2026-06-11T10:00:00Z').getTime();

describe('activity', () => {
  it('활성도 0: 엔트리가 없으면 0', () => {
    expect(computeActivity(undefined, TODAY)).toBe(0);
  });

  it('자정 리셋: 어제 엔트리는 오늘 활성도 0', () => {
    const yesterday: ActivityEntry = {
      tabletId: 't1',
      date: '2026-06-10',
      editCount: 10,
      viewCount: 10,
      charDelta: 1000,
      lastEditAt: 0,
      lastViewAt: 0,
    };
    expect(computeActivity(yesterday, TODAY)).toBe(0);
  });

  it('공식: edit×0.4 + view×0.1 + chars×0.002, cap 5.0', () => {
    let e = recordEdit(undefined, { tabletId: 't1', today: TODAY, now: T0, charDelta: 100 });
    e = recordView(e, { tabletId: 't1', today: TODAY, now: T0 });
    // raw = 1×0.4 + 1×0.1 + 100×0.002 = 0.7 → 0.7/5 = 0.14
    expect(computeActivity(e, TODAY)).toBeCloseTo(0.14, 5);
  });

  it('상한: raw가 cap을 넘으면 1.0', () => {
    let e: ActivityEntry | undefined;
    for (let i = 0; i < 20; i++) {
      e = recordEdit(e, { tabletId: 't1', today: TODAY, now: T0 + i * 60_000, charDelta: 500 });
    }
    expect(computeActivity(e, TODAY)).toBe(1);
  });

  it('편집 중복 제거: 30초 내 재저장은 editCount 미증가, charDelta는 누적', () => {
    let e = recordEdit(undefined, { tabletId: 't1', today: TODAY, now: T0, charDelta: 10 });
    e = recordEdit(e, { tabletId: 't1', today: TODAY, now: T0 + 10_000, charDelta: 20 });
    expect(e.editCount).toBe(1);
    expect(e.charDelta).toBe(30);
    e = recordEdit(e, { tabletId: 't1', today: TODAY, now: T0 + 45_000, charDelta: 5 });
    expect(e.editCount).toBe(2);
  });

  it('열람 중복 제거: 10분 내 재열람은 1회', () => {
    let e = recordView(undefined, { tabletId: 't1', today: TODAY, now: T0 });
    e = recordView(e, { tabletId: 't1', today: TODAY, now: T0 + 5 * 60_000 });
    expect(e.viewCount).toBe(1);
    e = recordView(e, { tabletId: 't1', today: TODAY, now: T0 + 11 * 60_000 });
    expect(e.viewCount).toBe(2);
  });

  it('charDelta는 절대값으로 누적된다 (삭제도 활동)', () => {
    const e = recordEdit(undefined, { tabletId: 't1', today: TODAY, now: T0, charDelta: -50 });
    expect(e.charDelta).toBe(50);
  });

  it('3일 이전 로그는 정리된다', () => {
    const log: ActivityEntry[] = [
      { tabletId: 'a', date: '2026-06-11', editCount: 1, viewCount: 0, charDelta: 0, lastEditAt: 0, lastViewAt: 0 },
      { tabletId: 'b', date: '2026-06-09', editCount: 1, viewCount: 0, charDelta: 0, lastEditAt: 0, lastViewAt: 0 },
      { tabletId: 'c', date: '2026-06-07', editCount: 1, viewCount: 0, charDelta: 0, lastEditAt: 0, lastViewAt: 0 },
    ];
    const pruned = pruneActivityLog(log, TODAY);
    expect(pruned.map((e) => e.tabletId)).toEqual(['a', 'b']);
  });

  it('dateKey: 타임존 오프셋을 반영한 로컬 날짜', () => {
    // UTC 2026-06-11 01:00, KST(-540분 오프셋) → 2026-06-11 10:00 KST
    const utc1am = new Date('2026-06-11T01:00:00Z').getTime();
    expect(dateKey(utc1am, -540)).toBe('2026-06-11');
    // UTC 2026-06-11 16:00 → KST 2026-06-12 01:00
    const utc4pm = new Date('2026-06-11T16:00:00Z').getTime();
    expect(dateKey(utc4pm, -540)).toBe('2026-06-12');
  });
});
