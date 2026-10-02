/**
 * Contract for the API health endpoint (`GET /api/health`).
 * Shared so the web app and API agree on the response shape.
 */
export type HealthStatus = 'ok' | 'error';

export interface HealthResponse {
  status: HealthStatus;
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
}
