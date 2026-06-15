import { useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { Landmark } from 'lucide-react';
import type { SkillOutput, TabletId } from '@pangaea/core';
import { useMoaiStore } from '../../state/moaiStore';
import { useTabletStore } from '../../state/tabletStore';
import { Glass } from '../components/Glass';
import { Button } from '../components/Button';

const SKILLS: Array<{ id: string; label: string }> = [
  { id: 'mason:summarize', label: '요약' },
  { id: 'mason:translate', label: '영어 번역' },
  { id: 'mason:tone', label: '정중한 톤' },
  { id: 'mason:rune', label: '룬 추천' },
];

/**
 * 에디터 인라인 모아이 (M2-C6) — 현재 판에 석공 스킬 실행 → 승인 후 적용.
 */
export function InlineMoai({
  view,
  tabletId,
  body,
}: {
  view: EditorView | null;
  tabletId: TabletId;
  body: () => string;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SkillOutput | null>(null);
  const busy = useMoaiStore((s) => s.busy);

  const run = async (skillId: string) => {
    setOpen(false);
    setResult(null);
    const prompt =
      skillId === 'mason:translate' ? '영어로 번역' : skillId === 'mason:tone' ? '정중한 톤으로' : '';
    const out = await useMoaiStore.getState().runSkill(skillId, { content: body(), prompt }, tabletId);
    if (out) setResult(out);
  };

  const apply = () => {
    if (!result) return;
    const p = result.proposal;
    if (p.kind === 'replace_body' && view) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: p.body } });
      view.focus();
    } else if (p.kind === 'insert_text' && view) {
      view.dispatch({ changes: { from: 0, insert: p.text } });
      view.focus();
    } else if (p.kind === 'set_runes') {
      void useTabletStore.getState().updateMeta(tabletId, {
        ...(p.status ? { status: p.status as never } : {}),
        ...(p.type ? { type: p.type as never } : {}),
        ...(p.priority ? { priority: p.priority as never } : {}),
      });
    }
    setResult(null);
  };

  return (
    <div className="relative">
      <button
        className="glass spring flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-2 transition-colors hover:text-accent"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-label="모아이"
      >
        <Landmark size={14} /> 🗿
      </button>

      {open && (
        <Glass variant="panel" className="absolute right-0 top-9 z-30 w-32 rounded-lg p-1">
          {SKILLS.map((s) => (
            <button
              key={s.id}
              className="block w-full rounded px-3 py-1.5 text-left text-xs text-text-1 transition-colors hover:bg-white/15"
              onClick={() => void run(s.id)}
            >
              {s.label}
            </button>
          ))}
        </Glass>
      )}

      {result && (
        <Glass
          variant="panel"
          className="absolute right-0 top-9 z-30 w-72 rounded-xl p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-text-1">
            {result.preview}
          </p>
          <div className="mt-1 text-[10px] text-text-3">
            {result.skillName} · {result.inkSpent} Ink
          </div>
          <div className="mt-2 flex justify-end gap-1.5">
            {result.proposal.kind !== 'none' && (
              <Button variant="primary" size="sm" onClick={apply}>
                적용
              </Button>
            )}
            <Button size="sm" onClick={() => setResult(null)}>
              닫기
            </Button>
          </div>
        </Glass>
      )}
    </div>
  );
}
