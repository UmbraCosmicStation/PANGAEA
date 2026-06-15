import type { LandId, TabletId } from '../types/schema';

/**
 * 모아이 스킬 인터페이스 (기획서 §10.1, §16.0)
 * M1에서는 타입만 정의. 구현은 M2-C (모아이 v0).
 */
export interface SkillInput {
  /** 대상 판 — 석공 스킬은 현재 판만 (기획서 §15.4) */
  tabletIds?: TabletId[];
  landId?: LandId;
  prompt?: string;
  /** 대상 판 본문 — 호출자가 주입 (스킬은 저장소에 직접 접근하지 않음) */
  content?: string;
}

/** 승인 시 적용할 구조화 제안 (기획서 §10.4 — diff 미리보기 + 승인) */
export type SkillProposal =
  | { kind: 'replace_body'; body: string }
  | { kind: 'insert_text'; text: string }
  | { kind: 'set_runes'; status?: string; type?: string; priority?: string }
  | { kind: 'assign_land'; landId: LandId }
  | { kind: 'none' };

export interface SkillOutput {
  /** 사용자 승인 전 미리보기 (diff 필수 원칙) */
  preview: string;
  proposal: SkillProposal;
  inkSpent: number;
  /** 어떤 스킬이 실행됐는지 표시용 */
  skillId: string;
  skillName: string;
}

export interface ISkill {
  /** 예: "mason:summarize" */
  id: string;
  name: string;
  trigger: 'request' | 'auto';
  estimateInk(input: SkillInput): number;
  execute(input: SkillInput): Promise<SkillOutput>;
}
