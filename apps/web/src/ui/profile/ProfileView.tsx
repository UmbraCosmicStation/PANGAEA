import { DOCK_LAND_ID } from '@pangaea/core';
import { useTabletStore } from '../../state/tabletStore';
import { useLandStore } from '../../state/landStore';
import { useUiStore } from '../../state/uiStore';
import { Glass } from '../components/Glass';

/** 프로필 뷰 (M1-D5 기본형) — 통계 확장은 M3-B5 */
export function ProfileView() {
  const spaceName = useUiStore((s) => s.spaceName);
  const tablets = useTabletStore((s) => s.tablets);
  const lands = useLandStore((s) => s.lands);

  const landCount = [...lands.values()].filter((l) => l.id !== DOCK_LAND_ID).length;
  const tabletCount = tablets.size;
  const dockCount = [...tablets.values()].filter((t) => t.landId === DOCK_LAND_ID).length;

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
          <div>
            <div className="font-mono text-xl text-text-1">{landCount}</div>
            <div className="text-[10px] text-text-2">토지</div>
          </div>
          <div>
            <div className="font-mono text-xl text-text-1">{tabletCount}</div>
            <div className="text-[10px] text-text-2">판</div>
          </div>
          <div>
            <div className="font-mono text-xl text-text-1">{dockCount}</div>
            <div className="text-[10px] text-text-2">부두 대기</div>
          </div>
        </div>
      </Glass>

      <Glass className="w-full max-w-md p-5 text-xs text-text-2">
        <p>⚙ 설정 · 📤 데이터 내보내기 · 로그인 — M2~M3에서 열립니다.</p>
      </Glass>
    </div>
  );
}
