import type { ILLMClient, LlmResponse } from '@pangaea/core';

/**
 * 모의 LLM (M2-C) — BYOK 키가 없을 때의 폴백.
 * 실제 추론 없이 스킬 형식에 맞는 안내 응답을 돌려준다(잉크 미소모 취지).
 */
export class MockLlm implements ILLMClient {
  isReal(): boolean {
    return false;
  }

  async complete(args: { system: string; messages: { content: string }[] }): Promise<LlmResponse> {
    // 시스템 프롬프트로 스킬 종류를 대략 추론해 형식 맞춤 응답
    let text: string;
    if (/룬을 추천/.test(args.system)) {
      text = 'status: active\ntype: note\npriority: medium';
    } else if (/요약/.test(args.system)) {
      text = '(모의) 이 판의 핵심을 3줄로 요약하려면 모아이 설정에서 API 키를 연결하세요.';
    } else if (/번역/.test(args.system)) {
      text = '(mock) Connect an API key in Moai settings to enable real translation.';
    } else {
      text =
        '🗿 모아이가 잠들어 있습니다. 프로필 → 모아이 설정에서 Anthropic API 키를 연결하면 깨어납니다. (BYOK)';
    }
    // 모의는 잉크 0에 가깝게
    return { text, inputTokens: 0, outputTokens: Math.ceil(text.length / 3) };
  }
}
