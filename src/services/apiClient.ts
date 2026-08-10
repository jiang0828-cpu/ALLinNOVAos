import type { ApiResponse } from '../types/api';

const API_BASE = '/api';

/**
 * Unified API client — wraps fetch with:
 * - Base URL prefix (/api)
 * - Auto-unwrap { code, message, data } response
 * - Error handling for non-OK and non-success codes
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const hasBody = options.body !== undefined;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as ApiResponse<T>;

  // 接受 0（健康检查）以及任何 2xx 业务码（200 OK / 201 Created 等）
  const isSuccess = body.code === 0 || (body.code >= 200 && body.code < 300);
  if (!isSuccess) {
    throw new Error(body.message || `API error: code=${body.code}`);
  }

  return body.data;
}

export const apiClient = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),

  /** Quick health check — returns true if backend is reachable. */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
