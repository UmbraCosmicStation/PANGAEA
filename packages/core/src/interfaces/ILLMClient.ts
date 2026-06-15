/**
 * LLM 클라이언트 인터페이스 (기획서 §16.0)
 * 구현체: AnthropicClient(BYOK) / MockLlm(키 없음) → Phase 2+ 잉크 게이트웨이
 */

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ILLMClient {
  /** true = 실제 LLM. false = 모의 응답 (잉크 미소모) */
  isReal(): boolean;
  complete(args: {
    system: string;
    messages: LlmMessage[];
    maxTokens?: number;
  }): Promise<LlmResponse>;
}
