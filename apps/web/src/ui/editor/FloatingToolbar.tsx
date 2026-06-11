import type { EditorView } from '@codemirror/view';
import { Bold, CheckSquare, Heading2, Image, Italic, Link2, List, Slash } from 'lucide-react';
import { insertAtCursor, prefixLine, wrapSelection } from './cmExtensions';

/** 모바일 플로팅 툴바 (M1-B7) — 키보드 위 1줄 */
export function FloatingToolbar({
  view,
  onImagePick,
}: {
  view: EditorView | null;
  onImagePick: () => void;
}) {
  if (!view) return null;
  const items = [
    { icon: Heading2, label: '제목', run: () => prefixLine(view, '## ') },
    { icon: Bold, label: '굵게', run: () => wrapSelection(view, '**') },
    { icon: Italic, label: '기울임', run: () => wrapSelection(view, '*') },
    { icon: List, label: '목록', run: () => prefixLine(view, '- ') },
    { icon: CheckSquare, label: '체크', run: () => prefixLine(view, '- [ ] ') },
    { icon: Link2, label: '링크', run: () => insertAtCursor(view, '[[') },
    { icon: Image, label: '이미지', run: onImagePick },
    { icon: Slash, label: '커맨드', run: () => insertAtCursor(view, '/') },
  ];
  return (
    <div className="glass-bar fixed inset-x-0 bottom-0 z-40 flex h-12 items-stretch justify-around border-t border-(--glass-border) pb-[env(safe-area-inset-bottom)] lg:hidden">
      {items.map(({ icon: Icon, label, run }) => (
        <button
          key={label}
          aria-label={label}
          className="flex flex-1 items-center justify-center text-text-2 active:text-accent"
          onPointerDown={(e) => {
            e.preventDefault(); // 키보드 포커스 유지
            run();
          }}
        >
          <Icon size={19} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
