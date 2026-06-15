import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { EditorView } from '@codemirror/view';
import { ArrowLeft, BookOpen, PenLine } from 'lucide-react';
import { extractLinkIds, type TabletId } from '@pangaea/core';
import { useTabletStore } from '../../state/tabletStore';
import { useLandStore } from '../../state/landStore';
import { useUiStore } from '../../state/uiStore';
import { useToastStore } from '../../state/toastStore';
import { getStorage } from '../../data/storage';
import { clearDraft, readDraft, writeDraft } from '../../data/storage/draftStorage';
import { createMarkdownEditor, insertAtCursor } from './cmExtensions';
import { renderMarkdown } from './markdown';
import { MetaPanel } from './MetaPanel';
import { FloatingToolbar } from './FloatingToolbar';
import { InlineMoai } from './InlineMoai';
import { Button } from '../components/Button';
import { cn } from '../lib/cn';

/**
 * 판 에디터 (M1-B1~B8 + A5)
 * 소스 모드(CodeMirror) ↔ 읽기 모드(렌더). 자동 저장 + draft 복원.
 */
export function EditorScreen() {
  const { id } = useParams<{ id: TabletId }>();
  const [searchParams] = useSearchParams();
  const isFtue = searchParams.get('ftue') === '1';
  const navigate = useNavigate();
  const tablet = useTabletStore((s) => (id ? s.tablets.get(id) : undefined));
  const show = useToastStore((s) => s.show);
  const autosaveSec = useUiStore((s) => s.settings.autosaveIntervalSec);
  const fontSize = useUiStore((s) => s.settings.editorFontSizePx);

  const [mode, setMode] = useState<'source' | 'read'>('source');
  const [previewHtml, setPreviewHtml] = useState('');
  const [dirty, setDirty] = useState(false);
  // 렌더에서 참조 가능한 EditorView (FloatingToolbar 전달용)
  const [view, setView] = useState<EditorView | null>(null);
  // FTUE: 본문 줄 수 (3줄 이상이면 "저장하고 대륙 보기" 활성화)
  const [lineCount, setLineCount] = useState(0);

  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const bodyRef = useRef(tablet?.body ?? '');
  const dirtyRef = useRef(false);
  const autosaveTimer = useRef<number | undefined>(undefined);
  const draftTimer = useRef<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = useCallback(async () => {
    if (!id || !dirtyRef.current) return;
    const body = bodyRef.current;
    const { tablets, saveBody, updateMeta } = useTabletStore.getState();
    await saveBody(id, body);
    // [[링크]] → links[] 갱신 (다리 데이터 소스, M1-B5)
    const titleToId = new Map([...tablets.values()].map((t) => [t.title, t.id]));
    const links = extractLinkIds(body, titleToId).filter((l) => l !== id);
    const current = tablets.get(id);
    if (current && JSON.stringify(current.links) !== JSON.stringify(links)) {
      await updateMeta(id, { links });
    }
    await clearDraft(id);
    dirtyRef.current = false;
    setDirty(false);
  }, [id]);

  // 에디터 마운트 + draft 복원
  useEffect(() => {
    if (!id || !tablet || !hostRef.current || mode !== 'source') return;
    let disposed = false;

    void (async () => {
      let initialDoc = bodyRef.current || tablet.body;
      const draft = await readDraft(id);
      if (draft && draft.body && draft.body !== tablet.body) {
        if (window.confirm('저장되지 않은 변경사항이 있습니다. 복원할까요?')) {
          initialDoc = draft.body;
          dirtyRef.current = true;
          setDirty(true);
        } else {
          await clearDraft(id);
        }
      }
      if (disposed || !hostRef.current) return;

      bodyRef.current = initialDoc;
      viewRef.current = createMarkdownEditor({
        initialDoc,
        parent: hostRef.current,
        getTitles: () =>
          [...useTabletStore.getState().tablets.values()]
            .filter((t) => t.id !== id)
            .map((t) => t.title),
        onChange: (doc) => {
          bodyRef.current = doc;
          dirtyRef.current = true;
          setDirty(true);
          setLineCount(doc.split('\n').filter((l) => l.trim()).length);
          // draft는 1초 디바운스로 기록 (크래시 안전망)
          window.clearTimeout(draftTimer.current);
          draftTimer.current = window.setTimeout(() => void writeDraft(id, doc), 1000);
          // 자동 저장 타이머 리셋 (기본 30초)
          if (autosaveSec > 0) {
            window.clearTimeout(autosaveTimer.current);
            autosaveTimer.current = window.setTimeout(() => void save(), autosaveSec * 1000);
          }
        },
        onSaveShortcut: () => {
          void save().then(() => show('저장됨', 'success', 1200));
        },
      });
      viewRef.current.focus();
      setView(viewRef.current);
    })();

    return () => {
      disposed = true;
      window.clearTimeout(autosaveTimer.current);
      window.clearTimeout(draftTimer.current);
      viewRef.current?.destroy();
      viewRef.current = null;
      setView(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode]);

  // 열람 기록 (활성도 view, 10분 중복 제거는 도메인에서)
  useEffect(() => {
    if (id) void useTabletStore.getState().recordViewFor(id);
  }, [id]);

  // 읽기 모드 진입 시 렌더
  useEffect(() => {
    if (mode !== 'read') return;
    void renderMarkdown(bodyRef.current || tablet?.body || '').then(setPreviewHtml);
  }, [mode, tablet]);

  // 이탈/언마운트 시 즉시 저장 (기획서: 데이터 유실 없음)
  useEffect(() => {
    return () => {
      void save();
    };
  }, [save]);

  const insertImage = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop() ?? 'png';
      const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await getStorage().writeAsset(name, new Uint8Array(await file.arrayBuffer()));
      if (viewRef.current) insertAtCursor(viewRef.current, `![](asset:${name})\n`);
    },
    [],
  );

  if (!id || !tablet) {
    return (
      <div className="flex h-dvh items-center justify-center text-text-2">
        판을 찾을 수 없습니다
      </div>
    );
  }

  const landName = useLandStore.getState().lands.get(tablet.landId)?.name ?? tablet.landId;

  return (
    <div
      className="flex h-dvh flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) void insertImage(file);
      }}
      onPaste={(e) => {
        const file = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'));
        if (file) {
          e.preventDefault();
          void insertImage(file);
        }
      }}
    >
      {/* 상단 바 */}
      <header className="glass-bar z-10 flex h-12 shrink-0 items-center gap-2 border-b border-(--glass-border) px-3">
        <button
          className="flex items-center gap-1 text-sm text-text-2 hover:text-text-1"
          onClick={() => {
            void save().then(() => navigate(-1));
          }}
        >
          <ArrowLeft size={17} /> 대륙
        </button>
        <input
          className="min-w-0 flex-1 bg-transparent text-center font-serif-kr text-sm font-bold text-text-1 focus:outline-none"
          defaultValue={tablet.title}
          onBlur={(e) => {
            const title = e.target.value.trim() || '제목 없음';
            if (title !== tablet.title)
              void useTabletStore.getState().updateMeta(id, { title });
          }}
        />
        <span className="hidden text-xs text-text-3 sm:inline">{landName}</span>
        <InlineMoai view={view} tabletId={id} body={() => bodyRef.current} />
        <Button
          size="sm"
          onClick={() => setMode((m) => (m === 'source' ? 'read' : 'source'))}
          aria-label="모드 전환"
        >
          {mode === 'source' ? <BookOpen size={15} /> : <PenLine size={15} />}
          {mode === 'source' ? '읽기' : '소스'}
        </Button>
        <span
          className={cn('h-1.5 w-1.5 rounded-full', dirty ? 'bg-accent' : 'bg-success')}
          title={dirty ? '저장되지 않음' : '저장됨'}
        />
      </header>

      <MetaPanel tablet={tablet} />

      {/* 본문 — 불투명 배경 (가독성 최우선, 기획서 DS.5) */}
      <div
        className="min-h-0 flex-1 overflow-auto bg-[rgba(10,22,40,0.92)] pb-12 lg:pb-0"
        style={{ ['--editor-font-size' as string]: `${fontSize}px` }}
      >
        {mode === 'source' ? (
          <div ref={hostRef} className="h-full text-text-1" />
        ) : (
          <article
            className="prose-pangaea mx-auto max-w-2xl px-4 py-6"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        )}
      </div>

      {/* 온보딩 가이드 오버레이 (M1-E2) */}
      {isFtue && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center px-4">
          <div className="glass-panel pointer-events-auto rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-text-1">아무거나 적어보세요 ✎</p>
            <p className="mt-0.5 text-xs text-text-2">
              3줄 이상 쓰면 첫 섬이 솟아오릅니다
            </p>
            {dirty && lineCount >= 3 && (
                <button
                  className="spring mt-2 rounded-lg bg-accent/90 px-4 py-1.5 text-xs font-medium text-[#3a2e10] transition-transform hover:scale-105"
                  onClick={() => {
                    void save().then(() => navigate('/', { replace: true }));
                  }}
                >
                  저장하고 대륙 보기 🏝
                </button>
              )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void insertImage(file);
          e.target.value = '';
        }}
      />
      {mode === 'source' && (
        <FloatingToolbar view={view} onImagePick={() => fileInputRef.current?.click()} />
      )}
    </div>
  );
}
