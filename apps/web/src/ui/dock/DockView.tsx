import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DOCK_LAND_ID, tabletSizeBytes } from '@pangaea/core';
import { useTabletStore } from '../../state/tabletStore';
import { useLandStore } from '../../state/landStore';
import { useToastStore } from '../../state/toastStore';
import { Glass } from '../components/Glass';
import { Dropdown } from '../components/Dropdown';
import { relativeTime } from '../lib/format';

/** 부두 뷰 (M1-D4) — 미분류 판 + 토지 배정 */
export function DockView() {
  const navigate = useNavigate();
  const tablets = useTabletStore((s) => s.tablets);
  const lands = useLandStore((s) => s.lands);
  const show = useToastStore((s) => s.show);

  const dockTablets = useMemo(
    () =>
      [...tablets.values()]
        .filter((t) => t.landId === DOCK_LAND_ID)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [tablets],
  );

  const landOptions = [...lands.values()]
    .filter((l) => l.type !== 'dock' && l.type !== 'archive')
    .map((l) => ({ value: l.id, label: l.name }));

  return (
    <div className="flex h-full flex-col">
      <header className="glass-bar z-10 flex h-12 shrink-0 items-center justify-between border-b border-(--glass-border) px-4">
        <h1 className="font-serif-kr text-sm font-bold text-text-1">⚓ 부두</h1>
        <span className="text-xs text-text-2">{dockTablets.length}개 분류 대기</span>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-20 pt-2 lg:pb-4">
        {dockTablets.length === 0 ? (
          <p className="pt-16 text-center text-sm text-text-2">
            부두가 비어 있습니다. 모든 판이 자기 토지를 찾았어요.
          </p>
        ) : (
          dockTablets.map((t) => (
            <Glass key={t.id} className="flex items-center gap-2 p-3">
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => navigate(`/edit/${t.id}`)}
              >
                <span className="block truncate font-serif-kr text-sm font-bold text-text-1">
                  {t.title}
                </span>
                <span className="font-mono text-[10px] text-text-2">
                  {(tabletSizeBytes(t) / 1024).toFixed(1)}KB · {relativeTime(t.updatedAt)}
                </span>
              </button>
              {landOptions.length > 0 && (
                <Dropdown
                  value={DOCK_LAND_ID}
                  options={[{ value: DOCK_LAND_ID, label: '배정...' }, ...landOptions]}
                  onChange={(landId) => {
                    if (landId === DOCK_LAND_ID) return;
                    void useTabletStore.getState().moveToLand(t.id, landId);
                    show('토지에 배정했습니다', 'success');
                  }}
                />
              )}
            </Glass>
          ))
        )}
      </div>
    </div>
  );
}
