/**
 * Validates environment variables at startup so misconfiguration fails fast.
 * Kept dependency-free on purpose; swap for a schema library if it grows.
 */
export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  API_PORT: number;
  CORS_ORIGIN: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
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

function parsePort(name: string, value: unknown): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${name} "${String(value)}"`);
  }
  return port;
}

export function validateEnv(config: Record<string, unknown>): Env {
  const nodeEnv = (config.NODE_ENV ?? 'development') as Env['NODE_ENV'];
  if (!NODE_ENVS.includes(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV "${String(config.NODE_ENV)}". Expected one of: ${NODE_ENVS.join(', ')}`,
    );
  }

  // Report every missing database variable at once rather than one per restart.
  const missing = REQUIRED_DATABASE_VARS.filter(
    (name) => config[name] == null || String(config[name]).trim() === '',
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env at the repo root and fill them in.',
    );
  }

  return {
    NODE_ENV: nodeEnv,
    API_PORT: parsePort('API_PORT', config.API_PORT ?? 4000),
    CORS_ORIGIN: String(config.CORS_ORIGIN ?? 'http://localhost:3000'),
    DATABASE_HOST: String(config.DATABASE_HOST),
    DATABASE_PORT: parsePort('DATABASE_PORT', config.DATABASE_PORT),
    DATABASE_USER: String(config.DATABASE_USER),
    DATABASE_PASSWORD: String(config.DATABASE_PASSWORD),
    DATABASE_NAME: String(config.DATABASE_NAME),
  };
}
