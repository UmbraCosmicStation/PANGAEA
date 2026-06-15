import { useEffect, useRef, useState } from 'react';
import { Landmark, Send } from 'lucide-react';
import { useMoaiStore, type ChatMessage } from '../../state/moaiStore';
import { setApiKey } from '../../data/api/llm';
import { Glass } from '../components/Glass';
import { Button } from '../components/Button';
import { cn } from '../lib/cn';

/** 모아이 탭 (M2-C5) — 대화형 AI 허브 */
export function MoaiTab() {
  const messages = useMoaiStore((s) => s.messages);
  const busy = useMoaiStore((s) => s.busy);
  const ledger = useMoaiStore((s) => s.ledger);
  const hasKey = useMoaiStore((s) => s.hasKey);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    void useMoaiStore.getState().send(text);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="glass-bar z-10 flex h-12 shrink-0 items-center justify-between border-b border-(--glass-border) px-4">
        <h1 className="flex items-center gap-1.5 font-serif-kr text-sm font-bold text-text-1">
          <Landmark size={16} /> 모아이
        </h1>
        <span className="font-mono text-xs text-text-2">
          잉크 {useMoaiStore.getState().inkRemaining()}/{ledger.plan === 'pro' ? 300 : 30}
        </span>
      </header>

      {!hasKey && <KeyConnectBanner />}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-24 pt-3 lg:pb-4">
        {messages.length === 0 ? (
          <div className="pt-12 text-center text-sm text-text-2">
            <p className="text-2xl">🗿</p>
            <p className="mt-2">석공에게 무엇이든 요청하세요</p>
            <p className="mt-1 text-xs text-text-3">
              "이 판 요약해줘" · "영어로 번역" · "룬 추천"
            </p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      <div className="glass-bar absolute inset-x-0 bottom-14 z-10 flex items-center gap-2 border-t border-(--glass-border) px-3 py-2 lg:bottom-0 lg:left-[60px]">
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-text-1 placeholder:text-text-3 focus:outline-none"
          placeholder="메시지 입력..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          disabled={busy}
        />
        <button
          className="shrink-0 text-accent disabled:opacity-40"
          onClick={send}
          disabled={busy || !input.trim()}
          aria-label="보내기"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const approve = useMoaiStore((s) => s.approve);
  const dismiss = useMoaiStore((s) => s.dismiss);
  const isUser = message.role === 'user';

  if (message.pending) {
    return (
      <div className="flex justify-start">
        <Glass className="rounded-2xl px-4 py-2 text-sm text-text-2">🗿 생각하는 중…</Glass>
      </div>
    );
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <Glass
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
          isUser ? 'border-accent/30 bg-accent/10 text-text-1' : 'text-text-1',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>

        {message.output && !isUser && (
          <>
            <div className="mt-1.5 text-[10px] text-text-3">
              {message.output.skillName} · {message.output.inkSpent} Ink
            </div>
            {!message.resolved && message.output.proposal.kind !== 'none' && message.targetTabletId && (
              <div className="mt-2 flex gap-1.5">
                <Button variant="primary" size="sm" onClick={() => void approve(message.id)}>
                  승인
                </Button>
                <Button size="sm" onClick={() => dismiss(message.id)}>
                  취소
                </Button>
              </div>
            )}
            {message.resolved && message.output.proposal.kind !== 'none' && (
              <div className="mt-1 text-[10px] text-success">반영됨 ✓</div>
            )}
          </>
        )}
      </Glass>
    </div>
  );
}

/** BYOK 키 연결 배너 */
function KeyConnectBanner() {
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState('');

  const save = async () => {
    await setApiKey(key.trim());
    await useMoaiStore.getState().refreshKey();
    setEditing(false);
    setKey('');
  };

  return (
    <div className="mx-3 mt-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
      <p className="text-xs text-text-1">
        🗿 모아이가 잠들어 있습니다. Anthropic API 키를 연결하면 깨어납니다 (BYOK · 키는 이 기기에만 저장).
      </p>
      {editing ? (
        <div className="mt-2 flex gap-2">
          <input
            type="password"
            autoFocus
            className="glass min-w-0 flex-1 rounded-lg px-3 py-1.5 text-xs text-text-1 placeholder:text-text-3 focus:outline-none"
            placeholder="sk-ant-..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
            }}
          />
          <Button variant="primary" size="sm" onClick={() => void save()} disabled={!key.trim()}>
            연결
          </Button>
        </div>
      ) : (
        <button className="mt-2 text-xs text-accent underline" onClick={() => setEditing(true)}>
          API 키 연결하기
        </button>
      )}
    </div>
  );
}
