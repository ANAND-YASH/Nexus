/** Public user representation. Never includes credentials. */
export interface UserResponse {
  id: string;
  email: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp. */
  updatedAt: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export type RegisterRequest = Credentials;
export type LoginRequest = Credentials;

export interface RefreshRequest {
  refreshToken: string;
}

export type LogoutRequest = RefreshRequest;

export interface TokenPair {
  /** Short-lived JWT for `Authorization: Bearer <token>`. */
  accessToken: string;
  /** Long-lived, single-use token for `POST /api/auth/refresh`. */
  refreshToken: string;
}

/** Response of `POST /api/auth/register` and `POST /api/auth/login`. */
export interface AuthResponse extends TokenPair {
  user: UserResponse;
}

/** Response of `POST /api/auth/refresh`. */
export type RefreshResponse = TokenPair;
