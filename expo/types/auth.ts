export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  lastLoginAt: number;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthSignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
