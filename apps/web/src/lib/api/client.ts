/**
 * Low-level HTTP client for the NEXUS API. Server-side only: the base URL
 * and access tokens never reach the browser.
 */
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** Status used when the API could not be reached at all. */
export const API_UNREACHABLE = 0;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get unreachable(): boolean {
    return this.status === API_UNREACHABLE;
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Access token, sent as `Authorization: Bearer`. */
  token?: string;
}

/** Nest error bodies carry `message` as a string or a list of strings. */
function errorMessage(body: unknown, fallback: string): string {
  const message = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join('. ');
  return typeof message === 'string' ? message : fallback;
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token }: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(API_UNREACHABLE, 'The NEXUS API is unreachable.');
  }

  if (res.status === 204) return undefined as T;
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(payload, res.statusText));
  }
  return payload as T;
}
