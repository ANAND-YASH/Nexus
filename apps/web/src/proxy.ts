import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from './lib/auth/refresh';
import {
  ACCESS_COOKIE,
  clearSessionCookies,
  isFresh,
  REFRESH_COOKIE,
  writeSessionCookies,
} from './lib/auth/tokens';

const PUBLIC_PATHS = new Set(['/sign-in', '/sign-up']);

function redirectToSignIn(request: NextRequest): NextResponse {
  const url = new URL('/sign-in', request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(url);
}

/**
 * Optimistic session gate + token refresh. Authorization itself stays with
 * the API (every call is owner-scoped); this only keeps the access token
 * fresh — Server Components can't set cookies — and sends signed-out
 * visitors to sign-in.
 */
export async function proxy(request: NextRequest) {
  if (PUBLIC_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();

  if (isFresh(request.cookies.get(ACCESS_COOKIE)?.value)) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return redirectToSignIn(request);

  const result = await refreshSession(refreshToken);
  if (result.kind === 'unavailable') return NextResponse.next();
  if (result.kind === 'invalid') {
    const response = redirectToSignIn(request);
    clearSessionCookies(response.cookies);
    return response;
  }

  // Forward the new tokens to this render as well as to the browser.
  request.cookies.set(ACCESS_COOKIE, result.tokens.accessToken);
  request.cookies.set(REFRESH_COOKIE, result.tokens.refreshToken);
  const response = NextResponse.next({ request: { headers: request.headers } });
  writeSessionCookies(response.cookies, result.tokens);
  return response;
}

export const config = {
  // Pages only: skip Next internals and files with an extension.
  matcher: ['/((?!_next/static|_next/image|.*\\.[\\w]+$).*)'],
};
