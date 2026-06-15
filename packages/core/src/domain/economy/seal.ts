/**
 * 인장(Seal) 경제 (기획서 §11.3) — 순수 함수
 * Free: 초기 30, 매주 월요일 +5, 상한 50. Pro: 무제한.
 * 인장은 "대륙에 새 블록이 솟는 행위"(새 .md 판 생성)에만 소모.
 */

export const SEAL_INITIAL = 30;
export const SEAL_WEEKLY = 5;
export const SEAL_CAP = 50;

export interface SealLedger {
  /** Pro면 무제한 (소모/충전 무시) */
  unlimited: boolean;
  balance: number;
  /** 마지막 주간 충전이 반영된 주의 월요일 (YYYY-MM-DD). 빈 문자열 = 미충전 */
  lastRechargeMonday: string;
}

export function newSealLedger(unlimited = false): SealLedger {
  return { unlimited, balance: unlimited ? 0 : SEAL_INITIAL, lastRechargeMonday: '' };
}

/** 주어진 시각이 속한 주의 월요일 (로컬 타임존, YYYY-MM-DD) */
export function mondayOf(epochMs: number, tzOffsetMinutes: number): string {
  const local = new Date(epochMs - tzOffsetMinutes * 60_000);
  const day = local.getUTCDay(); // 0=일 … 1=월
  const diff = (day + 6) % 7; // 월요일까지 거슬러 갈 일수
  local.setUTCDate(local.getUTCDate() - diff);
  return local.toISOString().slice(0, 10);
}

/**
 * 주간 충전 적용 — 마지막 충전 월요일 이후 지난 주 수만큼 +5 (상한 50).
 * 상한 도달 시 추가분 소멸 (누적 안 됨).
 */
export function applyWeeklyRecharge(
  ledger: SealLedger,
  nowMs: number,
  tzOffsetMinutes: number,
): SealLedger {
  if (ledger.unlimited) return ledger;
  const thisMonday = mondayOf(nowMs, tzOffsetMinutes);
  if (ledger.lastRechargeMonday === '') {
    return { ...ledger, lastRechargeMonday: thisMonday };
  }
  if (ledger.lastRechargeMonday >= thisMonday) return ledger;

  const last = new Date(ledger.lastRechargeMonday + 'T00:00:00Z').getTime();
  const cur = new Date(thisMonday + 'T00:00:00Z').getTime();
  const weeks = Math.round((cur - last) / (7 * 86_400_000));
  if (weeks <= 0) return ledger;

  // 이미 상한이면 충전분 소멸하되 기준일만 갱신
  const balance = Math.min(SEAL_CAP, ledger.balance + weeks * SEAL_WEEKLY);
  return { ...ledger, balance, lastRechargeMonday: thisMonday };
}

export function canCreate(ledger: SealLedger): boolean {
  return ledger.unlimited || ledger.balance > 0;
}

/** 새 판 생성 시 1 인장 소모 (Pro는 무시) */
export function consumeSeal(ledger: SealLedger): SealLedger {
  if (ledger.unlimited || ledger.balance <= 0) return ledger;
  return { ...ledger, balance: ledger.balance - 1 };
}

/** 업적 보너스 — 1회성, 상한 초과 허용 (기획서 §11.3) */
export function grantBonus(ledger: SealLedger, amount: number): SealLedger {
  if (ledger.unlimited) return ledger;
  return { ...ledger, balance: ledger.balance + amount };
}

export function sealRemaining(ledger: SealLedger): number {
  return ledger.unlimited ? Infinity : ledger.balance;
}
