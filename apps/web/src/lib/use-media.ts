'use client'

import { useSyncExternalStore } from 'react'

/** Phone layout (≤ 600px), matching the `tablet` breakpoint in globals.css. */
const PHONE_QUERY = '(max-width: 600px)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(PHONE_QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function useIsPhone() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  )
}
