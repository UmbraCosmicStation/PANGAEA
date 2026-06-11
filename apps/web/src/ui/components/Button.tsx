import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type ButtonVariant = 'primary' | 'ghost' | 'danger';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent/90 text-[#3a2e10] font-medium hover:bg-accent shadow-[0_0_12px_rgba(240,201,92,0.25)]',
  ghost: 'glass text-text-1 hover:bg-white/15',
  danger: 'bg-error/85 text-white hover:bg-error',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

export function Button({ variant = 'ghost', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'spring inline-flex items-center justify-center gap-1.5 rounded-xl transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    />
  );
}
