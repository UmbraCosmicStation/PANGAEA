/**
 * 스킬 라우터 (기획서 §10.1) — 자연어 의도 분석 → 스킬 ID 선택.
 * M2: 키워드 기반 휴리스틱. Phase 3+ LLM tool_use 기반으로 교체 가능.
 */

export type MasonSkillId =
  | 'mason:summarize'
  | 'mason:translate'
  | 'mason:tone'
  | 'mason:rune'
  | 'mason:assign'
  | 'mason:draft';

interface RouteRule {
  id: MasonSkillId;
  patterns: RegExp[];
}

const RULES: RouteRule[] = [
  { id: 'mason:summarize', patterns: [/요약|줄여|핵심|간추려|summar/i] },
  { id: 'mason:translate', patterns: [/번역|영어로|일본어로|중국어로|translat/i] },
  { id: 'mason:tone', patterns: [/톤|말투|격식|구어|존댓말|반말|정중|블로그|보고서/i] },
  { id: 'mason:rune', patterns: [/룬|상태|분류|status|태그|priority|중요도/i] },
  { id: 'mason:assign', patterns: [/배정|어디로|토지|분류해|어느 토지/i] },
  { id: 'mason:draft', patterns: [/만들어|작성|초안|써줘|생성|draft|글 좀/i] },
];

export interface RouteResult {
  skillId: MasonSkillId;
  /** 0~1 — 매칭 신뢰도 (참고용) */
  confidence: number;
}

/**
 * 프롬프트를 스킬로 라우팅. 매칭이 없으면 기본 summarize (판 컨텍스트가 있을 때).
 */
export function routeIntent(prompt: string): RouteResult {
  const text = prompt.trim();
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { skillId: rule.id, confidence: 0.8 };
    }
  }
  // 매칭 실패 → 자유 작성으로 간주
  return { skillId: 'mason:draft', confidence: 0.3 };
}

/** 번역 대상 언어 추출 (간단 휴리스틱) */
export function detectTargetLanguage(prompt: string): string {
  if (/영어|english/i.test(prompt)) return '영어';
  if (/일본어|japanese/i.test(prompt)) return '일본어';
  if (/중국어|chinese/i.test(prompt)) return '중국어';
  if (/한국어|korean/i.test(prompt)) return '한국어';
  return '영어';
}
