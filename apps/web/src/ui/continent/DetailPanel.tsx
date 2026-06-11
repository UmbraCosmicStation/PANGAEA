import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { tabletSizeBytes, type Tablet } from '@pangaea/core';
import { useLandStore } from '../../state/landStore';
import { useTabletStore } from '../../state/tabletStore';
import { useToastStore } from '../../state/toastStore';
import { Button } from '../components/Button';
import { Dropdown } from '../components/Dropdown';
import { Modal } from '../components/Modal';
import { Glass } from '../components/Glass';

/** 블록 선택 상세 패널 (M1-C5) — 데스크탑 우측 / 모바일 바텀 시트 */
export function DetailPanel({ tablet, onClose }: { tablet: Tablet; onClose: () => void }) {
  const navigate = useNavigate();
  const lands = useLandStore((s) => s.lands);
  const activityOf = useTabletStore((s) => s.activityOf);
  const show = useToastStore((s) => s.show);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const land = lands.get(tablet.landId);
  const sizeKb = (tabletSizeBytes(tablet) / 1024).toFixed(1);
  const activityPct = Math.round(activityOf(tablet.id) * 100);

  return (
    <>
      <Glass
        variant="panel"
        className="fixed inset-x-0 bottom-14 z-30 rounded-t-2xl rounded-b-none p-4 lg:inset-x-auto lg:bottom-auto lg:right-3 lg:top-14 lg:w-60 lg:rounded-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif-kr text-base font-bold text-text-1">
              {tablet.title}
              {tablet.pinned && <span className="ml-1 text-accent">★</span>}
            </h2>
            <p className="mt-0.5 text-xs text-text-2">
              {land?.name ?? tablet.landId}
              {tablet.wardPath ? ` › ${tablet.wardPath}` : ''}
            </p>
          </div>
          <button className="text-text-2 hover:text-text-1" onClick={onClose} aria-label="닫기">
            <X size={16} />
          </button>
        </div>

        <dl className="mt-3 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between">
            <dt className="text-text-2">활성도</dt>
            <dd className="text-text-1">{activityPct}%</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-2">용량</dt>
            <dd className="text-text-1">{sizeKb}KB</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-2">상태</dt>
            <dd className="text-text-1">{tablet.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-2">유형</dt>
            <dd className="text-text-1">{tablet.type}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-2">중요도</dt>
            <dd className="text-text-1">{tablet.priority}</dd>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate(`/edit/${tablet.id}`)}>
            편집
          </Button>
          <Dropdown
            value={tablet.landId}
            options={[...lands.values()].map((l) => ({ value: l.id, label: `이동: ${l.name}` }))}
            onChange={(landId) => {
              if (landId !== tablet.landId) {
                void useTabletStore.getState().moveToLand(tablet.id, landId);
                show('판을 이동했습니다', 'success');
              }
            }}
            className="w-full"
          />
          <Button variant="danger" size="sm" className="col-span-2" onClick={() => setConfirmDelete(true)}>
            삭제
          </Button>
        </div>
      </Glass>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="판 삭제">
        <p className="text-sm text-text-2">
          「{tablet.title}」이(가) 바다 아래로 가라앉습니다. 삭제할까요?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" onClick={() => setConfirmDelete(false)}>
            취소
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              void useTabletStore.getState().remove(tablet.id);
              setConfirmDelete(false);
              onClose();
              show('판이 삭제되었습니다', 'info');
            }}
          >
            삭제
          </Button>
        </div>
      </Modal>
    </>
  );
}
