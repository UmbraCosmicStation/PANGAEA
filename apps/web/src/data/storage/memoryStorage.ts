import type { IStorage, Land, LandId, Tablet, TabletId } from '@pangaea/core';

/** 인메모리 IStorage — 테스트 및 OPFS 미지원 브라우저 폴백 */
export class MemoryStorage implements IStorage {
  private tablets = new Map<TabletId, Tablet>();
  private lands = new Map<LandId, Land>();
  private assets = new Map<string, Uint8Array>();
  private json = new Map<string, unknown>();

  async readTablet(id: TabletId): Promise<Tablet | null> {
    return this.tablets.get(id) ?? null;
  }
  async writeTablet(tablet: Tablet): Promise<void> {
    this.tablets.set(tablet.id, structuredClone(tablet));
  }
  async deleteTablet(id: TabletId): Promise<void> {
    this.tablets.delete(id);
  }
  async listTablets(landId?: LandId): Promise<Tablet[]> {
    const all = [...this.tablets.values()];
    return landId ? all.filter((t) => t.landId === landId) : all;
  }

  async readLand(id: LandId): Promise<Land | null> {
    return this.lands.get(id) ?? null;
  }
  async writeLand(land: Land): Promise<void> {
    this.lands.set(land.id, structuredClone(land));
  }
  async deleteLand(id: LandId): Promise<void> {
    this.lands.delete(id);
    for (const [tid, t] of this.tablets) if (t.landId === id) this.tablets.delete(tid);
  }
  async listLands(): Promise<Land[]> {
    return [...this.lands.values()];
  }

  async writeAsset(name: string, data: Uint8Array): Promise<string> {
    this.assets.set(name, data);
    return `assets/${name}`;
  }
  async readAsset(path: string): Promise<Uint8Array | null> {
    return this.assets.get(path.replace(/^assets\//, '')) ?? null;
  }

  async readJson<T>(name: string): Promise<T | null> {
    return (this.json.get(name) as T) ?? null;
  }
  async writeJson<T>(name: string, value: T): Promise<void> {
    this.json.set(name, structuredClone(value));
  }
}
