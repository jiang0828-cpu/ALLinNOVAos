import type { ApiResponse } from '../types/api';
import {
  getPendingSyncOperations,
  handleLocalRequest,
  mirrorSuccessfulRequest,
} from './localBackupStore';

function getDefaultApiBase(): string {
  const runtimeWindow = globalThis.window;
  if (!runtimeWindow) return '/api';

  const { protocol, hostname, port } = runtimeWindow.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isVitePreview = port === '4173' || port === '4174';
  const isCloudflarePages = hostname.endsWith('.pages.dev');

  if (isLocalHost && isVitePreview) {
    return 'https://allinnovaos.vercel.app/api';
  }

  if (isCloudflarePages) {
    return 'https://allinnovaos.vercel.app/api';
  }

  return '/api';
}

export function getApiBase(): string {
  const runtimeWindow = globalThis.window;
  const hostname = runtimeWindow?.location?.hostname || '';

  if (hostname.endsWith('.pages.dev')) {
    return 'https://allinnovaos.vercel.app/api';
  }

  return (import.meta.env.VITE_API_BASE_URL || getDefaultApiBase()).replace(/\/+$/, '');
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBase()}${normalizedPath}`;
}

function isMutatingRequest(options: RequestInit = {}) {
  return (options.method || 'GET').toUpperCase() !== 'GET';
}

async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const hasBody = options.body !== undefined;
  const res = await fetch(buildApiUrl(path), {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as ApiResponse<T>;
}

export async function flushLocalSyncQueue(): Promise<{ synced: number; pending: number }> {
  return { synced: 0, pending: getPendingSyncOperations().length };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const body = await fetchApi<T>(path, options);
    const isSuccess = body.code === 0 || (body.code >= 200 && body.code < 300);
    if (!isSuccess) {
      if (isMutatingRequest(options)) {
        throw new Error(body.message || `API error: code=${body.code}`);
      }
      const fallback = handleLocalRequest<T>(path, options);
      if (fallback !== undefined) {
        return fallback;
      }
      throw new Error(body.message || `API error: code=${body.code}`);
    }

    mirrorSuccessfulRequest(path, options, body.data);
    void flushLocalSyncQueue();
    return body.data;
  } catch (error) {
    if (isMutatingRequest(options)) {
      throw error;
    }
    const fallback = handleLocalRequest<T>(path, options);
    if (fallback !== undefined) {
      return fallback;
    }
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
