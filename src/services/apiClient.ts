import type { ApiResponse } from '../types/api';
import {
  getPendingSyncOperations,
  handleLocalRequest,
  markSyncOperationDone,
  markSyncOperationFailed,
  mirrorSuccessfulRequest,
  queueLocalSyncOperation,
} from './localBackupStore';

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

let syncInFlight = false;

export async function flushLocalSyncQueue(): Promise<{ synced: number; pending: number }> {
  if (syncInFlight || typeof window === 'undefined') {
    return { synced: 0, pending: getPendingSyncOperations().length };
  }

  syncInFlight = true;
  let synced = 0;

  try {
    const queue = getPendingSyncOperations();
    for (const operation of queue) {
      try {
        const options: RequestInit = {
          method: operation.method,
          body: operation.body,
        };
        const body = await fetchApi(operation.path, options);
        const isSuccess = body.code === 0 || (body.code >= 200 && body.code < 300);
        if (!isSuccess) throw new Error(body.message || `API error: code=${body.code}`);
        mirrorSuccessfulRequest(operation.path, options, body.data);
        markSyncOperationDone(operation.id);
        synced += 1;
      } catch (error) {
        markSyncOperationFailed(operation.id, (error as Error).message);
        break;
      }
    }
  } finally {
    syncInFlight = false;
  }

  return { synced, pending: getPendingSyncOperations().length };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const body = await fetchApi<T>(path, options);
    const isSuccess = body.code === 0 || (body.code >= 200 && body.code < 300);
    if (!isSuccess) {
      const fallback = handleLocalRequest<T>(path, options);
      if (fallback !== undefined) {
        if (isMutatingRequest(options)) queueLocalSyncOperation(path, options);
        return fallback;
      }
      throw new Error(body.message || `API error: code=${body.code}`);
    }

    mirrorSuccessfulRequest(path, options, body.data);
    void flushLocalSyncQueue();
    return body.data;
  } catch (error) {
    const fallback = handleLocalRequest<T>(path, options);
    if (fallback !== undefined) {
      if (isMutatingRequest(options)) queueLocalSyncOperation(path, options);
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
      if (res.ok) void flushLocalSyncQueue();
      return res.ok;
    } catch {
      return false;
    }
  },
};
