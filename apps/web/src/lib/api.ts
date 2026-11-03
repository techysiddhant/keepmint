import type { SyncChange, SyncPullResponse, SyncResult } from '@keepmint/core'

/** A non-2xx response from our own API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: 'no-store', ...init })
  if (!res.ok) throw new ApiError(res.status, `${init?.method ?? 'GET'} ${path} → ${res.status}`)
  return (await res.json()) as T
}

/** Rows changed after `since` (see /api/sync/pull). */
export function pullChanges(since: number) {
  return request<SyncPullResponse>(`/api/sync/pull?since=${since}`)
}

/** Sends device changes; one result per change, in order (see /api/sync/push). */
export async function pushChanges(changes: SyncChange[]) {
  const { results } = await request<{ results: SyncResult[] }>('/api/sync/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ changes }),
  })
  return results
}
