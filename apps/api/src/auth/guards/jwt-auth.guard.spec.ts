import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { createTokenService, TEST_AUTH_ENV } from '../testing/auth-test-utils';
import type { TokenService } from '../token.service';
import { extractBearerToken, JwtAuthGuard } from './jwt-auth.guard';

const USER_ID = '6f1c3c1e-8a6b-4e8e-9d55-3f5a0e2b7c11';

function contextFor(
  authorization?: string,
  isPublic = false,
): { context: ExecutionContext; request: { user?: AuthenticatedUser } } {
  const request: { headers: Record<string, string>; user?: AuthenticatedUser } =
    { headers: authorization ? { authorization } : {} };
  class Handler {}
  const handler = () => undefined;
  if (isPublic) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  const context = {
    getHandler: () => handler,
    getClass: () => Handler,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let tokens: TokenService;
  let jwt: JwtService;

  beforeEach(() => {
    ({ tokens, jwt } = createTokenService());
    guard = new JwtAuthGuard(new Reflector(), tokens);
  });

  it('accepts a valid access token and attaches only the user id', async () => {
    const token = await tokens.signAccessToken(USER_ID);
    const { context, request } = contextFor(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ id: USER_ID });
  });

  it('access tokens carry only sub/iat/exp plus issuer and audience', async () => {
    const token = await tokens.signAccessToken(USER_ID);
    const payload = jwt.decode<Record<string, unknown>>(token);

    expect(Object.keys(payload).sort()).toEqual([
      'aud',
      'exp',
      'iat',
      'iss',
      'sub',
    ]);
    expect(payload.exp as number).toBe(
      (payload.iat as number) + TEST_AUTH_ENV.JWT_ACCESS_EXPIRES_IN,
    );
  });

  it('rejects a missing token', async () => {
    await expect(guard.canActivate(contextFor().context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a non-bearer scheme', async () => {
    const token = await tokens.signAccessToken(USER_ID);
    await expect(
      guard.canActivate(contextFor(`Basic ${token}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an invalid token', async () => {
    await expect(
      guard.canActivate(contextFor('Bearer not.a.jwt').context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a tampered token', async () => {
    const token = await tokens.signAccessToken(USER_ID);
    const [header, , signature] = token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: 'someone-else', exp: 9_999_999_999 }),
    ).toString('base64url');

    await expect(
      guard.canActivate(
        contextFor(`Bearer ${header}.${forgedPayload}.${signature}`).context,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = await jwt.signAsync(
      { sub: USER_ID, iat: now - 1_000, exp: now - 1 },
      {
        secret: TEST_AUTH_ENV.JWT_ACCESS_SECRET,
        issuer: 'nexus-api',
        audience: 'nexus-api:access',
      },
    );

    await expect(
      guard.canActivate(contextFor(`Bearer ${expired}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an unsigned (alg: none) token', async () => {
    const encode = (o: object) =>
      Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      sub: USER_ID,
      iss: 'nexus-api',
      aud: 'nexus-api:access',
      exp: 9_999_999_999,
    })}.`;

    await expect(
      guard.canActivate(contextFor(`Bearer ${unsigned}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a refresh token used as an access token', async () => {
    const refresh = await tokens.signRefreshToken(USER_ID, crypto.randomUUID());

    await expect(
      guard.canActivate(contextFor(`Bearer ${refresh}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lets @Public() routes through without a token', async () => {
    await expect(
      guard.canActivate(contextFor(undefined, true).context),
    ).resolves.toBe(true);
  });
});

describe('extractBearerToken', () => {
  it.each([
    [undefined, null],
    ['', null],
    ['Bearer', null],
    ['Bearer a b', null],
    ['Token abc', null],
    ['Bearer abc', 'abc'],
    ['bearer abc', 'abc'],
  ])('%p → %p', (header, expected) => {
    expect(extractBearerToken(header)).toBe(expected);
  });
});
