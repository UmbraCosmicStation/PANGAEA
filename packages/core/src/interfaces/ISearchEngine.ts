import type { Tablet, TabletId } from '../types/schema';

/**
 * 전문검색 엔진 인터페이스 (기획서 §16.0)
 * 구현체: MiniSearchEngine(Phase 1) → 벡터 임베딩(Phase 2+)
 */
export interface ISearchEngine {
  indexAll(tablets: Tablet[]): void;
  upsert(tablet: Tablet): void;
  remove(id: TabletId): void;
  /** 텍스트 전문검색 — 관련도 순 ID 목록 */
  search(text: string): TabletId[];
}
