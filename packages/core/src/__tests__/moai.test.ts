import { describe, expect, it } from 'vitest';
import { detectTargetLanguage, routeIntent } from '../domain/moai/router';
import { createMasonSkill, parseRuneSuggestion, tokensToInk } from '../domain/moai/skills';
import {
  canAfford,
  isInkLow,
  newLedger,
  periodOf,
  quotaOf,
  remaining,
  rolloverIfNeeded,
  spendInk,
  type InkLedger,
} from '../domain/economy/ink';
import type { ILLMClient } from '../interfaces/ILLMClient';

describe('routeIntent', () => {
  it('키워드로 스킬을 선택한다', () => {
    expect(routeIntent('이 판 요약해줘').skillId).toBe('mason:summarize');
    expect(routeIntent('영어로 번역해줘').skillId).toBe('mason:translate');
    expect(routeIntent('말투를 정중하게 바꿔줘').skillId).toBe('mason:tone');
    expect(routeIntent('상태 룬 추천해줘').skillId).toBe('mason:rune');
    expect(routeIntent('어느 토지에 배정할까').skillId).toBe('mason:assign');
  });

  it('매칭 실패 시 초안 작성으로 폴백한다', () => {
    const r = routeIntent('음 그냥 아무거나');
    expect(r.skillId).toBe('mason:draft');
    expect(r.confidence).toBeLessThan(0.5);
  });

  it('번역 대상 언어를 추출한다', () => {
    expect(detectTargetLanguage('일본어로 번역')).toBe('일본어');
    expect(detectTargetLanguage('translate to english')).toBe('영어');
    expect(detectTargetLanguage('번역해줘')).toBe('영어'); // 기본값
  });
});

describe('parseRuneSuggestion', () => {
  it('형식화된 응답에서 룬을 파싱한다', () => {
    const r = parseRuneSuggestion('status: active\ntype: output\npriority: high');
    expect(r).toEqual({ status: 'active', type: 'output', priority: 'high' });
  });

  it('잘못된 룬 값은 무시한다', () => {
    const r = parseRuneSuggestion('status: 없는값\ntype: note');
    expect(r.status).toBeUndefined();
    expect(r.type).toBe('note');
  });
});

describe('tokensToInk', () => {
  it('처리 토큰을 1000으로 나눈 올림, 최소 1', () => {
    expect(tokensToInk(100, 50)).toBe(1);
    expect(tokensToInk(1200, 900)).toBe(3);
  });
});

describe('createMasonSkill (mock LLM)', () => {
  const mockLlm: ILLMClient = {
    isReal: () => false,
    complete: async () => ({ text: '요약된 결과 3줄', inputTokens: 500, outputTokens: 100 }),
  };

  it('요약 스킬은 insert_text 제안을 만든다', async () => {
    const skill = createMasonSkill('mason:summarize', mockLlm);
    const out = await skill.execute({ content: '긴 노트 내용'.repeat(50) });
    expect(out.skillId).toBe('mason:summarize');
    expect(out.proposal.kind).toBe('insert_text');
    expect(out.inkSpent).toBe(1);
    expect(out.preview).toContain('요약된 결과');
  });

  it('번역 스킬은 replace_body 제안을 만든다', async () => {
    const skill = createMasonSkill('mason:translate', mockLlm);
    const out = await skill.execute({ content: 'hello', prompt: '영어로 번역' });
    expect(out.proposal.kind).toBe('replace_body');
  });

  it('잉크 추정은 입력 길이에 비례한다', () => {
    const skill = createMasonSkill('mason:summarize', mockLlm);
    const small = skill.estimateInk({ content: '짧음' });
    const big = skill.estimateInk({ content: '아주 긴 내용'.repeat(2000) });
    expect(big).toBeGreaterThan(small);
  });

  it('알 수 없는 스킬은 에러', () => {
    expect(() => createMasonSkill('mason:nonexistent', mockLlm)).toThrow();
  });
});

describe('ink ledger', () => {
  it('Free/Pro 할당량', () => {
    expect(quotaOf(newLedger('free', '2026-06'))).toBe(30);
    expect(quotaOf(newLedger('pro', '2026-06'))).toBe(300);
  });

  it('차감과 잔량', () => {
    const ledger = newLedger('free', '2026-06');
    expect(remaining(ledger)).toBe(30);
    expect(remaining(spendInk(ledger, 5))).toBe(25);
  });

  it('잔량 부족 시 차감하지 않는다', () => {
    const ledger: InkLedger = { plan: 'free', spent: 28, period: '2026-06' };
    expect(canAfford(ledger, 5)).toBe(false);
    expect(spendInk(ledger, 5).spent).toBe(28);
  });

  it('월이 바뀌면 사용량 리셋', () => {
    const ledger = { plan: 'free' as const, spent: 25, period: '2026-06' };
    expect(rolloverIfNeeded(ledger, '2026-07').spent).toBe(0);
    expect(rolloverIfNeeded(ledger, '2026-06').spent).toBe(25);
  });

  it('잔량 5 이하면 부족 경고', () => {
    expect(isInkLow({ plan: 'free', spent: 25, period: '2026-06' })).toBe(true);
    expect(isInkLow({ plan: 'free', spent: 20, period: '2026-06' })).toBe(false);
  });

  it('periodOf는 로컬 타임존 기준 YYYY-MM', () => {
    const utc = new Date('2026-06-30T16:00:00Z').getTime();
    expect(periodOf(utc, -540)).toBe('2026-07'); // KST +9h → 7월 1일
  });
});
