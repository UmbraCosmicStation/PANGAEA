/**
 * 잉크(Ink) 경제 (기획서 §11.4) — 순수 함수
 * Free 월 30 / Pro 월 300. 미사용분 이월 없음(월 리셋).
 */

export const INK_QUOTA = { free: 30, pro: 300 } as const;
export type Plan = keyof typeof INK_QUOTA;

export interface InkLedger {
  plan: Plan;
  /** 이번 달 사용량 */
  spent: number;
  /** YYYY-MM — 이 달 기준. 다르면 리셋 */
  period: string;
}

export function periodOf(epochMs: number, tzOffsetMinutes: number): string {
  const local = new Date(epochMs - tzOffsetMinutes * 60_000);
  return local.toISOString().slice(0, 7);
}

export function newLedger(plan: Plan, period: string): InkLedger {
  return { plan, spent: 0, period };
}

export function quotaOf(ledger: InkLedger): number {
  return INK_QUOTA[ledger.plan];
}

export function remaining(ledger: InkLedger): number {
  return Math.max(0, quotaOf(ledger) - ledger.spent);
}

/** 월이 바뀌었으면 사용량 리셋 */
export function rolloverIfNeeded(ledger: InkLedger, period: string): InkLedger {
  return ledger.period === period ? ledger : { ...ledger, spent: 0, period };
}

export function canAfford(ledger: InkLedger, cost: number): boolean {
  return remaining(ledger) >= cost;
}

/** 잉크 차감 — 부족하면 변경 없이 그대로 반환 (호출 전 canAfford 확인 권장) */
export function spendInk(ledger: InkLedger, cost: number): InkLedger {
  if (!canAfford(ledger, cost)) return ledger;
  return { ...ledger, spent: ledger.spent + cost };
}

/** 잉크 부족 경고 임계 (기획서 §8.7.2) */
export function isInkLow(ledger: InkLedger): boolean {
  return remaining(ledger) <= 5;
}
