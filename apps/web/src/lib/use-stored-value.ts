'use client'

import { useSyncExternalStore } from 'react'

/** Values for storage that's blocked (private windows), so choices still work this visit. */
const fallback = new Map<string, string>()
const listeners = new Set<() => void>()

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? fallback.get(key) ?? null
  } catch {
    return fallback.get(key) ?? null
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** A small per-device preference from localStorage; `null` when unset and on the server. */
export function useStoredValue(key: string): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  )
  const set = (next: string) => {
    fallback.set(key, next)
    try {
      localStorage.setItem(key, next)
    } catch {}
    for (const listener of listeners) listener()
  }
  return [value, set]
}
