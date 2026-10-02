/**
 * Validates environment variables at startup so misconfiguration fails fast.
 * Kept dependency-free on purpose; swap for a schema library if it grows.
 */
export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  API_PORT: number;
  CORS_ORIGIN: string;
}

const NODE_ENVS: ReadonlyArray<Env['NODE_ENV']> = [
  'development',
  'production',
  'test',
];

export function validateEnv(config: Record<string, unknown>): Env {
  const nodeEnv = (config.NODE_ENV ?? 'development') as Env['NODE_ENV'];
  if (!NODE_ENVS.includes(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV "${String(config.NODE_ENV)}". Expected one of: ${NODE_ENVS.join(', ')}`,
    );
  }

  const port = Number(config.API_PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid API_PORT "${String(config.API_PORT)}"`);
  }

  return {
    NODE_ENV: nodeEnv,
    API_PORT: port,
    CORS_ORIGIN: String(config.CORS_ORIGIN ?? 'http://localhost:3000'),
  };
}
