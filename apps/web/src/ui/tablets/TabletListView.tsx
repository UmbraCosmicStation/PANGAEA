import { useMemo, useState } from 'react';
import { tabletSizeBytes, type LandId } from '@pangaea/core';
import { useTabletStore } from '../../state/tabletStore';
import { useLandStore } from '../../state/landStore';
import { TabletCard } from './TabletCard';
import { NewTabletFab } from '../continent/NewTabletFab';
import { Dropdown } from '../components/Dropdown';
import { cn } from '../lib/cn';

type ListSort = 'recent' | 'title' | 'size';

const SORT_OPTIONS: Array<{ value: ListSort; label: string }> = [
  { value: 'recent', label: '최신' },
  { value: 'title', label: '제목' },
  { value: 'size', label: '용량' },
];

/** 판 목록 뷰 (M1-D3) — 토지 탭 필터 + 정렬 */
export function TabletListView() {
  const tablets = useTabletStore((s) => s.tablets);
  const lands = useLandStore((s) => s.lands);
  const [landFilter, setLandFilter] = useState<LandId | 'all'>('all');
  const [sort, setSort] = useState<ListSort>('recent');

  const list = useMemo(() => {
    let arr = [...tablets.values()];
    if (landFilter !== 'all') arr = arr.filter((t) => t.landId === landFilter);
    switch (sort) {
      case 'title':
        arr.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
        break;
      case 'size':
        arr.sort((a, b) => tabletSizeBytes(b) - tabletSizeBytes(a));
        break;
      default:
        arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return arr;
  }, [tablets, landFilter, sort]);

  return (
    <div className="flex h-full flex-col">
      <header className="glass-bar z-10 flex h-12 shrink-0 items-center justify-between border-b border-(--glass-border) px-4">
        <h1 className="font-serif-kr text-sm font-bold text-text-1">📝 판</h1>
        <Dropdown value={sort} options={SORT_OPTIONS} onChange={setSort} />
      </header>

      {/* 토지 탭 (glass pills) */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 py-2">
        {[{ id: 'all' as const, name: '전체' }, ...[...lands.values()]].map((l) => (
          <button
            key={l.id}
            className={cn(
              'glass shrink-0 rounded-full px-3 py-1 text-xs transition-colors',
              landFilter === l.id ? 'border-accent/60 text-accent' : 'text-text-2 hover:text-text-1',
            )}
            onClick={() => setLandFilter(l.id as LandId | 'all')}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-20 pt-1 lg:pb-4">
        {list.length === 0 ? (
          <p className="pt-16 text-center text-sm text-text-2">아직 새겨진 판이 없습니다</p>
        ) : (
          list.map((t) => <TabletCard key={t.id} tablet={t} />)
        )}
      </div>

      <NewTabletFab />
    </div>
  );
}
