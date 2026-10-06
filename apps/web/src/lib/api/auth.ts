import type {
  AuthResponse,
  LoginRequest,
  RefreshResponse,
  RegisterRequest,
  UserResponse,
} from '@nexus/types';
import { apiRequest } from './client';

export function login(credentials: LoginRequest): Promise<AuthResponse> {
  return apiRequest('/api/auth/login', { method: 'POST', body: credentials });
}

export function register(credentials: RegisterRequest): Promise<AuthResponse> {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: credentials,
  });
}

export function refresh(refreshToken: string): Promise<RefreshResponse> {
  return apiRequest('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
}

export function logout(refreshToken: string): Promise<void> {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
    body: { refreshToken },
  });
}

export function me(token: string): Promise<UserResponse> {
  return apiRequest('/api/auth/me', { token });
}
