import type { TokenPair } from '@nexus/types';

export const ACCESS_COOKIE = 'nexus_access';
export const REFRESH_COOKIE = 'nexus_refresh';

/** Refresh slightly early so a token can't expire mid-request. */
const EXPIRY_SKEW_SECONDS = 30;

/**
 * Reads a JWT's `exp` claim WITHOUT verifying the signature. Only used to
 * size cookie lifetimes and decide when to refresh; the API verifies tokens.
 */
export function tokenExpiry(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const { exp } = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { exp?: unknown };
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

export function isFresh(token: string | undefined): token is string {
  const exp = token ? tokenExpiry(token) : null;
  return exp !== null && exp - EXPIRY_SKEW_SECONDS > Date.now() / 1000;
}

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
}

/** Structural subset shared by `cookies()` and `NextResponse.cookies`. */
export interface CookieWriter {
  set(name: string, value: string, options: CookieOptions): unknown;
  delete(name: string): unknown;
}

function cookieOptions(token: string): CookieOptions {
  const exp = tokenExpiry(token) ?? 0;
  return {
    // Tokens are never readable by browser JavaScript.
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(0, Math.floor(exp - Date.now() / 1000)),
  };
}

export function writeSessionCookies(cookies: CookieWriter, tokens: TokenPair) {
  cookies.set(
    ACCESS_COOKIE,
    tokens.accessToken,
    cookieOptions(tokens.accessToken),
  );
  cookies.set(
    REFRESH_COOKIE,
    tokens.refreshToken,
    cookieOptions(tokens.refreshToken),
  );
}

export function clearSessionCookies(cookies: CookieWriter) {
  cookies.delete(ACCESS_COOKIE);
  cookies.delete(REFRESH_COOKIE);
}

/** Only same-origin relative paths; anything else falls back to `/`. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return '/';
  }
  return value;
}
