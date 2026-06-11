import { useNavigate } from 'react-router-dom';
import { tabletSizeBytes, type Tablet } from '@pangaea/core';
import { useLandStore } from '../../state/landStore';
import { Glass } from '../components/Glass';
import { relativeTime, STATUS_SYMBOLS } from '../lib/format';

/** 판 카드 (M1-D3) — 탭하면 에디터 진입 */
export function TabletCard({ tablet }: { tablet: Tablet }) {
  const navigate = useNavigate();
  const land = useLandStore((s) => s.lands.get(tablet.landId));

  return (
    <Glass
      className="spring cursor-pointer p-3 transition-colors hover:bg-white/15"
      onClick={() => navigate(`/edit/${tablet.id}`)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-serif-kr text-sm font-bold text-text-1">
          <span className="mr-1.5">{STATUS_SYMBOLS[tablet.status]}</span>
          {tablet.title}
          {tablet.pinned && <span className="ml-1 text-accent">★</span>}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-text-2">
          {tablet.status} · {tablet.type} · {tablet.priority}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-text-2">
        <span>
          {land?.name ?? tablet.landId}
          {tablet.wardPath ? ` › ${tablet.wardPath}` : ''}
        </span>
        <span className="font-mono text-[10px]">
          {(tabletSizeBytes(tablet) / 1024).toFixed(1)}KB · {relativeTime(tablet.updatedAt)}
        </span>
      </div>
    </Glass>
  );
}
