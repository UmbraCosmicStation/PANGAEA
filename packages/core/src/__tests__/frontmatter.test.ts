import { describe, expect, it } from 'vitest';
import {
  deserializeTablet,
  normalizeMeta,
  parseTabletFile,
  serializeTablet,
} from '../domain/tablet/frontmatter';
import type { Tablet } from '../types/schema';

const NOW = '2026-06-11T00:00:00.000Z';

function sampleTablet(): Tablet {
  return {
    id: '01J5K3TESTTESTTESTTESTTEST',
    title: 'API 설계',
    landId: 'work',
    wardPath: '개발',
    status: 'active',
    type: 'output',
    priority: 'high',
    links: ['01J5K4LINKLINKLINKLINKLINK'],
    xset: [{ landId: 'learn', createdAt: NOW }],
    tags: ['API', '백엔드'],
    remindAt: '2026-07-01',
    pinned: true,
    createdAt: NOW,
    updatedAt: NOW,
    body: '# API 설계\n\n본문 내용',
  };
}

describe('frontmatter', () => {
  it('직렬화 → 파싱 라운드트립이 무손실이다', () => {
    const original = sampleTablet();
    const md = serializeTablet(original);
    const restored = deserializeTablet(md, { id: 'fallback', now: NOW });
    expect(restored).toEqual(original);
  });

  it('snake_case 키로 직렬화한다 (land_id, ward_path 등)', () => {
    const md = serializeTablet(sampleTablet());
    expect(md).toContain('land_id: work');
    expect(md).toContain('ward_path: 개발');
    expect(md).toContain('remind_at: 2026-07-01');
  });

  it('front-matter 없는 파일은 전체를 본문으로 처리한다', () => {
    const { meta, body } = parseTabletFile('그냥 텍스트\n둘째 줄');
    expect(meta).toEqual({});
    expect(body).toBe('그냥 텍스트\n둘째 줄');
  });

  it('손상된 front-matter는 본문을 보존한다 (silent failure 금지)', () => {
    const broken = '---\n{invalid yaml: [\n---\n\n본문';
    const { body } = parseTabletFile(broken);
    expect(body).toContain('본문');
  });

  it('잘못된 룬 값은 무시하고 기본값으로 정규화한다', () => {
    const md = '---\nid: x\nstatus: 잘못된값\ntype: note\n---\n\n본문';
    const { meta } = parseTabletFile(md);
    expect(meta.status).toBeUndefined();
    const full = normalizeMeta(meta, { id: 'x', now: NOW });
    expect(full.status).toBe('draft');
    expect(full.type).toBe('note');
  });

  it('미배정 판은 부두(dock)로 정규화된다', () => {
    const full = normalizeMeta({}, { id: 'x', now: NOW });
    expect(full.landId).toBe('dock');
  });

  it('본문에 --- 구분선이 있어도 front-matter 경계를 침범하지 않는다', () => {
    const t = { ...sampleTablet(), body: '위\n\n---\n\n아래' };
    const restored = deserializeTablet(serializeTablet(t), { id: 'f', now: NOW });
    expect(restored.body).toBe('위\n\n---\n\n아래');
  });
});
