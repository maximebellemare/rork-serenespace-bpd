import { AuthUser, AuthSession, AuthCredentials, AuthSignUpInput } from '@/types/auth';
import { authRepository } from '@/services/repositories';

export async function getCurrentUser(): Promise<AuthUser | null> {
  return authRepository.getCurrentUser();
}

export async function getSession(): Promise<AuthSession | null> {
  return authRepository.getSession();
}

export async function signIn(credentials: AuthCredentials): Promise<AuthSession> {
  console.log('[AuthService] Signing in...');
  return authRepository.signIn(credentials);
}

export async function signUp(input: AuthSignUpInput): Promise<AuthSession> {
  console.log('[AuthService] Signing up...');
  return authRepository.signUp(input);
}

export async function signOut(): Promise<void> {
  console.log('[AuthService] Signing out...');
  return authRepository.signOut();
}

export async function refreshSession(): Promise<AuthSession | null> {
  console.log('[AuthService] Refreshing session...');
  return authRepository.refreshSession();
}

export async function updateUser(updates: Partial<AuthUser>): Promise<AuthUser> {
  console.log('[AuthService] Updating user...');
  return authRepository.updateUser(updates);
}

export function isSessionExpired(session: AuthSession): boolean {
  return Date.now() >= session.expiresAt;
}
