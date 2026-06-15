import type { ILLMClient, LlmMessage, LlmResponse } from '@pangaea/core';

/**
 * Anthropic 클라이언트 (BYOK, M2-C) — 브라우저에서 직접 호출.
 * 키는 로컬(OPFS)에만 저장. repo 커밋 대상 아님 (기획서 §13.3.1).
 * 서버 게이트웨이(Phase 2)로 교체 시 ILLMClient 구현만 바꾸면 됨.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-fable-5';

export class AnthropicClient implements ILLMClient {
  constructor(private apiKey: string) {}

  isReal(): boolean {
    return this.apiKey.trim().length > 0;
  }

  async complete(args: {
    system: string;
    messages: LlmMessage[];
    maxTokens?: number;
  }): Promise<LlmResponse> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        // 브라우저 직접 호출 허용 (BYOK 전용)
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: args.maxTokens ?? 1024,
        system: args.system,
        messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`모아이 호출 실패 (${res.status}): ${detail.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      content: { type: string; text?: string }[];
      usage: { input_tokens: number; output_tokens: number };
    };
    const text = data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('');
    return {
      text,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    };
  }
}
