import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getStorage } from '../../data/storage';

/**
 * 마크다운 → 안전한 HTML (기획서 §21.2 — XSS: DOMPurify 필수)
 */

marked.setOptions({ gfm: true, breaks: true });

const assetUrlCache = new Map<string, string>();

/** `asset:{name}` 이미지 참조를 OPFS blob URL로 치환 */
async function resolveAssetUrl(name: string): Promise<string | null> {
  const cached = assetUrlCache.get(name);
  if (cached) return cached;
  const data = await getStorage().readAsset(`assets/${name}`);
  if (!data) return null;
  // ArrayBuffer 복사본으로 Blob 생성 (SharedArrayBuffer 타입 이슈 회피)
  const url = URL.createObjectURL(new Blob([new Uint8Array(data)]));
  assetUrlCache.set(name, url);
  return url;
}

export async function renderMarkdown(body: string): Promise<string> {
  // [[내부 링크]] → 강조 스팬 (M1: 표시만, 클릭 네비게이션은 M2)
  const withLinks = body.replace(
    /\[\[([^\]]+)\]\]/g,
    (_, t: string) => `<span class="internal-link">${t}</span>`,
  );
  const rawHtml = await marked.parse(withLinks);
  const safe = DOMPurify.sanitize(rawHtml, {
    FORBID_TAGS: ['style', 'form'],
    // 허용 프로토콜: https/mailto/asset/blob + data:image.
    // 뒤쪽 분기는 프로토콜 없는 일반 값(상대경로, "checkbox" 등) 허용 — DOMPurify 기본 패턴과 동일.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|asset|blob):|data:image\/|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });

  // asset: 이미지 치환
  const assetNames = [...safe.matchAll(/src="asset:([^"]+)"/g)].map((m) => m[1]!);
  let html = safe;
  for (const name of assetNames) {
    const url = await resolveAssetUrl(name);
    if (url) html = html.replaceAll(`src="asset:${name}"`, `src="${url}"`);
  }
  return html;
}
