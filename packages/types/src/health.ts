/**
 * Contracts for the API health endpoints. Shared so the web app and API agree
 * on the response shape.
 *
 * - `GET /api/health/live` — liveness: the API process is running.
 * - `GET /api/health`      — readiness: API plus dependencies (database).
 *   Responds 200 when every check is up, 503 otherwise (same body shape).
 */
export type HealthStatus = 'ok' | 'error';

export type CheckStatus = 'up' | 'down';

export interface HealthCheck {
  status: CheckStatus;
  /** Round-trip time of the probe, when it completed. */
  latencyMs?: number;
}

export interface LivenessResponse {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
}

export interface HealthResponse extends Omit<LivenessResponse, 'status'> {
  status: HealthStatus;
  checks: {
    api: HealthCheck;
    database: HealthCheck;
  };
}
