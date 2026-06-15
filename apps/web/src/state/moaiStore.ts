import { create } from 'zustand';
import {
  canAfford,
  createMasonSkill,
  isInkLow,
  newLedger,
  periodOf,
  remaining,
  rolloverIfNeeded,
  routeIntent,
  spendInk,
  type InkLedger,
  type Plan,
  type SkillInput,
  type SkillOutput,
  type SkillProposal,
} from '@pangaea/core';
import { getStorage } from '../data/storage';
import { getLlm } from '../data/api/llm';
import { useTabletStore } from './tabletStore';
import { useLandStore } from './landStore';

/**
 * 모아이 상태 (M2-C5) — 대화, 잉크 원장, 스킬 실행.
 * 제안은 항상 사용자 승인 후 반영 (기획서 §10.4).
 */

export interface ChatMessage {
  id: number;
  role: 'user' | 'moai';
  text: string;
  /** moai 메시지에만 — 승인 대기 중인 제안 */
  output?: SkillOutput;
  /** 제안 대상 판 */
  targetTabletId?: string;
  /** 승인/취소 처리 완료 */
  resolved?: boolean;
  pending?: boolean;
}

function nowPeriod(): string {
  return periodOf(Date.now(), new Date().getTimezoneOffset());
}

let nextId = 1;

interface MoaiState {
  ledger: InkLedger;
  messages: ChatMessage[];
  busy: boolean;
  hasKey: boolean;

  load: () => Promise<void>;
  setPlan: (plan: Plan) => Promise<void>;
  refreshKey: () => Promise<void>;
  inkRemaining: () => number;
  inkLow: () => boolean;

  /** 자유 자연어 → 라우팅 → 스킬 실행 → 승인 대기 메시지 */
  send: (prompt: string, targetTabletId?: string) => Promise<void>;
  /** 특정 스킬 직접 실행 (인라인 호출용) */
  runSkill: (
    skillId: string,
    input: SkillInput,
    targetTabletId?: string,
  ) => Promise<SkillOutput | null>;
  approve: (messageId: number) => Promise<void>;
  dismiss: (messageId: number) => void;
}

async function persistLedger(ledger: InkLedger): Promise<void> {
  await getStorage().writeJson('ink_ledger', ledger);
}

export const useMoaiStore = create<MoaiState>((set, get) => {
  /** 스킬 실행 + 잉크 차감. 메시지/busy 관리는 호출자가. */
  async function executeSkill(skillId: string, input: SkillInput): Promise<SkillOutput> {
    const llm = await getLlm();
    const skill = createMasonSkill(skillId, llm);
    const estimate = skill.estimateInk(input);
    if (llm.isReal() && !canAfford(get().ledger, estimate)) {
      throw new Error('잉크가 부족합니다. 프로필에서 플랜을 확인하세요.');
    }
    const out = await skill.execute(input);
    if (llm.isReal() && out.inkSpent > 0) {
      const ledger = spendInk(get().ledger, out.inkSpent);
      set({ ledger });
      await persistLedger(ledger);
    }
    return out;
  }

  return {
    ledger: newLedger('free', nowPeriod()),
    messages: [],
    busy: false,
    hasKey: false,

    load: async () => {
      const saved = await getStorage().readJson<InkLedger>('ink_ledger');
      const ledger = rolloverIfNeeded(saved ?? newLedger('free', nowPeriod()), nowPeriod());
      const key = (await getStorage().readJson<string>('moai_key')) ?? '';
      set({ ledger, hasKey: key.length > 0 });
    },

    setPlan: async (plan) => {
      const ledger = { ...get().ledger, plan };
      set({ ledger });
      await persistLedger(ledger);
    },

    refreshKey: async () => {
      const key = (await getStorage().readJson<string>('moai_key')) ?? '';
      set({ hasKey: key.length > 0 });
    },

    inkRemaining: () => remaining(get().ledger),
    inkLow: () => isInkLow(get().ledger),

    send: async (prompt, targetTabletId) => {
      if (get().busy || !prompt.trim()) return;
      const userMsg: ChatMessage = { id: nextId++, role: 'user', text: prompt };
      const pendingMsg: ChatMessage = { id: nextId++, role: 'moai', text: '', pending: true };
      set((s) => ({ messages: [...s.messages, userMsg, pendingMsg], busy: true }));

      try {
        const route = routeIntent(prompt);
        const content = targetTabletId
          ? useTabletStore.getState().tablets.get(targetTabletId)?.body
          : undefined;
        const landNames = [...useLandStore.getState().lands.values()]
          .filter((l) => l.type !== 'archive')
          .map((l) => l.name)
          .join(', ');
        const input: SkillInput = {
          prompt: route.skillId === 'mason:assign' ? landNames : prompt,
          content,
        };
        const out = await executeSkill(route.skillId, input);
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, pending: false, text: out.preview, output: out, targetTabletId }
              : m,
          ),
          busy: false,
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류';
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, pending: false, text: `⚠ ${msg}`, resolved: true }
              : m,
          ),
          busy: false,
        }));
      }
    },

    runSkill: async (skillId, input, targetTabletId) => {
      if (get().busy) return null;
      set({ busy: true });
      try {
        const out = await executeSkill(skillId, input);
        const msg: ChatMessage = {
          id: nextId++,
          role: 'moai',
          text: out.preview,
          output: out,
          targetTabletId,
        };
        set((s) => ({ messages: [...s.messages, msg], busy: false }));
        return out;
      } catch {
        set({ busy: false });
        return null;
      }
    },

    approve: async (messageId) => {
      const msg = get().messages.find((m) => m.id === messageId);
      if (!msg?.output || !msg.targetTabletId) {
        get().dismiss(messageId);
        return;
      }
      await applyProposal(msg.output.proposal, msg.targetTabletId);
      set((s) => ({
        messages: s.messages.map((m) => (m.id === messageId ? { ...m, resolved: true } : m)),
      }));
    },

    dismiss: (messageId) => {
      set((s) => ({
        messages: s.messages.map((m) => (m.id === messageId ? { ...m, resolved: true } : m)),
      }));
    },
  };
});

/** 제안 적용 — 판 저장소에 반영 (기획서 §10.4 승인 후) */
async function applyProposal(proposal: SkillProposal, tabletId: string): Promise<void> {
  const ts = useTabletStore.getState();
  const tablet = ts.tablets.get(tabletId);
  if (!tablet) return;

  switch (proposal.kind) {
    case 'replace_body':
      await ts.saveBody(tabletId, proposal.body);
      break;
    case 'insert_text':
      await ts.saveBody(tabletId, proposal.text + tablet.body);
      break;
    case 'set_runes':
      await ts.updateMeta(tabletId, {
        ...(proposal.status ? { status: proposal.status as never } : {}),
        ...(proposal.type ? { type: proposal.type as never } : {}),
        ...(proposal.priority ? { priority: proposal.priority as never } : {}),
      });
      break;
    case 'assign_land':
      await ts.moveToLand(tabletId, proposal.landId);
      break;
    case 'none':
      break;
  }
}
