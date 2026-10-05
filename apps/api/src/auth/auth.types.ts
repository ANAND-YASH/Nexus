/** Claims of the access token. Deliberately minimal: no PII. */
export interface AccessTokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

/** Claims of the refresh token. `sid` points at the RefreshSession row. */
export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
}

/** What JwtAuthGuard attaches to `request.user`. */
export interface AuthenticatedUser {
  id: string;
}
