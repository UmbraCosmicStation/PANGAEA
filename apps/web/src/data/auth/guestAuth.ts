import type { AuthUser, IAuthProvider } from '@pangaea/core';
import { getStorage } from '../storage';

/**
 * 게스트 인증 (M1 — 기획서 §12.2: 비로그인 = 로컬 전용 모드)
 * Google/Apple/이메일 OAuth는 M2에서 동일 인터페이스로 추가.
 */
export class GuestAuth implements IAuthProvider {
  async getCurrentUser(): Promise<AuthUser | null> {
    const name = await getStorage().readJson<string>('space_name');
    if (!name) return null;
    return { id: 'guest', displayName: name, provider: 'guest' };
  }

  async signIn(): Promise<AuthUser> {
    return { id: 'guest', displayName: '기록자', provider: 'guest' };
  }

  async signOut(): Promise<void> {
    // 게스트는 로그아웃 개념 없음 — 데이터는 로컬에 유지
  }
}
