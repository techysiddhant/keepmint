import 'server-only'
import { serverEnv } from './env'

/**
 * Cookie-authenticated writes must come from our own pages. Browsers always send
 * `Origin` on cross-site POSTs, so a missing header means a same-origin or non-browser call.
 */
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(serverEnv().BETTER_AUTH_URL).origin
}
