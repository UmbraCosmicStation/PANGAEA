/**
 * 인증 프로바이더 인터페이스 (기획서 §12)
 * 구현체: GuestAuth(M1) → GoogleAuth/AppleAuth/EmailAuth(M2)
 */
export interface AuthUser {
  id: string;
  displayName: string;
  email?: string;
  /** guest = 로컬 전용 모드 */
  provider: 'guest' | 'google' | 'apple' | 'email';
}

export interface IAuthProvider {
  getCurrentUser(): Promise<AuthUser | null>;
  signIn(): Promise<AuthUser>;
  signOut(): Promise<void>;
}
