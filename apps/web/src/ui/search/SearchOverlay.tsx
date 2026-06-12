import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Search } from 'lucide-react';
import { parseSearchQuery } from '@pangaea/core';
import { useSearchStore } from '../../state/searchStore';
import { useTabletStore } from '../../state/tabletStore';
import { useLandStore } from '../../state/landStore';
import { Glass } from '../components/Glass';
import { STATUS_SYMBOLS } from '../lib/format';
import { cn } from '../lib/cn';

/** 본문에서 매치 주변 발췌 */
function snippet(body: string, text: string): string {
  if (!text) return body.slice(0, 80);
  const firstWord = text.split(/\s+/)[0] ?? '';
  const idx = body.toLowerCase().indexOf(firstWord.toLowerCase());
  if (idx < 0) return body.slice(0, 80);
  const start = Math.max(0, idx - 30);
  return (start > 0 ? '…' : '') + body.slice(start, idx + 50);
}

const QUICK_FILTERS = ['status:active', 'status:done', 'type:idea', 'priority:high', 'updated:today'];

/** 전역 검색 오버레이 (M2-A2, Cmd+K) */
export function SearchOverlay() {
  const navigate = useNavigate();
  const open = useSearchStore((s) => s.open);
  const query = useSearchStore((s) => s.query);
  const results = useSearchStore((s) => s.results);
  const setOpen = useSearchStore((s) => s.setOpen);
  const setQuery = useSearchStore((s) => s.setQuery);
  const applyHighlight = useSearchStore((s) => s.applyHighlight);
  const tablets = useTabletStore((s) => s.tablets);
  const lands = useLandStore((s) => s.lands);

  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 전역 Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useSearchStore.getState().open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setCursor(0);
        inputRef.current?.focus();
      }, 30);
    }
  }, [open]);

  const searchText = useMemo(() => parseSearchQuery(query).text, [query]);
  const shown = results.slice(0, 30);

  if (!open) return null;

  const openTablet = (id: string) => {
    setOpen(false);
    navigate(`/edit/${id}`);
  };

  const toggleQuickFilter = (token: string) => {
    const next = query.includes(token)
      ? query.replace(token, '').replace(/\s{2,}/g, ' ').trim()
      : `${token} ${query}`.trim();
    setQuery(next);
    inputRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <Glass
        variant="panel"
        className="flex max-h-[70vh] w-full max-w-xl flex-col rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-(--glass-border) px-4 py-3">
          <Search size={16} className="shrink-0 text-text-2" />
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent text-sm text-text-1 placeholder:text-text-3 focus:outline-none"
            placeholder="검색... (status:active #태그 land:일터 updated:today)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, shown.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === 'Enter' && shown[cursor]) {
                openTablet(shown[cursor]);
              }
            }}
          />
          {results.length > 0 && (
            <button
              className="glass spring flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] text-accent transition-colors hover:bg-white/15"
              onClick={() => {
                applyHighlight();
                navigate('/');
              }}
            >
              <Map size={12} /> 대륙에서 보기
            </button>
          )}
        </div>

        {/* 빠른 룬 필터 칩 (M2-A3) */}
        <div className="flex flex-wrap gap-1.5 px-4 py-2">
          {QUICK_FILTERS.map((token) => (
            <button
              key={token}
              className={cn(
                'glass rounded-full px-2.5 py-0.5 font-mono text-[10px] transition-colors',
                query.includes(token) ? 'border-accent/60 text-accent' : 'text-text-2 hover:text-text-1',
              )}
              onClick={() => toggleQuickFilter(token)}
            >
              {token}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {query.trim() === '' ? (
            <p className="px-3 py-6 text-center text-xs text-text-3">
              제목·본문·태그를 검색합니다. 룬 필터를 조합해보세요.
            </p>
          ) : shown.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-text-3">결과가 없습니다</p>
          ) : (
            shown.map((id, i) => {
              const t = tablets.get(id);
              if (!t) return null;
              return (
                <button
                  key={id}
                  className={cn(
                    'block w-full rounded-lg px-3 py-2 text-left transition-colors',
                    i === cursor ? 'bg-white/12' : 'hover:bg-white/8',
                  )}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => openTablet(id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-serif-kr text-sm font-bold text-text-1">
                      {STATUS_SYMBOLS[t.status]} {t.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-text-2">
                      {lands.get(t.landId)?.name ?? t.landId}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-text-2">{snippet(t.body, searchText)}</p>
                </button>
              );
            })
          )}
        </div>
      </Glass>
    </div>
  );
}
