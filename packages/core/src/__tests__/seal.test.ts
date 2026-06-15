import { describe, expect, it } from 'vitest';
import {
  applyWeeklyRecharge,
  canCreate,
  consumeSeal,
  grantBonus,
  mondayOf,
  newSealLedger,
  SEAL_CAP,
  SEAL_INITIAL,
  sealRemaining,
  type SealLedger,
} from '../domain/economy/seal';

const TZ = 0; // UTC 기준 테스트

describe('seal ledger', () => {
  it('초기 지급 30', () => {
    expect(newSealLedger().balance).toBe(SEAL_INITIAL);
    expect(newSealLedger(true).unlimited).toBe(true);
  });

  it('판 생성 시 1 소모', () => {
    const led = newSealLedger();
    expect(consumeSeal(led).balance).toBe(29);
  });

  it('잔량 0이면 생성 불가, 소모해도 음수 안 됨', () => {
    const led: SealLedger = { unlimited: false, balance: 0, lastRechargeMonday: '' };
    expect(canCreate(led)).toBe(false);
    expect(consumeSeal(led).balance).toBe(0);
  });

  it('Pro 무제한은 소모/충전 무시', () => {
    const led = newSealLedger(true);
    expect(canCreate(led)).toBe(true);
    expect(consumeSeal(led).balance).toBe(0);
    expect(sealRemaining(led)).toBe(Infinity);
  });

  it('mondayOf: 해당 주의 월요일', () => {
    // 2026-06-12 = 금요일 → 월요일은 2026-06-08
    const fri = new Date('2026-06-12T10:00:00Z').getTime();
    expect(mondayOf(fri, TZ)).toBe('2026-06-08');
    // 월요일 당일
    const mon = new Date('2026-06-08T00:30:00Z').getTime();
    expect(mondayOf(mon, TZ)).toBe('2026-06-08');
    // 일요일 → 직전 월요일
    const sun = new Date('2026-06-14T23:00:00Z').getTime();
    expect(mondayOf(sun, TZ)).toBe('2026-06-08');
  });

  it('주간 충전: 첫 호출은 기준일만 설정', () => {
    const led = newSealLedger();
    const r = applyWeeklyRecharge(led, new Date('2026-06-12T10:00:00Z').getTime(), TZ);
    expect(r.balance).toBe(30);
    expect(r.lastRechargeMonday).toBe('2026-06-08');
  });

  it('주간 충전: 지난 주 수만큼 +5', () => {
    const led: SealLedger = { unlimited: false, balance: 20, lastRechargeMonday: '2026-06-01' };
    // 2주 경과 (06-01 → 06-15)
    const r = applyWeeklyRecharge(led, new Date('2026-06-15T10:00:00Z').getTime(), TZ);
    expect(r.balance).toBe(30); // 20 + 2*5
    expect(r.lastRechargeMonday).toBe('2026-06-15');
  });

  it('주간 충전: 상한 50 초과분 소멸', () => {
    const led: SealLedger = { unlimited: false, balance: 48, lastRechargeMonday: '2026-06-01' };
    const r = applyWeeklyRecharge(led, new Date('2026-06-15T10:00:00Z').getTime(), TZ);
    expect(r.balance).toBe(SEAL_CAP); // 48 + 10 → 50 캡
  });

  it('같은 주 재호출은 충전 없음', () => {
    const led: SealLedger = { unlimited: false, balance: 30, lastRechargeMonday: '2026-06-08' };
    const r = applyWeeklyRecharge(led, new Date('2026-06-10T10:00:00Z').getTime(), TZ);
    expect(r.balance).toBe(30);
  });

  it('업적 보너스는 상한 초과 허용', () => {
    const led: SealLedger = { unlimited: false, balance: 49, lastRechargeMonday: '' };
    expect(grantBonus(led, 2).balance).toBe(51);
  });
});
