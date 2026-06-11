import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';

interface DropdownOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface DropdownProps<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  className,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        className="glass spring flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-text-1 transition-colors hover:bg-white/15"
        onClick={() => setOpen((v) => !v)}
      >
        {current?.label ?? value}
        <ChevronDown size={13} className="text-text-2" />
      </button>
      {open && (
        <div className="glass-panel absolute z-40 mt-1 min-w-full overflow-hidden rounded-lg py-1">
          {options.map((o) => (
            <button
              key={o.value}
              className={cn(
                'block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/15',
                o.value === value ? 'text-accent' : 'text-text-1',
              )}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
