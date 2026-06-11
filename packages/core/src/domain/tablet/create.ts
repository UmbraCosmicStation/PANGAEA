import { ulid } from 'ulid';
import type { Land, LandId, Tablet } from '../../types/schema';
import { DEFAULT_RUNES } from '../../types/runes';

/** 새 판 생성 (기획서 §15.1 — ID는 ulid) */
export function createTablet(args: {
  title: string;
  landId: LandId;
  wardPath?: string;
  body?: string;
  now?: string;
}): Tablet {
  const now = args.now ?? new Date().toISOString();
  return {
    id: ulid(),
    title: args.title,
    landId: args.landId,
    wardPath: args.wardPath,
    ...DEFAULT_RUNES,
    links: [],
    xset: [],
    tags: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
    body: args.body ?? '',
  };
}

/** 새 토지 생성 */
export function createLand(args: {
  id?: string;
  name: string;
  type?: Land['type'];
  now?: string;
}): Land {
  const now = args.now ?? new Date().toISOString();
  return {
    id: args.id ?? ulid().toLowerCase(),
    name: args.name,
    type: args.type ?? 'area',
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** 본문에서 `[[링크]]` 대상 ID 추출 — links[] 갱신용 (다리 데이터 소스) */
export function extractLinkIds(body: string, titleToId: ReadonlyMap<string, string>): string[] {
  const ids = new Set<string>();
  const re = /\[\[([^\]]+)\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const ref = m[1]!.trim();
    const byTitle = titleToId.get(ref);
    if (byTitle) ids.add(byTitle);
    else if (/^[0-9A-HJKMNP-TV-Z]{26}$/.test(ref)) ids.add(ref); // ulid 직접 참조
  }
  return [...ids];
}
