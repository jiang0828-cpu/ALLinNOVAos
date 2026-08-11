import type { ApiResponse } from '../types/api';
import { handleLocalRequest, mirrorSuccessfulRequest } from './localBackupStore';

function getDefaultApiBase(): string {
  if (typeof window === 'undefined') return '/api';

  const { protocol, hostname, port } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isVitePreview = port === '4173' || port === '4174';

  if (isLocalHost && isVitePreview) {
    return `${protocol}//${hostname}:3003/api`;
  }

  return '/api';
}

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || getDefaultApiBase()).replace(/\/+$/, '');

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(path);
  const hasBody = options.body !== undefined;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    });

    if (!res.ok) {
      const fallback = handleLocalRequest<T>(path, options);
      if (fallback !== undefined) return fallback;
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as ApiResponse<T>;
    const isSuccess = body.code === 0 || (body.code >= 200 && body.code < 300);
    if (!isSuccess) {
      const fallback = handleLocalRequest<T>(path, options);
      if (fallback !== undefined) return fallback;
      throw new Error(body.message || `API error: code=${body.code}`);
    }

    mirrorSuccessfulRequest(path, options, body.data);
    return body.data;
  } catch (error) {
    const fallback = handleLocalRequest<T>(path, options);
    if (fallback !== undefined) return fallback;
    throw error;
  }
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

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(buildApiUrl('/health'));
      return res.ok;
    } catch {
      return false;
    }
  },
};
