import { describe, expect, it } from 'vitest';
import { matchesFilters, parseSearchQuery } from '../domain/tablet/search';
import { createTablet } from '../domain/tablet/create';
import type { TabletMeta } from '../types/schema';

const TODAY = '2026-06-12';

function meta(overrides: Partial<TabletMeta> = {}): TabletMeta {
  return { ...createTablet({ title: 't', landId: 'work', now: '2026-06-12T09:00:00Z' }), ...overrides };
}

describe('parseSearchQuery', () => {
  it('룬 필터 + 자유 텍스트 조합을 파싱한다', () => {
    const f = parseSearchQuery('status:active type:note API 설계');
    expect(f.status).toEqual(['active']);
    expect(f.type).toEqual(['note']);
    expect(f.text).toBe('API 설계');
  });

  it('같은 키 반복은 배열로 누적된다 (OR)', () => {
    const f = parseSearchQuery('status:active status:done');
    expect(f.status).toEqual(['active', 'done']);
  });

  it('태그/토지/날짜 필터를 파싱한다', () => {
    const f = parseSearchQuery('#회의 #Q3 land:일터 created:7d updated:today');
    expect(f.tags).toEqual(['회의', 'Q3']);
    expect(f.land).toBe('일터');
    expect(f.createdWithinDays).toBe(7);
    expect(f.updatedToday).toBe(true);
  });

  it('따옴표 구문은 텍스트로 보존된다', () => {
    const f = parseSearchQuery('"정확한 문구" 추가어');
    expect(f.text).toBe('정확한 문구 추가어');
  });

  it('잘못된 룬 값은 텍스트로 폴백한다', () => {
    const f = parseSearchQuery('status:없는값');
    expect(f.status).toEqual([]);
    expect(f.text).toBe('status:없는값');
  });
});

describe('matchesFilters', () => {
  it('키 간 AND: status와 type 모두 일치해야 한다', () => {
    const f = parseSearchQuery('status:active type:note');
    const ctx = { today: TODAY };
    expect(matchesFilters(meta({ status: 'active', type: 'note' }), f, ctx)).toBe(true);
    expect(matchesFilters(meta({ status: 'active', type: 'idea' }), f, ctx)).toBe(false);
  });

  it('태그는 전부 포함해야 한다 (AND)', () => {
    const f = parseSearchQuery('#a #b');
    const ctx = { today: TODAY };
    expect(matchesFilters(meta({ tags: ['a', 'b', 'c'] }), f, ctx)).toBe(true);
    expect(matchesFilters(meta({ tags: ['a'] }), f, ctx)).toBe(false);
  });

  it('land 필터는 이름→ID 해석을 거친다', () => {
    const f = parseSearchQuery('land:일터');
    const ctx = { today: TODAY, resolveLandId: (n: string) => (n === '일터' ? 'work' : undefined) };
    expect(matchesFilters(meta({ landId: 'work' }), f, ctx)).toBe(true);
    expect(matchesFilters(meta({ landId: 'learn' }), f, ctx)).toBe(false);
  });

  it('created:7d — 7일 이내 생성만', () => {
    const f = parseSearchQuery('created:7d');
    const ctx = { today: TODAY };
    expect(matchesFilters(meta({ createdAt: '2026-06-10T00:00:00Z' }), f, ctx)).toBe(true);
    expect(matchesFilters(meta({ createdAt: '2026-05-01T00:00:00Z' }), f, ctx)).toBe(false);
  });

  it('updated:today — 오늘 수정된 판만', () => {
    const f = parseSearchQuery('updated:today');
    const ctx = { today: TODAY };
    expect(matchesFilters(meta({ updatedAt: '2026-06-12T10:00:00Z' }), f, ctx)).toBe(true);
    expect(matchesFilters(meta({ updatedAt: '2026-06-11T10:00:00Z' }), f, ctx)).toBe(false);
  });
});
