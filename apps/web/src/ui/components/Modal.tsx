import { useEffect, type ReactNode } from 'react';
import { Glass } from './Glass';
import { cn } from '../lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <Glass
        variant="panel"
        className={cn('w-full max-w-md rounded-2xl p-5', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-3 font-serif-kr text-lg font-bold text-text-1">{title}</h2>}
        {children}
      </Glass>
    </div>
  );
}
