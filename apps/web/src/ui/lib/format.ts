import type { RuneStatus } from '@pangaea/core';

/** 상대 시간 표기 */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  if (days < 30) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

/** status 룬 2D 폴백 심볼 (기획서 §5.3) */
export const STATUS_SYMBOLS: Record<RuneStatus, string> = {
  inbox: '⧉',
  draft: '✎',
  active: '🔥',
  blocked: '⛔',
  done: '🏛',
  archived: '◫',
};
