import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type {
  HealthCheck,
  HealthResponse,
  LivenessResponse,
} from '@nexus/types';
import { DataSource } from 'typeorm';

const DATABASE_PROBE_TIMEOUT_MS = 2_000;

/** Connection failures can be AggregateErrors with an empty message. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = (error as { code?: unknown }).code;
  return error.message || (typeof code === 'string' ? code : error.name);
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  liveness(): LivenessResponse {
    return {
      status: 'ok',
      service: 'nexus-api',
      version: process.env.npm_package_version ?? '0.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  async readiness(): Promise<HealthResponse> {
    const database = await this.checkDatabase();
    return {
      ...this.liveness(),
      status: database.status === 'up' ? 'ok' : 'error',
      checks: { api: { status: 'up' }, database },
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    if (!this.dataSource.isInitialized) return { status: 'down' };

    const startedAt = performance.now();
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.dataSource.query('SELECT 1'),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Database probe timed out')),
            DATABASE_PROBE_TIMEOUT_MS,
          );
        }),
      ]);
      return {
        status: 'up',
        latencyMs: Math.round(performance.now() - startedAt),
      };
    } catch (error) {
      // Details stay in server logs; the response never exposes them.
      this.logger.warn(`Database health check failed: ${describeError(error)}`);
      return { status: 'down' };
    } finally {
      clearTimeout(timer);
    }
  }
}
