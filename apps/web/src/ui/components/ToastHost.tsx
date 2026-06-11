import { useToastStore } from '../../state/toastStore';
import { cn } from '../lib/cn';

const KIND_CLASS = {
  info: 'border-info/40',
  success: 'border-success/50',
  error: 'border-error/50',
};

/** 토스트 렌더 호스트 — AppLayout에 1회 마운트 */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 lg:bottom-6">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            'glass pointer-events-auto rounded-[10px] px-4 py-2 text-sm text-text-1',
            KIND_CLASS[t.kind],
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
