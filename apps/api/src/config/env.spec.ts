import { parseDuration, validateDatabaseEnv, validateEnv } from './env';

const database = {
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_USER: 'nexus',
  DATABASE_PASSWORD: 'secret',
  DATABASE_NAME: 'nexus',
};

const auth = {
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'r'.repeat(32),
  JWT_REFRESH_EXPIRES_IN: '7d',
};

const valid = { ...database, ...auth };

describe('validateEnv', () => {
  it('applies defaults and parses all settings', () => {
    expect(validateEnv(valid)).toEqual({
      NODE_ENV: 'development',
      API_PORT: 4000,
      CORS_ORIGIN: 'http://localhost:3000',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: 5432,
      DATABASE_USER: 'nexus',
      DATABASE_PASSWORD: 'secret',
      DATABASE_NAME: 'nexus',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_ACCESS_EXPIRES_IN: 900,
      JWT_REFRESH_SECRET: 'r'.repeat(32),
      JWT_REFRESH_EXPIRES_IN: 604_800,
      AI_DOCUMENT_ANALYSIS_ENABLED: false,
      OPENAI_API_KEY: null,
      AI_DOCUMENT_ANALYSIS_MODEL: 'gpt-4o-mini',
      REDIS_URL: null,
    });
  });

  it('lists every missing required variable at once', () => {
    expect(() => validateEnv({ DATABASE_HOST: 'localhost' })).toThrow(
      'Missing required environment variable(s): DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME, JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN',
    );
  });

  it('treats blank values as missing', () => {
    expect(() => validateEnv({ ...valid, DATABASE_PASSWORD: '  ' })).toThrow(
      /DATABASE_PASSWORD/,
    );
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: '' })).toThrow(
      /Missing required.*JWT_ACCESS_SECRET/,
    );
  });

  it('rejects an invalid port', () => {
    expect(() => validateEnv({ ...valid, API_PORT: 'abc' })).toThrow(
      /API_PORT/,
    );
    expect(() => validateEnv({ ...valid, DATABASE_PORT: '70000' })).toThrow(
      /DATABASE_PORT/,
    );
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('rejects short secrets without echoing them', () => {
    const short = 'too-short-secret';
    expect(() => validateEnv({ ...valid, JWT_REFRESH_SECRET: short })).toThrow(
      /JWT_REFRESH_SECRET must be at least 32 characters/,
    );
    try {
      validateEnv({ ...valid, JWT_REFRESH_SECRET: short });
    } catch (error) {
      expect((error as Error).message).not.toContain(short);
    }
  });

  it('requires different access and refresh secrets', () => {
    expect(() =>
      validateEnv({ ...valid, JWT_REFRESH_SECRET: auth.JWT_ACCESS_SECRET }),
    ).toThrow(/must differ/);
  });

  it('requires access tokens to be shorter-lived than refresh tokens', () => {
    expect(() =>
      validateEnv({ ...valid, JWT_ACCESS_EXPIRES_IN: '7d' }),
    ).toThrow(/JWT_ACCESS_EXPIRES_IN must be shorter/);
  });
});

describe('validateDatabaseEnv', () => {
  it('needs no auth variables (used by the migration CLI)', () => {
    expect(validateDatabaseEnv(database).DATABASE_PORT).toBe(5432);
  });
});

describe('parseDuration', () => {
  it.each([
    ['900', 900],
    ['30s', 30],
    ['15m', 900],
    ['12h', 43_200],
    ['7d', 604_800],
    [' 15m ', 900],
  ])('%p → %p seconds', (input, expected) => {
    expect(parseDuration('X', input)).toBe(expected);
  });

  it.each(['', '0', '-5', '15 m', '1w', 'abc', '1.5h'])(
    'rejects %p',
    (input) => {
      expect(() => parseDuration('X', input)).toThrow(/Invalid X/);
    },
  );
});

describe('validateEnv (AI document analysis)', () => {
  const ai = {
    AI_DOCUMENT_ANALYSIS_ENABLED: 'true',
    OPENAI_API_KEY: 'sk-test-0123456789',
    AI_DOCUMENT_ANALYSIS_MODEL: 'gpt-4o-mini',
    REDIS_URL: 'redis://localhost:6380',
  };

  it('is disabled by default and needs no key or Redis', () => {
    expect(validateEnv(valid)).toMatchObject({
      AI_DOCUMENT_ANALYSIS_ENABLED: false,
    });
  });

  it('parses an enabled configuration', () => {
    expect(validateEnv({ ...valid, ...ai })).toMatchObject({
      AI_DOCUMENT_ANALYSIS_ENABLED: true,
      OPENAI_API_KEY: 'sk-test-0123456789',
      AI_DOCUMENT_ANALYSIS_MODEL: 'gpt-4o-mini',
      REDIS_URL: 'redis://localhost:6380',
    });
  });

  it('fails clearly when enabled without OPENAI_API_KEY or REDIS_URL', () => {
    expect(() =>
      validateEnv({ ...valid, ...ai, OPENAI_API_KEY: '', REDIS_URL: '' }),
    ).toThrow(
      'AI_DOCUMENT_ANALYSIS_ENABLED is true but OPENAI_API_KEY, REDIS_URL are not set.',
    );
  });

  it('rejects a placeholder key without echoing it', () => {
    const placeholder = 'YOUR_OPENAI_API_KEY_HERE';
    let message = '';
    try {
      validateEnv({ ...valid, ...ai, OPENAI_API_KEY: placeholder });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/does not look like an OpenAI API key/);
    expect(message).not.toContain(placeholder);
  });

  it('rejects an invalid flag, model name or Redis URL (without echoing it)', () => {
    expect(() =>
      validateEnv({ ...valid, AI_DOCUMENT_ANALYSIS_ENABLED: 'yes' }),
    ).toThrow(/AI_DOCUMENT_ANALYSIS_ENABLED/);
    expect(() =>
      validateEnv({ ...valid, AI_DOCUMENT_ANALYSIS_MODEL: 'gpt 4o; rm -rf' }),
    ).toThrow(/AI_DOCUMENT_ANALYSIS_MODEL/);
    const secretUrl = 'http://user:hunter2@cache:6379';
    expect(() => validateEnv({ ...valid, REDIS_URL: secretUrl })).toThrow(
      'REDIS_URL must be a redis:// or rediss:// URL.',
    );
  });
});
