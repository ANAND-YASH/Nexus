import { validateEnv } from './env';

describe('validateEnv', () => {
  it('applies defaults', () => {
    expect(validateEnv({})).toEqual({
      NODE_ENV: 'development',
      API_PORT: 4000,
      CORS_ORIGIN: 'http://localhost:3000',
    });
  });

  it('rejects an invalid port', () => {
    expect(() => validateEnv({ API_PORT: 'abc' })).toThrow(/API_PORT/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
