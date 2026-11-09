'use client'

import { useSyncExternalStore } from 'react'

/** Often enough for "2m ago" labels and for spotting stuck links. */
const TICK_MS = 30_000

let current = Date.now()
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()

function tick() {
  current = Date.now()
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    // The clock was idle with nobody listening, so catch up first.
    current = Date.now()
    timer = setInterval(tick, TICK_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) clearInterval(timer)
  }
}

/**
 * The current time, ticking every 30 s, shared by every component. Rendering must read the
 * clock through this: `Date.now()` during render breaks React's purity rule, and the React
 * Compiler would cache its result so labels and stuck checks never update.
 */
export function useNow() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => 0,
  )
}
