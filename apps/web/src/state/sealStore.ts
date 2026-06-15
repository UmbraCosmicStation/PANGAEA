import { create } from 'zustand';
import {
  applyWeeklyRecharge,
  canCreate,
  consumeSeal,
  grantBonus,
  newSealLedger,
  sealRemaining,
  type SealLedger,
} from '@pangaea/core';
import { getStorage } from '../data/storage';

/**
 * 인장(Seal) 상태 (M2-D5) — 새 판 생성 슬롯.
 * 앱 부팅 시 주간 충전 반영. 새 판 생성 시 1 소모.
 */

interface SealState {
  ledger: SealLedger;
  load: () => Promise<void>;
  canCreate: () => boolean;
  remaining: () => number;
  /** 새 판 생성 직전 호출 — 가능하면 1 소모하고 true */
  tryConsume: () => Promise<boolean>;
  grant: (amount: number) => Promise<void>;
  setUnlimited: (unlimited: boolean) => Promise<void>;
}

function tz(): number {
  return new Date().getTimezoneOffset();
}

async function persist(ledger: SealLedger): Promise<void> {
  await getStorage().writeJson('seal_ledger', ledger);
}

export const useSealStore = create<SealState>((set, get) => ({
  ledger: newSealLedger(),

  load: async () => {
    const saved = await getStorage().readJson<SealLedger>('seal_ledger');
    const ledger = applyWeeklyRecharge(saved ?? newSealLedger(), Date.now(), tz());
    set({ ledger });
    if (!saved || saved.lastRechargeMonday !== ledger.lastRechargeMonday) await persist(ledger);
  },

  canCreate: () => canCreate(get().ledger),
  remaining: () => sealRemaining(get().ledger),

  tryConsume: async () => {
    if (!canCreate(get().ledger)) return false;
    const ledger = consumeSeal(get().ledger);
    set({ ledger });
    await persist(ledger);
    return true;
  },

  grant: async (amount) => {
    const ledger = grantBonus(get().ledger, amount);
    set({ ledger });
    await persist(ledger);
  },

  setUnlimited: async (unlimited) => {
    const ledger = { ...get().ledger, unlimited };
    set({ ledger });
    await persist(ledger);
  },
}));
