import type { Land, LandId, Tablet, TabletId } from '../types/schema';

/**
 * 저장소 인터페이스 (기획서 §16.0)
 * 구현체: OPFSStorage(Phase 1) → ServerSyncStorage(Phase 1) → GitHubStorage(Phase 2 레벨 A/B)
 */
export interface IStorage {
  readTablet(id: TabletId): Promise<Tablet | null>;
  writeTablet(tablet: Tablet): Promise<void>;
  deleteTablet(id: TabletId): Promise<void>;
  listTablets(landId?: LandId): Promise<Tablet[]>;

  readLand(id: LandId): Promise<Land | null>;
  writeLand(land: Land): Promise<void>;
  deleteLand(id: LandId): Promise<void>;
  listLands(): Promise<Land[]>;

  /** 바이너리 에셋(이미지 등) 저장 → 참조 경로 반환 */
  writeAsset(name: string, data: Uint8Array): Promise<string>;
  readAsset(path: string): Promise<Uint8Array | null>;

  /** 임의 JSON 보조 파일 (activity_log, layout, settings 등) */
  readJson<T>(name: string): Promise<T | null>;
  writeJson<T>(name: string, value: T): Promise<void>;
}
