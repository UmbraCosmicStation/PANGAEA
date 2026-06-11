import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  RUNE_PRIORITIES,
  RUNE_STATUSES,
  RUNE_TYPES,
  type RunePriority,
  type RuneStatus,
  type RuneType,
  type Tablet,
} from '@pangaea/core';
import { useLandStore } from '../../state/landStore';
import { useTabletStore } from '../../state/tabletStore';
import { Dropdown } from '../components/Dropdown';

/** front-matter 메타 패널 (M1-B3) — 접이식 */
export function MetaPanel({ tablet }: { tablet: Tablet }) {
  const [open, setOpen] = useState(false);
  const lands = useLandStore((s) => s.lands);
  const updateMeta = useTabletStore((s) => s.updateMeta);

  const landOptions = [...lands.values()].map((l) => ({ value: l.id, label: l.name }));

  return (
    <div className="glass-bar border-b border-(--glass-border)">
      <button
        className="flex w-full items-center justify-between px-4 py-1.5 text-xs text-text-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-mono">
          {tablet.status} · {tablet.type} · {tablet.priority}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <Dropdown
            value={tablet.landId}
            options={landOptions}
            onChange={(landId) => void updateMeta(tablet.id, { landId })}
          />
          <Dropdown
            value={tablet.status}
            options={RUNE_STATUSES.map((v) => ({ value: v, label: v }))}
            onChange={(status) => void updateMeta(tablet.id, { status: status as RuneStatus })}
          />
          <Dropdown
            value={tablet.type}
            options={RUNE_TYPES.map((v) => ({ value: v, label: v }))}
            onChange={(type) => void updateMeta(tablet.id, { type: type as RuneType })}
          />
          <Dropdown
            value={tablet.priority}
            options={RUNE_PRIORITIES.map((v) => ({ value: v, label: v }))}
            onChange={(priority) =>
              void updateMeta(tablet.id, { priority: priority as RunePriority })
            }
          />
          <input
            className="glass rounded-lg px-3 py-1.5 text-xs text-text-1 placeholder:text-text-3 focus:outline-none"
            placeholder="#태그 (쉼표 구분)"
            defaultValue={tablet.tags.join(', ')}
            onBlur={(e) => {
              const tags = e.target.value
                .split(',')
                .map((t) => t.trim().replace(/^#/, ''))
                .filter(Boolean);
              void updateMeta(tablet.id, { tags });
            }}
          />
          <input
            type="date"
            className="glass rounded-lg px-3 py-1 text-xs text-text-1 focus:outline-none"
            defaultValue={tablet.remindAt ?? ''}
            onChange={(e) =>
              void updateMeta(tablet.id, { remindAt: e.target.value || undefined })
            }
          />
        </div>
      )}
    </div>
  );
}
