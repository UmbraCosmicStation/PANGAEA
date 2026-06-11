import { describe, expect, it } from 'vitest';
import { deriveBridges, limitBridgesPerLand } from '../domain/land/bridge';

const NOW = '2026-06-11T00:00:00Z';

function t(id: string, landId: string, links: string[] = [], xsetLands: string[] = []) {
  return { id, landId, links, xset: xsetLands.map((l) => ({ landId: l, createdAt: NOW })) };
}

describe('bridge', () => {
  it('같은 토지 내 링크는 다리를 만들지 않는다', () => {
    const bridges = deriveBridges([t('a', 'work', ['b']), t('b', 'work')]);
    expect(bridges).toHaveLength(0);
  });

  it('토지 간 링크 → 단방향 다리', () => {
    const bridges = deriveBridges([t('a', 'work', ['b']), t('b', 'learn')]);
    expect(bridges).toHaveLength(1);
    expect(bridges[0]).toMatchObject({
      sourceLandId: 'work',
      targetLandId: 'learn',
      linkCount: 1,
      bidirectional: false,
    });
  });

  it('양쪽 모두 링크 → 양방향, 같은 쌍은 합산', () => {
    const bridges = deriveBridges([
      t('a', 'work', ['b', 'c']),
      t('b', 'learn', ['a']),
      t('c', 'learn'),
    ]);
    expect(bridges).toHaveLength(1);
    expect(bridges[0]).toMatchObject({ linkCount: 3, bidirectional: true });
  });

  it('교차 정착(xset) → 양방향 다리', () => {
    const bridges = deriveBridges([t('a', 'work', [], ['learn'])]);
    expect(bridges).toHaveLength(1);
    expect(bridges[0]!.bidirectional).toBe(true);
  });

  it('strength = min(1, linkCount / 5)', () => {
    const links = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'];
    const tablets = [t('a', 'work', links), ...links.map((id) => t(id, 'learn'))];
    const bridges = deriveBridges(tablets);
    expect(bridges[0]!.linkCount).toBe(7);
    expect(bridges[0]!.strength).toBe(1);
  });

  it('존재하지 않는 판으로의 링크는 무시한다', () => {
    const bridges = deriveBridges([t('a', 'work', ['ghost'])]);
    expect(bridges).toHaveLength(0);
  });

  it('토지당 나가는 다리 최대 20개 — strength 낮은 것부터 비표시', () => {
    const tablets = [];
    for (let i = 0; i < 25; i++) {
      const target = `land${i}`;
      // work에서 land_i로 i+1개의 링크 → strength 차등
      const linkIds = Array.from({ length: Math.min(i + 1, 5) }, (_, k) => `t${i}_${k}`);
      tablets.push(t(`src${i}`, 'work', linkIds));
      linkIds.forEach((id) => tablets.push(t(id, target)));
    }
    const bridges = deriveBridges(tablets);
    expect(bridges.length).toBe(25);
    const limited = limitBridgesPerLand(bridges);
    const fromWork = limited.filter((b) => b.sourceLandId === 'work');
    expect(fromWork.length).toBe(20);
    // 남은 것들은 strength 상위
    const minKept = Math.min(...fromWork.map((b) => b.linkCount));
    const dropped = bridges.filter((b) => !limited.includes(b));
    for (const d of dropped) expect(d.linkCount).toBeLessThanOrEqual(minKept);
  });
});
