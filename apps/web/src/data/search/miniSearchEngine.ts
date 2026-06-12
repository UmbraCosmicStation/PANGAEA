import MiniSearch from 'minisearch';
import type { ISearchEngine, Tablet, TabletId } from '@pangaea/core';

/**
 * MiniSearch 기반 전문검색 (M2-A1, 기획서 §8.6.4)
 * 제목 가중치 3배, prefix + 약한 fuzzy. 한국어는 공백 토큰 기준.
 */
export class MiniSearchEngine implements ISearchEngine {
  private mini = MiniSearchEngine.createIndex();

  private static createIndex() {
    return new MiniSearch<{ id: string; title: string; body: string; tags: string }>({
      fields: ['title', 'body', 'tags'],
      idField: 'id',
      searchOptions: {
        boost: { title: 3, tags: 2 },
        prefix: true,
        fuzzy: 0.1,
        combineWith: 'AND',
      },
    });
  }

  private toDoc(t: Tablet) {
    return { id: t.id, title: t.title, body: t.body, tags: t.tags.join(' ') };
  }

  indexAll(tablets: Tablet[]): void {
    this.mini = MiniSearchEngine.createIndex();
    this.mini.addAll(tablets.map((t) => this.toDoc(t)));
  }

  upsert(tablet: Tablet): void {
    if (this.mini.has(tablet.id)) this.mini.discard(tablet.id);
    this.mini.add(this.toDoc(tablet));
  }

  remove(id: TabletId): void {
    if (this.mini.has(id)) this.mini.discard(id);
  }

  search(text: string): TabletId[] {
    return this.mini.search(text).map((r) => r.id as TabletId);
  }
}
