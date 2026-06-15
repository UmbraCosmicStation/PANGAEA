import { DOCK_LAND_ID } from '@pangaea/core';
import { Download } from 'lucide-react';
import { useTabletStore } from '../../state/tabletStore';
import { useLandStore } from '../../state/landStore';
import { useUiStore } from '../../state/uiStore';
import { useSealStore } from '../../state/sealStore';
import { useMoaiStore } from '../../state/moaiStore';
import { useToastStore } from '../../state/toastStore';
import { buildExportZip, downloadZip } from '../../data/export/exportZip';
import { Glass } from '../components/Glass';
import { Button } from '../components/Button';

/** 프로필 뷰 (M1-D5 + M2-D 인장/잉크/Export) */
export function ProfileView() {
  const spaceName = useUiStore((s) => s.spaceName);
  const tablets = useTabletStore((s) => s.tablets);
  const lands = useLandStore((s) => s.lands);
  const sealLedger = useSealStore((s) => s.ledger);
  const inkLedger = useMoaiStore((s) => s.ledger);

  const landCount = [...lands.values()].filter((l) => l.id !== DOCK_LAND_ID).length;
  const tabletCount = tablets.size;
  const dockCount = [...tablets.values()].filter((t) => t.landId === DOCK_LAND_ID).length;

  const inkQuota = inkLedger.plan === 'pro' ? 300 : 30;
  const inkUsed = inkLedger.spent;

  const exportAll = () => {
    const bytes = buildExportZip({
      lands: [...lands.values()],
      tablets: [...tablets.values()],
      spaceName,
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadZip(bytes, `pangaea-${date}.zip`);
    useToastStore.getState().show('대륙을 내보냈습니다', 'success');
  };

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto p-6 pb-20 lg:pb-6">
      <Glass className="w-full max-w-md p-5">
        <h1 className="font-serif-kr text-lg font-bold text-text-1">
          👤 {spaceName ? `${spaceName}의 판게아` : '나의 판게아'}
        </h1>
        <p className="mt-1 text-xs text-text-2">게스트 모드 · 데이터는 이 기기에만 저장됩니다</p>
        <span className="mt-2 inline-block rounded-full border border-accent/50 px-2.5 py-0.5 text-[10px] text-accent">
          Free
        </span>
      </Glass>

      <Glass className="w-full max-w-md p-5">
        <h2 className="mb-3 text-sm font-medium text-text-1">📊 내 대륙 통계</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat value={landCount} label="토지" />
          <Stat value={tabletCount} label="판" />
          <Stat value={dockCount} label="부두 대기" />
        </div>
      </Glass>

      {/* 인장 + 잉크 (M2-D5 / M2-C) */}
      <Glass className="w-full max-w-md p-5">
        <h2 className="mb-3 text-sm font-medium text-text-1">🔖 자원</h2>
        <ResourceBar
          label="인장 (새 판 생성)"
          value={sealLedger.unlimited ? Infinity : sealLedger.balance}
          max={50}
          hint="매주 월요일 +5"
        />
        <div className="h-3" />
        <ResourceBar label="잉크 (모아이)" value={inkQuota - inkUsed} max={inkQuota} hint="월 리셋" />
      </Glass>

      <Glass className="w-full max-w-md p-5">
        <h2 className="mb-3 text-sm font-medium text-text-1">📤 데이터</h2>
        <p className="mb-3 text-xs text-text-2">
          표준 마크다운 + index.json ZIP. 어디서든 열 수 있습니다 (네 데이터는 네 것).
        </p>
        <Button onClick={exportAll} disabled={tabletCount === 0}>
          <Download size={15} /> 전체 대륙 내보내기 (.zip)
        </Button>
      </Glass>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-mono text-xl text-text-1">{value}</div>
      <div className="text-[10px] text-text-2">{label}</div>
    </div>
  );
}

function ResourceBar({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  hint: string;
}) {
  const unlimited = !Number.isFinite(value);
  const pct = unlimited ? 100 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-text-2">{label}</span>
        <span className="font-mono text-text-1">{unlimited ? '∞' : `${value}/${max}`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-0.5 text-right text-[9px] text-text-3">{hint}</div>
    </div>
  );
}
