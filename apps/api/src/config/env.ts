/**
 * Validates environment variables at startup so misconfiguration fails fast.
 * Kept dependency-free on purpose; swap for a schema library if it grows.
 */
export interface DatabaseEnv {
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
}

export interface AuthEnv {
  JWT_ACCESS_SECRET: string;
  /** Access-token lifetime in seconds. */
  JWT_ACCESS_EXPIRES_IN: number;
  JWT_REFRESH_SECRET: string;
  /** Refresh-token (session) lifetime in seconds. */
  JWT_REFRESH_EXPIRES_IN: number;
}

export interface AiEnv {
  /** Opt-in. When false, no Redis connection or AI provider is created. */
  AI_DOCUMENT_ANALYSIS_ENABLED: boolean;
  /** Required (and must look like an OpenAI key) when analysis is enabled. */
  OPENAI_API_KEY: string | null;
  AI_DOCUMENT_ANALYSIS_MODEL: string;
  /** BullMQ connection; required when analysis is enabled. */
  REDIS_URL: string | null;
}

export interface Env extends DatabaseEnv, AuthEnv, AiEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  API_PORT: number;
  CORS_ORIGIN: string;
}

const NODE_ENVS: ReadonlyArray<Env['NODE_ENV']> = [
  'development',
  'production',
  'test',
];

const REQUIRED_DATABASE_VARS = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
] as const;

const REQUIRED_AUTH_VARS = [
  'JWT_ACCESS_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_EXPIRES_IN',
] as const;

/** HS256 keys should carry at least 256 bits; 32 chars is the floor. */
const MIN_SECRET_LENGTH = 32;

const DURATION_UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3_600,
  d: 86_400,
};

function assertPresent(
  config: Record<string, unknown>,
  names: readonly string[],
): void {
  // Report every missing variable at once rather than one per restart.
  const missing = names.filter(
    (name) => config[name] == null || String(config[name]).trim() === '',
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env at the repo root and fill them in.',
    );
  }
}

function parsePort(name: string, value: unknown): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${name} "${String(value)}"`);
  }
  return port;
}

/** Parses `900`, `900s`, `15m`, `12h` or `7d` into seconds. */
export function parseDuration(name: string, value: unknown): number {
  const match = /^(\d+)([smhd]?)$/.exec(String(value).trim());
  const seconds = match
    ? Number(match[1]) * (DURATION_UNITS[match[2] || 's'] ?? 1)
    : NaN;
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error(
      `Invalid ${name} "${String(value)}". Use seconds or a duration like 15m, 12h, 7d.`,
    );
  }
  return seconds;
}

function parseSecret(name: string, value: unknown): string {
  const secret = String(value);
  if (secret.length < MIN_SECRET_LENGTH) {
    // Never echo the secret itself.
    throw new Error(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters. ` +
        'Generate one with: openssl rand -base64 48',
    );
  }
  return secret;
}

/** Database settings only — used by the migration CLI, which needs no auth. */
export function validateDatabaseEnv(
  config: Record<string, unknown>,
): DatabaseEnv {
  assertPresent(config, REQUIRED_DATABASE_VARS);
  return {
    DATABASE_HOST: String(config.DATABASE_HOST),
    DATABASE_PORT: parsePort('DATABASE_PORT', config.DATABASE_PORT),
    DATABASE_USER: String(config.DATABASE_USER),
    DATABASE_PASSWORD: String(config.DATABASE_PASSWORD),
    DATABASE_NAME: String(config.DATABASE_NAME),
  };
}

function validateAuthEnv(config: Record<string, unknown>): AuthEnv {
  assertPresent(config, REQUIRED_AUTH_VARS);
  const auth: AuthEnv = {
    JWT_ACCESS_SECRET: parseSecret(
      'JWT_ACCESS_SECRET',
      config.JWT_ACCESS_SECRET,
    ),
    JWT_ACCESS_EXPIRES_IN: parseDuration(
      'JWT_ACCESS_EXPIRES_IN',
      config.JWT_ACCESS_EXPIRES_IN,
    ),
    JWT_REFRESH_SECRET: parseSecret(
      'JWT_REFRESH_SECRET',
      config.JWT_REFRESH_SECRET,
    ),
    JWT_REFRESH_EXPIRES_IN: parseDuration(
      'JWT_REFRESH_EXPIRES_IN',
      config.JWT_REFRESH_EXPIRES_IN,
    ),
  };
  if (auth.JWT_ACCESS_SECRET === auth.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ.');
  }
  if (auth.JWT_ACCESS_EXPIRES_IN >= auth.JWT_REFRESH_EXPIRES_IN) {
    throw new Error(
      'JWT_ACCESS_EXPIRES_IN must be shorter than JWT_REFRESH_EXPIRES_IN.',
    );
  }
  return auth;
}

const DEFAULT_ANALYSIS_MODEL = 'gpt-4o-mini';
const MODEL_NAME = /^[A-Za-z0-9._:-]{1,100}$/;

function parseBoolean(
  name: string,
  value: unknown,
  fallback: boolean,
): boolean {
  if (value == null || String(value).trim() === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1'].includes(normalized)) return true;
  if (['false', '0'].includes(normalized)) return false;
  throw new Error(`Invalid ${name} "${String(value)}". Use true or false.`);
}

function optionalString(value: unknown): string | null {
  return value == null || String(value).trim() === ''
    ? null
    : String(value).trim();
}

function validateAiEnv(config: Record<string, unknown>): AiEnv {
  const enabled = parseBoolean(
    'AI_DOCUMENT_ANALYSIS_ENABLED',
    config.AI_DOCUMENT_ANALYSIS_ENABLED,
    false,
  );
  const apiKey = optionalString(config.OPENAI_API_KEY);
  const model =
    optionalString(config.AI_DOCUMENT_ANALYSIS_MODEL) ?? DEFAULT_ANALYSIS_MODEL;
  const redisUrl = optionalString(config.REDIS_URL);

  if (!MODEL_NAME.test(model)) {
    throw new Error(`Invalid AI_DOCUMENT_ANALYSIS_MODEL "${model}".`);
  }
  if (redisUrl !== null) {
    let protocol = '';
    try {
      protocol = new URL(redisUrl).protocol;
    } catch {
      // handled below
    }
    if (protocol !== 'redis:' && protocol !== 'rediss:') {
      // The URL may embed a password, so it is never echoed.
      throw new Error('REDIS_URL must be a redis:// or rediss:// URL.');
    }
  }

  if (enabled) {
    const missing = [
      ['OPENAI_API_KEY', apiKey],
      ['REDIS_URL', redisUrl],
    ]
      .filter(([, value]) => value === null)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `AI_DOCUMENT_ANALYSIS_ENABLED is true but ${missing.join(', ')} ` +
          `${missing.length > 1 ? 'are' : 'is'} not set.`,
      );
    }
    // Catches placeholders such as "YOUR_KEY_HERE". Never echo the value.
    if (!apiKey!.startsWith('sk-')) {
      throw new Error(
        'OPENAI_API_KEY does not look like an OpenAI API key (expected "sk-…").',
      );
    }
  }

  return {
    AI_DOCUMENT_ANALYSIS_ENABLED: enabled,
    OPENAI_API_KEY: apiKey,
    AI_DOCUMENT_ANALYSIS_MODEL: model,
    REDIS_URL: redisUrl,
  };
}

export function validateEnv(config: Record<string, unknown>): Env {
  const nodeEnv = (config.NODE_ENV ?? 'development') as Env['NODE_ENV'];
  if (!NODE_ENVS.includes(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV "${String(config.NODE_ENV)}". Expected one of: ${NODE_ENVS.join(', ')}`,
    );
  }

  assertPresent(config, [...REQUIRED_DATABASE_VARS, ...REQUIRED_AUTH_VARS]);

  return {
    NODE_ENV: nodeEnv,
    API_PORT: parsePort('API_PORT', config.API_PORT ?? 4000),
    CORS_ORIGIN: String(config.CORS_ORIGIN ?? 'http://localhost:3000'),
    ...validateDatabaseEnv(config),
    ...validateAuthEnv(config),
    ...validateAiEnv(config),
  };
}
