import type { ILLMClient } from '../../interfaces/ILLMClient';
import type { ISkill, SkillInput, SkillOutput, SkillProposal } from '../../interfaces/ISkill';
import {
  isRunePriority,
  isRuneStatus,
  isRuneType,
  type RunePriority,
  type RuneStatus,
  type RuneType,
} from '../../types/runes';
import { detectTargetLanguage } from './router';

/**
 * 석공(Mason) 스킬 모듈 (기획서 §10.2 Phase 1, M2-C2~C3)
 * 모든 스킬은 ILLMClient를 주입받아 동작. 저장소/DOM 직접 접근 없음.
 */

/** 잉크 = ceil(처리 토큰 / 1000). 1 Ink ≈ 1000 토큰 (기획서 §11.4) */
export function tokensToInk(inputTokens: number, outputTokens: number): number {
  return Math.max(1, Math.ceil((inputTokens + outputTokens) / 1000));
}

/** LLM 응답에서 룬 추천 파싱 — `status: active` 형태 또는 JSON (순수 함수, 테스트 대상) */
export function parseRuneSuggestion(text: string): {
  status?: RuneStatus;
  type?: RuneType;
  priority?: RunePriority;
} {
  const result: { status?: RuneStatus; type?: RuneType; priority?: RunePriority } = {};
  const statusMatch = /status[:\s"]+([a-z]+)/i.exec(text);
  const typeMatch = /type[:\s"]+([a-z]+)/i.exec(text);
  const priorityMatch = /priority[:\s"]+([a-z]+)/i.exec(text);
  if (statusMatch && isRuneStatus(statusMatch[1]!.toLowerCase()))
    result.status = statusMatch[1]!.toLowerCase() as RuneStatus;
  if (typeMatch && isRuneType(typeMatch[1]!.toLowerCase()))
    result.type = typeMatch[1]!.toLowerCase() as RuneType;
  if (priorityMatch && isRunePriority(priorityMatch[1]!.toLowerCase()))
    result.priority = priorityMatch[1]!.toLowerCase() as RunePriority;
  return result;
}

function clip(s: string, n = 6000): string {
  return s.length > n ? s.slice(0, n) + '\n…(생략)' : s;
}

interface SkillDef {
  id: string;
  name: string;
  system: (input: SkillInput) => string;
  userMessage: (input: SkillInput) => string;
  /** LLM 응답 → 제안 변환 */
  toProposal: (responseText: string, input: SkillInput) => SkillProposal;
}

const SKILL_DEFS: Record<string, SkillDef> = {
  'mason:summarize': {
    id: 'mason:summarize',
    name: '석공:요약',
    system: () =>
      '너는 판게아의 석공이다. 주어진 노트를 한국어 3줄 이내로 핵심만 요약한다. 군더더기 없이.',
    userMessage: (i) => `다음 판을 3줄로 요약해줘:\n\n${clip(i.content ?? '')}`,
    toProposal: (text) => ({ kind: 'insert_text', text: `> **요약**\n> ${text.replace(/\n/g, '\n> ')}\n\n` }),
  },
  'mason:translate': {
    id: 'mason:translate',
    name: '석공:번역',
    system: (i) =>
      `너는 판게아의 석공이다. 주어진 노트를 ${detectTargetLanguage(i.prompt ?? '')}로 자연스럽게 번역한다. 마크다운 구조는 유지.`,
    userMessage: (i) => `다음 판을 번역해줘:\n\n${clip(i.content ?? '')}`,
    toProposal: (text) => ({ kind: 'replace_body', body: text }),
  },
  'mason:tone': {
    id: 'mason:tone',
    name: '석공:톤변환',
    system: (i) =>
      `너는 판게아의 석공이다. 요청한 톤으로 노트를 다시 쓴다. 요청: "${i.prompt ?? '정중한 톤'}". 의미는 유지하되 말투만 바꾼다.`,
    userMessage: (i) => `다음 판의 톤을 바꿔줘:\n\n${clip(i.content ?? '')}`,
    toProposal: (text) => ({ kind: 'replace_body', body: text }),
  },
  'mason:rune': {
    id: 'mason:rune',
    name: '석공:룬추천',
    system: () =>
      '너는 판게아의 석공이다. 노트 내용을 분석해 룬을 추천한다. ' +
      'status(inbox|draft|active|blocked|done|archived), type(note|idea|meeting|clip|output|reference), priority(low|medium|high|urgent) 중에서 ' +
      '정확히 다음 형식으로만 답한다:\nstatus: <값>\ntype: <값>\npriority: <값>',
    userMessage: (i) => `다음 판의 룬을 추천해줘:\n\n${clip(i.content ?? '', 3000)}`,
    toProposal: (text) => ({ kind: 'set_runes', ...parseRuneSuggestion(text) }),
  },
  'mason:assign': {
    id: 'mason:assign',
    name: '석공:배정',
    system: (i) =>
      '너는 판게아의 석공이다. 노트 내용을 보고 가장 어울리는 토지를 후보 중에서 하나 고른다. ' +
      `후보 토지: ${i.prompt ?? '(없음)'}. 토지 이름만 한 단어로 답한다.`,
    userMessage: (i) => `이 판을 어느 토지에 배정할까?\n\n${clip(i.content ?? '', 2000)}`,
    toProposal: () => ({ kind: 'none' }), // 배정은 호출자가 이름→ID 해석
  },
  'mason:draft': {
    id: 'mason:draft',
    name: '석공:초안',
    system: () =>
      '너는 판게아의 석공이다. 사용자의 요청에 맞춰 마크다운 노트 초안을 작성한다. 한국어로, 제목(##)과 구조를 갖춰서.',
    userMessage: (i) =>
      i.content
        ? `요청: ${i.prompt}\n\n현재 판 내용(참고):\n${clip(i.content, 2000)}`
        : `요청: ${i.prompt ?? '메모 작성'}`,
    toProposal: (text) => ({ kind: 'insert_text', text: text + '\n' }),
  },
};

/** 잉크 추정 — 입력 길이 기반 (실행 전 표시) */
function estimateInkFor(input: SkillInput): number {
  const inputLen = (input.content?.length ?? 0) + (input.prompt?.length ?? 0);
  const approxTokens = inputLen / 3; // 대략 3자 = 1토큰
  return Math.max(1, Math.ceil((approxTokens * 1.4) / 1000));
}

/** ILLMClient를 주입해 석공 스킬 인스턴스 생성 (기획서 §10.1 — 스킬은 교체 가능) */
export function createMasonSkill(skillId: string, llm: ILLMClient): ISkill {
  const def = SKILL_DEFS[skillId];
  if (!def) throw new Error(`알 수 없는 스킬: ${skillId}`);
  return {
    id: def.id,
    name: def.name,
    trigger: 'request',
    estimateInk: (input) => estimateInkFor(input),
    execute: async (input): Promise<SkillOutput> => {
      const res = await llm.complete({
        system: def.system(input),
        messages: [{ role: 'user', content: def.userMessage(input) }],
        maxTokens: 1500,
      });
      return {
        preview: res.text,
        proposal: def.toProposal(res.text, input),
        inkSpent: tokensToInk(res.inputTokens, res.outputTokens),
        skillId: def.id,
        skillName: def.name,
      };
    },
  };
}

export const MASON_SKILL_IDS = Object.keys(SKILL_DEFS);
