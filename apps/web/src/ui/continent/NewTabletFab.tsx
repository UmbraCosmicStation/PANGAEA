import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DOCK_LAND_ID } from '@pangaea/core';
import { useLandStore } from '../../state/landStore';
import { useTabletStore } from '../../state/tabletStore';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Dropdown } from '../components/Dropdown';

/** 새 판 생성 FAB (기획서 §4.9.4) — 토지 선택 → 에디터 진입 */
export function NewTabletFab() {
  const navigate = useNavigate();
  const lands = useLandStore((s) => s.lands);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [landId, setLandId] = useState<string>(DOCK_LAND_ID);

  const landOptions = [...lands.values()]
    .filter((l) => l.type !== 'archive')
    .map((l) => ({ value: l.id, label: l.name }));

  const createAndEdit = async () => {
    const tablet = await useTabletStore.getState().create({
      title: title.trim() || '제목 없음',
      landId,
    });
    setOpen(false);
    setTitle('');
    navigate(`/edit/${tablet.id}`);
  };

  return (
    <>
      <button
        className="glass spring fixed bottom-20 right-3 z-30 flex h-12 w-12 items-center justify-center rounded-full text-accent shadow-[0_0_16px_rgba(240,201,92,0.3)] transition-transform hover:scale-105 lg:bottom-6 lg:right-6"
        onClick={() => setOpen(true)}
        aria-label="새 판"
      >
        <Plus size={22} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="새 판 새기기">
        <div className="space-y-3">
          <input
            autoFocus
            className="glass w-full rounded-lg px-3 py-2 text-sm text-text-1 placeholder:text-text-3 focus:outline-none"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void createAndEdit();
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-2">토지</span>
            <Dropdown value={landId} options={landOptions} onChange={setLandId} />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button variant="primary" size="sm" onClick={() => void createAndEdit()}>
              새기기
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
