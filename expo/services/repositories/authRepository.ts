import { AuthUser, AuthSession, AuthCredentials, AuthSignUpInput } from '@/types/auth';
import { IAuthRepository } from './types';
import { IStorageService } from '@/services/storage/storageService';

const AUTH_SESSION_KEY = 'bpd_auth_session';
const AUTH_USER_KEY = 'bpd_auth_user';

const MOCK_USER: AuthUser = {
  id: 'local_user',
  email: 'user@local.device',
  displayName: 'You',
  createdAt: Date.now(),
  lastLoginAt: Date.now(),
};

export class LocalAuthRepository implements IAuthRepository {
  constructor(private storage: IStorageService) {}

  async getCurrentUser(): Promise<AuthUser | null> {
    const user = await this.storage.get<AuthUser>(AUTH_USER_KEY);
    console.log('[AuthRepository] getCurrentUser:', user ? user.id : 'null');
    return user;
  }

  async getSession(): Promise<AuthSession | null> {
    const session = await this.storage.get<AuthSession>(AUTH_SESSION_KEY);
    console.log('[AuthRepository] getSession:', session ? 'active' : 'null');
    return session;
  }

  async signIn(_credentials: AuthCredentials): Promise<AuthSession> {
    console.log('[AuthRepository] signIn (mock) - returning local session');
    const session: AuthSession = {
      user: { ...MOCK_USER, lastLoginAt: Date.now() },
      accessToken: `mock_token_${Date.now()}`,
      refreshToken: `mock_refresh_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    await this.storage.set(AUTH_SESSION_KEY, session);
    await this.storage.set(AUTH_USER_KEY, session.user);
    return session;
  }

  async signUp(input: AuthSignUpInput): Promise<AuthSession> {
    console.log('[AuthRepository] signUp (mock) - creating local user');
    const user: AuthUser = {
      id: `user_${Date.now()}`,
      email: input.email,
      displayName: input.displayName,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    const session: AuthSession = {
      user,
      accessToken: `mock_token_${Date.now()}`,
      refreshToken: `mock_refresh_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    await this.storage.set(AUTH_SESSION_KEY, session);
    await this.storage.set(AUTH_USER_KEY, user);
    return session;
  }

  async signOut(): Promise<void> {
    console.log('[AuthRepository] signOut (mock)');
    await this.storage.remove(AUTH_SESSION_KEY);
    await this.storage.remove(AUTH_USER_KEY);
  }

  async refreshSession(): Promise<AuthSession | null> {
    const existing = await this.getSession();
    if (!existing) return null;
    console.log('[AuthRepository] refreshSession (mock)');
    const refreshed: AuthSession = {
      ...existing,
      accessToken: `mock_token_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    await this.storage.set(AUTH_SESSION_KEY, refreshed);
    return refreshed;
  }

  async updateUser(updates: Partial<AuthUser>): Promise<AuthUser> {
    const current = await this.getCurrentUser();
    const updated = { ...(current ?? MOCK_USER), ...updates };
    await this.storage.set(AUTH_USER_KEY, updated);
    console.log('[AuthRepository] updateUser:', updated.id);
    return updated;
  }
}
