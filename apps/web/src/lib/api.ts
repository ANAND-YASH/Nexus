import type { HealthResponse } from '@nexus/types';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Server-side health probe. Returns null when the API is unreachable. */
export async function getApiHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/health`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}
