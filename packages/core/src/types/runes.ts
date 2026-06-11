/**
 * 룬(Rune) — 판을 가로지르는 구조화 분류 (기획서 §2.5)
 * Phase 1 고정 룬: status / type / priority
 */

export const RUNE_STATUSES = ['inbox', 'draft', 'active', 'blocked', 'done', 'archived'] as const;
export type RuneStatus = (typeof RUNE_STATUSES)[number];

export const RUNE_TYPES = ['note', 'idea', 'meeting', 'clip', 'output', 'reference'] as const;
export type RuneType = (typeof RUNE_TYPES)[number];

export const RUNE_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type RunePriority = (typeof RUNE_PRIORITIES)[number];

export interface Runes {
  status: RuneStatus;
  type: RuneType;
  priority: RunePriority;
}

export const DEFAULT_RUNES: Runes = {
  status: 'draft',
  type: 'note',
  priority: 'medium',
};

export function isRuneStatus(v: unknown): v is RuneStatus {
  return typeof v === 'string' && (RUNE_STATUSES as readonly string[]).includes(v);
}

export function isRuneType(v: unknown): v is RuneType {
  return typeof v === 'string' && (RUNE_TYPES as readonly string[]).includes(v);
}

export function isRunePriority(v: unknown): v is RunePriority {
  return typeof v === 'string' && (RUNE_PRIORITIES as readonly string[]).includes(v);
}
