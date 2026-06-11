import { beforeAll, describe, expect, it } from 'vitest';
import { DOCK_LAND_ID } from '@pangaea/core';
import { MemoryStorage } from '../data/storage/memoryStorage';
import { setStorage } from '../data/storage';
import { useTabletStore } from './tabletStore';
import { useLandStore } from './landStore';

describe('stores (MemoryStorage 통합)', () => {
  beforeAll(async () => {
    setStorage(new MemoryStorage());
    await useLandStore.getState().loadAll();
    await useTabletStore.getState().loadAll();
  });

  it('부두는 자동 생성되고 타입 전환이 불가하다', async () => {
    await useLandStore.getState().ensureDock();
    const dock = useLandStore.getState().lands.get(DOCK_LAND_ID)!;
    expect(dock.type).toBe('dock');
    await useLandStore.getState().update(DOCK_LAND_ID, { type: 'area' });
    expect(useLandStore.getState().lands.get(DOCK_LAND_ID)!.type).toBe('dock');
  });

  it('판 생성 → 저장소와 상태에 모두 반영', async () => {
    await useLandStore.getState().createFromPreset(['work']);
    const tablet = await useTabletStore.getState().create({ title: '첫 판', landId: 'work' });
    expect(useTabletStore.getState().tablets.get(tablet.id)?.title).toBe('첫 판');
  });

  it('본문 저장 → 활성도가 올라간다', async () => {
    const tablet = await useTabletStore.getState().create({ title: '활성도 판', landId: 'work' });
    expect(useTabletStore.getState().activityOf(tablet.id)).toBe(0);
    await useTabletStore.getState().saveBody(tablet.id, '내용을 적었다 '.repeat(20));
    const activity = useTabletStore.getState().activityOf(tablet.id);
    expect(activity).toBeGreaterThan(0);
  });

  it('판 이동 → landId 변경', async () => {
    await useLandStore.getState().createFromPreset(['learn']);
    const tablet = await useTabletStore.getState().create({ title: '이동 판', landId: 'work' });
    await useTabletStore.getState().moveToLand(tablet.id, 'learn');
    expect(useTabletStore.getState().tablets.get(tablet.id)?.landId).toBe('learn');
  });

  it('판 삭제 → 상태에서 제거', async () => {
    const tablet = await useTabletStore.getState().create({ title: '삭제 판', landId: 'work' });
    await useTabletStore.getState().remove(tablet.id);
    expect(useTabletStore.getState().tablets.has(tablet.id)).toBe(false);
  });

  it('기록보관: 토지 삭제 = archive, 부두는 불가', async () => {
    await useLandStore.getState().archive('learn');
    expect(useLandStore.getState().lands.get('learn')!.type).toBe('archive');
    await useLandStore.getState().archive(DOCK_LAND_ID);
    expect(useLandStore.getState().lands.get(DOCK_LAND_ID)!.type).toBe('dock');
  });
});
