import type { ILLMClient } from '@pangaea/core';
import { getStorage } from '../storage';
import { AnthropicClient } from './anthropicClient';
import { MockLlm } from './mockLlm';

/**
 * LLM 클라이언트 팩토리 (M2-C)
 * BYOK 키가 있으면 Anthropic, 없으면 모의. 키는 OPFS에만 저장.
 */

const KEY_FILE = 'moai_key';
const mock = new MockLlm();

export async function getApiKey(): Promise<string> {
  return (await getStorage().readJson<string>(KEY_FILE)) ?? '';
}

export async function setApiKey(key: string): Promise<void> {
  await getStorage().writeJson(KEY_FILE, key.trim());
}

export async function getLlm(): Promise<ILLMClient> {
  const key = await getApiKey();
  return key ? new AnthropicClient(key) : mock;
}
