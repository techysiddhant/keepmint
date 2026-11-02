import { getSessionCookie } from 'better-auth/cookies'
import { type NextRequest, NextResponse } from 'next/server'

// Fast, cookie-only redirect for signed-out visitors. The real session check happens in
// the app and admin layouts (lib/session.ts). Signed-in users are sent away from /login
// by the page itself, after a real session check: a cookie alone can be stale (expired,
// or revoked by a password reset), and trusting it here caused a /login ↔ /app loop.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next()
  const { pathname, search } = request.nextUrl
  const url = new URL('/login', request.url)
  url.searchParams.set('next', pathname + search)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/app/:path*', '/admin/:path*'],
}
