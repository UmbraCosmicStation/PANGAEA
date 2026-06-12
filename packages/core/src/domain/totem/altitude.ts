import type { RunePriority, RuneStatus, RuneType } from '../../types/runes';
import type { Bridge, LandId, TabletMeta } from '../../types/schema';
import { wardCapacity } from '../land/layout';

/**
 * 고도(Altitude) & 토템 2D 폴백 심볼 (기획서 §5.2, §5.3)
 * 토템은 한 번에 하나의 고도만 표시. 기본 = status(봉화).
 */

export const ALTITUDES = [
  { key: 'status', name: '봉화', hint: '불이 켜진 곳이 어디인가' },
  { key: 'type', name: '지형', hint: '어떤 건물들이 세워져 있는가' },
  { key: 'priority', name: '깃발', hint: '깃발이 꽂힌 곳은 어디인가' },
  { key: 'bridges', name: '항로', hint: '섬과 섬이 어떻게 이어지는가' },
  { key: 'health', name: '기후', hint: '어디가 비옥하고 어디가 건조한가' },
] as const;

export type Altitude = (typeof ALTITUDES)[number]['key'];

export const STATUS_TOTEMS: Record<RuneStatus, string> = {
  inbox: '⧉',
  draft: '✎',
  active: '🔥',
  blocked: '⛔',
  done: '🏛',
  archived: '◫',
};

export const TYPE_TOTEMS: Record<RuneType, string> = {
  note: '▣',
  idea: '⌁',
  meeting: '⌂',
  clip: '⌑',
  output: '△',
  reference: '≡',
};

export const PRIORITY_TOTEMS: Record<RunePriority, string> = {
  low: '·',
  medium: '•',
  high: '✦',
  urgent: '!',
};

export const BRIDGE_TOTEMS = { low: '○', medium: '—', high: '═', hub: '✣' } as const;
export const HEALTH_TOTEMS = { crowded: '≈', stale: '~', inbox_overflow: '⧉', balanced: '✳' } as const;

export type HealthState = keyof typeof HEALTH_TOTEMS;
export type BridgeDensity = keyof typeof BRIDGE_TOTEMS;

/** 개별 판 블록 위 토템 심볼 — 룬 고도(봉화/지형/깃발)에서만 (기획서 §5.4) */
export function blockTotem(meta: TabletMeta, altitude: Altitude): string | null {
  switch (altitude) {
    case 'status':
      return STATUS_TOTEMS[meta.status];
    case 'type':
      return TYPE_TOTEMS[meta.type];
    case 'priority':
      return PRIORITY_TOTEMS[meta.priority];
    default:
      return null; // 항로/기후는 토지(섬) 단위 표현
  }
}

/** 토지의 관리 상태 (기후 고도, 기획서 §5.3 health) */
export function landHealth(args: {
  tablets: ReadonlyArray<Pick<TabletMeta, 'updatedAt' | 'wardPath'>>;
  isDock: boolean;
  /** epoch ms */
  now: number;
}): HealthState {
  if (args.isDock) {
    return args.tablets.length >= 10 ? 'inbox_overflow' : 'balanced';
  }
  // 혼잡: 영역(또는 루트) 직속 판 수가 가드레일 경고선 이상
  const byWard = new Map<string, number>();
  for (const t of args.tablets) {
    const key = t.wardPath ?? '';
    byWard.set(key, (byWard.get(key) ?? 0) + 1);
  }
  for (const count of byWard.values()) {
    if (wardCapacity(count) !== 'ok') return 'crowded';
  }
  // 건조: 14일간 수정 없음 (판이 있을 때만)
  if (args.tablets.length > 0) {
    const latest = Math.max(...args.tablets.map((t) => new Date(t.updatedAt).getTime()));
    if (args.now - latest > 14 * 86_400_000) return 'stale';
  }
  return 'balanced';
}

/** 토지의 다리 밀도 (항로 고도) — 나가는 다리 수 기준 */
export function landBridgeDensity(landId: LandId, bridges: ReadonlyArray<Bridge>): BridgeDensity {
  const outgoing = bridges.filter(
    (b) => b.sourceLandId === landId || (b.bidirectional && b.targetLandId === landId),
  ).length;
  if (outgoing >= 4) return 'hub';
  if (outgoing >= 2) return 'high';
  if (outgoing >= 1) return 'medium';
  return 'low';
}
