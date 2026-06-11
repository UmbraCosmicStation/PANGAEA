import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type GlassVariant = 'default' | 'bar' | 'panel';

const VARIANT_CLASS: Record<GlassVariant, string> = {
  default: 'glass',
  bar: 'glass-bar',
  panel: 'glass-panel',
};

interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
}

/** 리퀴드 글래스 표면 (M1-D6, 기획서 DS.4) */
export function Glass({ variant = 'default', className, ...props }: GlassProps) {
  return <div className={cn(VARIANT_CLASS[variant], className)} {...props} />;
}
