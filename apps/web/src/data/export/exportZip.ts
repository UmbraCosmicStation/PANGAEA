import { zipSync, strToU8 } from 'fflate';
import { serializeTablet, type Land, type Tablet } from '@pangaea/core';

/**
 * Export (M2-D3, 기획서 §13.1) — `.md + index.json` ZIP.
 * 표준 포맷이라 Obsidian 등 어디서든 열 수 있다 (네 데이터는 네 것).
 */

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
}

interface ExportArgs {
  lands: Land[];
  tablets: Tablet[];
  spaceName: string;
}

/** 전체 또는 단일 토지 → ZIP 바이트 (기획서 §13.1: .md + assets + index.json) */
export function buildExportZip(args: ExportArgs, onlyLandId?: string): Uint8Array {
  const tablets = onlyLandId
    ? args.tablets.filter((t) => t.landId === onlyLandId)
    : args.tablets;
  const landIds = new Set(tablets.map((t) => t.landId));
  const lands = args.lands.filter((l) => landIds.has(l.id));

  const files: Record<string, Uint8Array> = {};
  const landName = new Map(args.lands.map((l) => [l.id, l.name]));

  for (const t of tablets) {
    const dir = safeName(landName.get(t.landId) ?? t.landId);
    const ward = t.wardPath ? `${safeName(t.wardPath)}/` : '';
    const fname = `lands/${dir}/${ward}${safeName(t.title)}.md`;
    files[fname] = strToU8(serializeTablet(t));
  }

  // index.json — 복원/검증용 메타 (기획서 §13.1)
  const index = {
    format: 'pangaea-export/1.0',
    exportedAt: new Date().toISOString(),
    space: args.spaceName,
    lands: lands.map((l) => ({ id: l.id, name: l.name, type: l.type })),
    tablets: tablets.map((t) => ({
      id: t.id,
      title: t.title,
      landId: t.landId,
      wardPath: t.wardPath,
      status: t.status,
      type: t.type,
      priority: t.priority,
      tags: t.tags,
      links: t.links,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  };
  files['index.json'] = strToU8(JSON.stringify(index, null, 2));

  return zipSync(files, { level: 6 });
}

/** ZIP 바이트를 브라우저 다운로드 */
export function downloadZip(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
