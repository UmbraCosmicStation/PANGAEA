import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { createLand, createTablet, type Land, type Tablet } from '@pangaea/core';
import { buildExportZip } from './exportZip';

function fixtures() {
  const work: Land = createLand({ id: 'work', name: '일터', now: '2026-06-12T00:00:00Z' });
  const health: Land = createLand({ id: 'health', name: '건강', now: '2026-06-12T00:00:00Z' });
  const t1: Tablet = {
    ...createTablet({ title: 'API 설계', landId: 'work', now: '2026-06-12T00:00:00Z' }),
    body: '# API\n본문',
  };
  const t2: Tablet = {
    ...createTablet({ title: '러닝 로그', landId: 'health', now: '2026-06-12T00:00:00Z' }),
    body: '5km',
  };
  return { lands: [work, health], tablets: [t1, t2], spaceName: '탄고래' };
}

describe('buildExportZip', () => {
  it('전체 export: 판별 .md + index.json 포함', () => {
    const zip = unzipSync(buildExportZip(fixtures()));
    const names = Object.keys(zip);
    expect(names).toContain('index.json');
    expect(names.some((n) => n.startsWith('lands/일터/') && n.endsWith('.md'))).toBe(true);
    expect(names.some((n) => n.startsWith('lands/건강/'))).toBe(true);
  });

  it('.md 파일에 front-matter가 직렬화된다', () => {
    const zip = unzipSync(buildExportZip(fixtures()));
    const apiFile = Object.entries(zip).find(([n]) => n.includes('API 설계'))![1];
    const content = strFromU8(apiFile);
    expect(content).toContain('---');
    expect(content).toContain('land_id: work');
    expect(content).toContain('# API');
  });

  it('index.json은 메타 요약을 담는다', () => {
    const zip = unzipSync(buildExportZip(fixtures()));
    const index = JSON.parse(strFromU8(zip['index.json']!));
    expect(index.format).toBe('pangaea-export/1.0');
    expect(index.space).toBe('탄고래');
    expect(index.tablets).toHaveLength(2);
    expect(index.lands).toHaveLength(2);
  });

  it('단일 토지 export는 해당 토지만 포함', () => {
    const zip = unzipSync(buildExportZip(fixtures(), 'work'));
    const names = Object.keys(zip);
    expect(names.some((n) => n.startsWith('lands/일터/'))).toBe(true);
    expect(names.some((n) => n.startsWith('lands/건강/'))).toBe(false);
    const index = JSON.parse(strFromU8(zip['index.json']!));
    expect(index.tablets).toHaveLength(1);
  });
});
