import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { CrossSettlement, Tablet, TabletMeta } from '../../types/schema';
import { DOCK_LAND_ID } from '../../types/schema';
import { DEFAULT_RUNES, isRunePriority, isRuneStatus, isRuneType } from '../../types/runes';

/**
 * front-matter 파싱/직렬화 (기획서 §9.4, §15.1)
 * 파일 표기는 snake_case(land_id 등), 도메인 타입은 camelCase.
 */

const FM_DELIMITER = '---';

export interface ParsedTabletFile {
  meta: Partial<TabletMeta>;
  body: string;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function asXset(v: unknown): CrossSettlement[] {
  if (!Array.isArray(v)) return [];
  const out: CrossSettlement[] = [];
  for (const item of v) {
    if (item && typeof item === 'object') {
      const rec = item as Record<string, unknown>;
      const landId = asString(rec['land_id']);
      const createdAt = asString(rec['created_at']);
      if (landId && createdAt) {
        out.push({ landId, wardPath: asString(rec['ward_path']), createdAt });
      }
    }
  }
  return out;
}

/** `.md` 파일 내용 → 메타(부분) + 본문. front-matter가 없으면 전체를 본문으로. */
export function parseTabletFile(content: string): ParsedTabletFile {
  const normalized = content.replace(/^\uFEFF/, ''); // BOM 제거
  if (!normalized.startsWith(FM_DELIMITER + '\n') && normalized !== FM_DELIMITER) {
    return { meta: {}, body: normalized };
  }
  const end = normalized.indexOf('\n' + FM_DELIMITER, FM_DELIMITER.length);
  if (end === -1) {
    return { meta: {}, body: normalized };
  }
  const yamlText = normalized.slice(FM_DELIMITER.length + 1, end);
  let bodyStart = end + 1 + FM_DELIMITER.length;
  // 구분선 직후의 개행 1~2개 제거
  if (normalized[bodyStart] === '\n') bodyStart += 1;
  if (normalized[bodyStart] === '\n') bodyStart += 1;
  const body = normalized.slice(bodyStart);

  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch {
    // 손상된 front-matter — 본문은 보존 (실패는 안전하게, 기획서 §21.3)
    return { meta: {}, body: normalized };
  }
  if (!raw || typeof raw !== 'object') return { meta: {}, body };

  const rec = raw as Record<string, unknown>;
  const meta: Partial<TabletMeta> = {
    id: asString(rec['id']),
    title: asString(rec['title']),
    landId: asString(rec['land_id']),
    wardPath: asString(rec['ward_path']),
    status: isRuneStatus(rec['status']) ? rec['status'] : undefined,
    type: isRuneType(rec['type']) ? rec['type'] : undefined,
    priority: isRunePriority(rec['priority']) ? rec['priority'] : undefined,
    links: asStringArray(rec['links']),
    xset: asXset(rec['xset']),
    tags: asStringArray(rec['tags']),
    remindAt: asString(rec['remind_at']),
    pinned: typeof rec['pinned'] === 'boolean' ? rec['pinned'] : undefined,
    createdAt: asString(rec['created_at']),
    updatedAt: asString(rec['updated_at']),
  };
  return { meta, body };
}

/** 부분 메타 + 기본값 → 완전한 TabletMeta. 누락 필드는 안전한 기본값으로. */
export function normalizeMeta(
  meta: Partial<TabletMeta>,
  required: { id: string; now: string },
): TabletMeta {
  return {
    id: meta.id ?? required.id,
    title: meta.title ?? '제목 없음',
    landId: meta.landId ?? DOCK_LAND_ID,
    wardPath: meta.wardPath,
    status: meta.status ?? DEFAULT_RUNES.status,
    type: meta.type ?? DEFAULT_RUNES.type,
    priority: meta.priority ?? DEFAULT_RUNES.priority,
    links: meta.links ?? [],
    xset: meta.xset ?? [],
    tags: meta.tags ?? [],
    remindAt: meta.remindAt,
    pinned: meta.pinned ?? false,
    createdAt: meta.createdAt ?? required.now,
    updatedAt: meta.updatedAt ?? required.now,
  };
}

/** TabletMeta → snake_case YAML 객체 (undefined 필드는 생략) */
export function metaToYamlObject(meta: TabletMeta): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    id: meta.id,
    title: meta.title,
    land_id: meta.landId,
  };
  if (meta.wardPath) obj['ward_path'] = meta.wardPath;
  obj['status'] = meta.status;
  obj['type'] = meta.type;
  obj['priority'] = meta.priority;
  obj['links'] = meta.links;
  obj['xset'] = meta.xset.map((x) => ({
    land_id: x.landId,
    ...(x.wardPath ? { ward_path: x.wardPath } : {}),
    created_at: x.createdAt,
  }));
  obj['tags'] = meta.tags;
  if (meta.remindAt) obj['remind_at'] = meta.remindAt;
  obj['pinned'] = meta.pinned;
  obj['created_at'] = meta.createdAt;
  obj['updated_at'] = meta.updatedAt;
  return obj;
}

/** Tablet → `.md` 파일 내용 (front-matter + 본문) */
export function serializeTablet(tablet: Tablet): string {
  const yaml = stringifyYaml(metaToYamlObject(tablet)).trimEnd();
  return `${FM_DELIMITER}\n${yaml}\n${FM_DELIMITER}\n\n${tablet.body}`;
}

/** 파일 내용 → 완전한 Tablet (라운드트립용) */
export function deserializeTablet(content: string, required: { id: string; now: string }): Tablet {
  const { meta, body } = parseTabletFile(content);
  return { ...normalizeMeta(meta, required), body };
}
