import { describe, expect, it } from 'vitest';
import { blockTotem, landBridgeDensity, landHealth } from '../domain/totem/altitude';
import { monolithSummary } from '../domain/totem/monolith';
import { createTablet } from '../domain/tablet/create';
import type { Bridge, TabletMeta } from '../types/schema';
import type { RuneStatus } from '../types/runes';

const NOW = new Date('2026-06-12T12:00:00Z').getTime();

function metaWith(status: RuneStatus): TabletMeta {
  return { ...createTablet({ title: 't', landId: 'work', now: '2026-06-12T00:00:00Z' }), status };
}

describe('blockTotem', () => {
  it('룬 고도에서 해당 룬의 폴백 심볼을 반환한다', () => {
    const m = metaWith('active');
    expect(blockTotem(m, 'status')).toBe('🔥');
    expect(blockTotem({ ...m, type: 'reference' }, 'type')).toBe('≡');
    expect(blockTotem({ ...m, priority: 'urgent' }, 'priority')).toBe('!');
  });

  it('항로/기후 고도에서는 개별 판 토템이 없다', () => {
    expect(blockTotem(metaWith('active'), 'bridges')).toBeNull();
    expect(blockTotem(metaWith('active'), 'health')).toBeNull();
  });
});

describe('monolithSummary (기획서 §5.4)', () => {
  const mk = (statuses: RuneStatus[]) => statuses.map(metaWith);

  it('판 < 5개 → 대표 토템 생략 (QA #3)', () => {
    const s = monolithSummary(mk(['active', 'active', 'active', 'active']), 'status');
    expect(s.primary).toBeNull();
    expect(s.mixed).toBe(false);
  });

  it('share >= 40% → Primary 대표 토템', () => {
    const s = monolithSummary(mk(['active', 'active', 'active', 'done', 'draft']), 'status');
    expect(s.primary).toBe('🔥'); // 3/5 = 60%
  });

  it('top1 < 40% → 혼합 (primary 없음)', () => {
    const s = monolithSummary(
      mk(['active', 'done', 'draft', 'blocked', 'inbox', 'archived']),
      'status',
    );
    expect(s.primary).toBeNull();
    expect(s.mixed).toBe(true);
  });

  it('Secondary: share >= 25%, 최대 2개, Primary 제외', () => {
    // active 4 (40%), done 3 (30%), draft 3 (30%)
    const s = monolithSummary(
      mk(['active', 'active', 'active', 'active', 'done', 'done', 'done', 'draft', 'draft', 'draft']),
      'status',
    );
    expect(s.primary).toBe('🔥');
    expect(s.secondary).toHaveLength(2);
    expect(s.secondary).not.toContain('🔥');
  });
});

describe('landHealth', () => {
  const tablet = (updatedAt: string, wardPath?: string) => ({ updatedAt, wardPath });

  it('부두 판 10개 이상 → inbox_overflow', () => {
    const tablets = Array.from({ length: 10 }, () => tablet('2026-06-12T00:00:00Z'));
    expect(landHealth({ tablets, isDock: true, now: NOW })).toBe('inbox_overflow');
  });

  it('영역 직속 40개 이상 → crowded (가드레일 경고선)', () => {
    const tablets = Array.from({ length: 40 }, () => tablet('2026-06-12T00:00:00Z', '개발'));
    expect(landHealth({ tablets, isDock: false, now: NOW })).toBe('crowded');
  });

  it('14일간 수정 없음 → stale', () => {
    const tablets = [tablet('2026-05-01T00:00:00Z')];
    expect(landHealth({ tablets, isDock: false, now: NOW })).toBe('stale');
  });

  it('정상 → balanced', () => {
    const tablets = [tablet('2026-06-11T00:00:00Z')];
    expect(landHealth({ tablets, isDock: false, now: NOW })).toBe('balanced');
  });
});

describe('landBridgeDensity', () => {
  const bridge = (src: string, dst: string, bi = false): Bridge => ({
    sourceLandId: src,
    targetLandId: dst,
    linkCount: 1,
    strength: 0.2,
    bidirectional: bi,
  });

  it('나가는 다리 수에 따라 low/medium/high/hub', () => {
    expect(landBridgeDensity('a', [])).toBe('low');
    expect(landBridgeDensity('a', [bridge('a', 'b')])).toBe('medium');
    expect(landBridgeDensity('a', [bridge('a', 'b'), bridge('a', 'c')])).toBe('high');
    expect(
      landBridgeDensity('a', [bridge('a', 'b'), bridge('a', 'c'), bridge('a', 'd'), bridge('e', 'a', true)]),
    ).toBe('hub');
  });
});
