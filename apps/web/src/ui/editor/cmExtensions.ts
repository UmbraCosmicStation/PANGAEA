import { EditorView, keymap, placeholder } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';

/** 슬래시 커맨드 (M1-B6, 기획서 §8.5.3) */
const SLASH_SNIPPETS: Array<{ label: string; detail: string; insert: string }> = [
  { label: '/제목', detail: 'H2 헤딩', insert: '## ' },
  { label: '/체크리스트', detail: '할 일 목록', insert: '- [ ] ' },
  { label: '/코드', detail: '코드 블록', insert: '```\n\n```' },
  { label: '/테이블', detail: '3×2 표', insert: '| 열1 | 열2 | 열3 |\n| --- | --- | --- |\n|  |  |  |' },
  { label: '/구분선', detail: '수평선', insert: '\n---\n' },
  { label: '/인용', detail: '인용구', insert: '> ' },
  { label: '/이미지', detail: '이미지 (드래그&드롭도 가능)', insert: '![](asset:)' },
];

function slashCompletion(context: CompletionContext): CompletionResult | null {
  const match = context.matchBefore(/\/[\w가-힣]*$/);
  if (!match) return null;
  // 줄 시작 또는 공백 뒤에서만
  const line = context.state.doc.lineAt(match.from);
  const before = context.state.sliceDoc(line.from, match.from);
  if (before.trim() !== '' && !/\s$/.test(before)) return null;
  return {
    from: match.from,
    options: SLASH_SNIPPETS.map(
      (s): Completion => ({
        label: s.label,
        detail: s.detail,
        apply: (view, _completion, from, to) => {
          view.dispatch({
            changes: { from, to, insert: s.insert },
            selection: { anchor: from + s.insert.length },
          });
        },
      }),
    ),
    filter: true,
  };
}

/** [[내부 링크]] 자동완성 (M1-B5) — 판 제목 목록은 호출 시점에 조회 */
function internalLinkCompletion(
  getTitles: () => string[],
): (context: CompletionContext) => CompletionResult | null {
  return (context) => {
    const match = context.matchBefore(/\[\[([^\]]*)$/);
    if (!match) return null;
    return {
      from: match.from + 2,
      options: getTitles().map(
        (title): Completion => ({
          label: title,
          apply: (view, _c, from, to) => {
            const insert = `${title}]]`;
            view.dispatch({
              changes: { from, to, insert },
              selection: { anchor: from + insert.length },
            });
          },
        }),
      ),
      filter: true,
    };
  };
}

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: 'var(--editor-font-size, 16px)',
    backgroundColor: 'transparent',
  },
  '.cm-content': {
    fontFamily: "'IBM Plex Sans KR', system-ui, sans-serif",
    caretColor: 'var(--accent)',
    padding: '16px 0',
  },
  '.cm-line': { padding: '0 16px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(240,201,92,0.25) !important' },
  '.cm-tooltip': {
    backgroundColor: 'rgba(15,30,50,0.95)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.9)',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'rgba(240,201,92,0.2)',
  },
});

export interface CreateEditorArgs {
  initialDoc: string;
  parent: HTMLElement;
  getTitles: () => string[];
  onChange: (doc: string) => void;
  onSaveShortcut: () => void;
}

export function createMarkdownEditor(args: CreateEditorArgs): EditorView {
  const extensions: Extension[] = [
    history(),
    keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          args.onSaveShortcut();
          return true;
        },
      },
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    markdown({ base: markdownLanguage }),
    syntaxHighlighting(defaultHighlightStyle),
    autocompletion({
      override: [slashCompletion, internalLinkCompletion(args.getTitles)],
      icons: false,
    }),
    placeholder('아무거나 적어보세요...'),
    EditorView.lineWrapping,
    editorTheme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) args.onChange(update.state.doc.toString());
    }),
  ];

  return new EditorView({
    state: EditorState.create({ doc: args.initialDoc, extensions }),
    parent: args.parent,
  });
}

/** 선택 영역을 마크업으로 감싸기 (툴바/단축키용) */
export function wrapSelection(view: EditorView, before: string, after = before): void {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: selected
      ? { anchor: from, head: to + before.length + after.length }
      : { anchor: from + before.length },
  });
  view.focus();
}

/** 줄 머리에 접두어 삽입 (헤딩/리스트/체크) */
export function prefixLine(view: EditorView, prefix: string): void {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  view.dispatch({ changes: { from: line.from, insert: prefix } });
  view.focus();
}

/** 커서 위치에 텍스트 삽입 */
export function insertAtCursor(view: EditorView, text: string): void {
  const { from } = view.state.selection.main;
  view.dispatch({
    changes: { from, insert: text },
    selection: { anchor: from + text.length },
  });
  view.focus();
}
