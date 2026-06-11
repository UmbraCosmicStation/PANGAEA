import type { IStorage } from '@pangaea/core';
import { OpfsStorage } from './opfsStorage';
import { MemoryStorage } from './memoryStorage';

let instance: IStorage | null = null;

/** 저장소 싱글톤. OPFS 지원 시 OPFS, 아니면 인메모리 폴백. */
export function getStorage(): IStorage {
  if (!instance) {
    instance =
      typeof navigator !== 'undefined' &&
      typeof navigator.storage?.getDirectory === 'function'
        ? new OpfsStorage()
        : new MemoryStorage();
  }
  return instance;
}

/** 테스트용 — 저장소 교체 */
export function setStorage(storage: IStorage): void {
  instance = storage;
}
