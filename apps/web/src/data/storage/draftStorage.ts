import type { TabletId } from '@pangaea/core';
import { getStorage } from './index';

/**
 * Draft 임시 파일 (M1-A5, 기획서 §8.5.3 저장 정책)
 * 크래시/저장 실패 대비. 정상 저장 성공 시 삭제.
 */

interface Draft {
  tabletId: TabletId;
  body: string;
  savedAt: string;
}

const key = (id: TabletId) => `draft_${id}`;

export async function writeDraft(tabletId: TabletId, body: string): Promise<void> {
  await getStorage().writeJson<Draft>(key(tabletId), {
    tabletId,
    body,
    savedAt: new Date().toISOString(),
  });
}

export async function readDraft(tabletId: TabletId): Promise<Draft | null> {
  return getStorage().readJson<Draft>(key(tabletId));
}

export async function clearDraft(tabletId: TabletId): Promise<void> {
  // 빈 draft로 덮어쓰기 (OPFS 파일 삭제 API를 단순화 — null 본문은 무시됨)
  await getStorage().writeJson<Draft | null>(key(tabletId), null);
}
