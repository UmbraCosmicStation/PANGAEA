import {
  deserializeTablet,
  serializeTablet,
  type IStorage,
  type Land,
  type LandId,
  type Tablet,
  type TabletId,
} from '@pangaea/core';

/**
 * OPFS(Origin Private File System) 기반 IStorage 구현 (M1-A2a)
 * 디렉토리 구조 (기획서 §15.1): lands/{land_id}/{ward_path?}/{id}.md
 * id → 경로 매핑은 _index.json에 유지.
 */

interface TabletIndexEntry {
  landId: LandId;
  wardPath?: string;
}

type TabletIndex = Record<TabletId, TabletIndexEntry>;

const INDEX_FILE = '_index.json';

async function getDir(
  parent: FileSystemDirectoryHandle,
  path: string[],
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  let dir = parent;
  for (const segment of path) {
    try {
      dir = await dir.getDirectoryHandle(segment, { create });
    } catch {
      return null;
    }
  }
  return dir;
}

async function readText(dir: FileSystemDirectoryHandle, name: string): Promise<string | null> {
  try {
    const handle = await dir.getFileHandle(name);
    const file = await handle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

async function writeText(
  dir: FileSystemDirectoryHandle,
  name: string,
  content: string | Uint8Array,
): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  // Uint8Array<ArrayBufferLike> → BufferSource 호환을 위해 복사본 사용
  await writable.write(typeof content === 'string' ? content : new Uint8Array(content));
  await writable.close();
}

export class OpfsStorage implements IStorage {
  private root!: FileSystemDirectoryHandle;
  private index: TabletIndex = {};
  private ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    const opfsRoot = await navigator.storage.getDirectory();
    this.root = await opfsRoot.getDirectoryHandle('pangaea', { create: true });
    const raw = await readText(this.root, INDEX_FILE);
    if (raw) {
      try {
        this.index = JSON.parse(raw) as TabletIndex;
      } catch {
        // 인덱스 손상 → 재빌드 (기획서 §21.3: 판 데이터에는 영향 없음)
        this.index = await this.rebuildIndex();
      }
    }
  }

  private async persistIndex(): Promise<void> {
    await writeText(this.root, INDEX_FILE, JSON.stringify(this.index));
  }

  /** lands/ 하위를 스캔해 인덱스 재구성 */
  private async rebuildIndex(): Promise<TabletIndex> {
    const index: TabletIndex = {};
    const landsDir = await getDir(this.root, ['lands'], false);
    if (!landsDir) return index;
    for await (const [landId, landHandle] of landsDir.entries()) {
      if (landHandle.kind !== 'directory') continue;
      const scan = async (dir: FileSystemDirectoryHandle, wardPath?: string) => {
        for await (const [name, handle] of dir.entries()) {
          if (handle.kind === 'directory') {
            await scan(handle, wardPath ? `${wardPath}/${name}` : name);
          } else if (name.endsWith('.md')) {
            index[name.slice(0, -3)] = { landId, wardPath };
          }
        }
      };
      await scan(landHandle);
    }
    return index;
  }

  private tabletDirPath(entry: TabletIndexEntry): string[] {
    const path = ['lands', entry.landId];
    if (entry.wardPath) path.push(...entry.wardPath.split('/'));
    return path;
  }

  async readTablet(id: TabletId): Promise<Tablet | null> {
    await this.ready;
    const entry = this.index[id];
    if (!entry) return null;
    const dir = await getDir(this.root, this.tabletDirPath(entry), false);
    if (!dir) return null;
    const content = await readText(dir, `${id}.md`);
    if (content === null) return null;
    return deserializeTablet(content, { id, now: new Date().toISOString() });
  }

  async writeTablet(tablet: Tablet): Promise<void> {
    await this.ready;
    const prev = this.index[tablet.id];
    const next: TabletIndexEntry = { landId: tablet.landId, wardPath: tablet.wardPath };

    // 토지/영역 이동 시 이전 파일 제거
    if (prev && (prev.landId !== next.landId || prev.wardPath !== next.wardPath)) {
      const oldDir = await getDir(this.root, this.tabletDirPath(prev), false);
      if (oldDir) {
        try {
          await oldDir.removeEntry(`${tablet.id}.md`);
        } catch {
          /* 이미 없음 — 무시 */
        }
      }
    }

    const dir = await getDir(this.root, this.tabletDirPath(next), true);
    if (!dir) throw new Error(`저장 디렉토리를 열 수 없습니다: ${next.landId}`);
    await writeText(dir, `${tablet.id}.md`, serializeTablet(tablet));
    this.index[tablet.id] = next;
    await this.persistIndex();
  }

  async deleteTablet(id: TabletId): Promise<void> {
    await this.ready;
    const entry = this.index[id];
    if (!entry) return;
    const dir = await getDir(this.root, this.tabletDirPath(entry), false);
    if (dir) {
      try {
        await dir.removeEntry(`${id}.md`);
      } catch {
        /* 이미 없음 */
      }
    }
    delete this.index[id];
    await this.persistIndex();
  }

  async listTablets(landId?: LandId): Promise<Tablet[]> {
    await this.ready;
    const ids = Object.entries(this.index)
      .filter(([, e]) => !landId || e.landId === landId)
      .map(([id]) => id);
    const tablets = await Promise.all(ids.map((id) => this.readTablet(id)));
    return tablets.filter((t): t is Tablet => t !== null);
  }

  async readLand(id: LandId): Promise<Land | null> {
    await this.ready;
    const dir = await getDir(this.root, ['lands', id], false);
    if (!dir) return null;
    const raw = await readText(dir, 'land.json');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Land;
    } catch {
      return null;
    }
  }

  async writeLand(land: Land): Promise<void> {
    await this.ready;
    const dir = await getDir(this.root, ['lands', land.id], true);
    if (!dir) throw new Error(`토지 디렉토리를 열 수 없습니다: ${land.id}`);
    await writeText(dir, 'land.json', JSON.stringify(land, null, 2));
  }

  async deleteLand(id: LandId): Promise<void> {
    await this.ready;
    try {
      const landsDir = await getDir(this.root, ['lands'], false);
      if (landsDir) await landsDir.removeEntry(id, { recursive: true });
    } catch {
      /* 이미 없음 */
    }
    for (const [tabletId, entry] of Object.entries(this.index)) {
      if (entry.landId === id) delete this.index[tabletId];
    }
    await this.persistIndex();
  }

  async listLands(): Promise<Land[]> {
    await this.ready;
    const landsDir = await getDir(this.root, ['lands'], false);
    if (!landsDir) return [];
    const lands: Land[] = [];
    for await (const [id, handle] of landsDir.entries()) {
      if (handle.kind !== 'directory') continue;
      const land = await this.readLand(id);
      if (land) lands.push(land);
    }
    return lands;
  }

  async writeAsset(name: string, data: Uint8Array): Promise<string> {
    await this.ready;
    const dir = await getDir(this.root, ['assets'], true);
    if (!dir) throw new Error('에셋 디렉토리를 열 수 없습니다');
    await writeText(dir, name, data);
    return `assets/${name}`;
  }

  async readAsset(path: string): Promise<Uint8Array | null> {
    await this.ready;
    const name = path.replace(/^assets\//, '');
    const dir = await getDir(this.root, ['assets'], false);
    if (!dir) return null;
    try {
      const handle = await dir.getFileHandle(name);
      const file = await handle.getFile();
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      return null;
    }
  }

  async readJson<T>(name: string): Promise<T | null> {
    await this.ready;
    const raw = await readText(this.root, `${name}.json`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async writeJson<T>(name: string, value: T): Promise<void> {
    await this.ready;
    await writeText(this.root, `${name}.json`, JSON.stringify(value));
  }
}
