import 'server-only'
import { LEGAL_VERSION } from '@keepmint/core'
import { consentEvents } from '@keepmint/db'
import * as schema from '@keepmint/db/schema'
import { resetPasswordEmail, verifyEmail } from '@keepmint/email'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { admin } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'
import { getDb } from './db'
import { sendEmail } from './email'
import { serverEnv } from './env'
import { ac, roles } from './permissions'

/**
 * Client IP for the consent record. Uses headers the host sets itself (Vercel overwrites
 * these), falling back to the first x-forwarded-for hop only when they're missing.
 */
function clientIp(headers?: Headers | null) {
  return (
    headers?.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    headers?.get('x-real-ip')?.trim() ||
    headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  )
}

/** True for a real IANA time zone name like "Asia/Kolkata". */
function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/**
 * Admin endpoints that take a userId and only read harmless data; every other one is
 * owner-guarded. (list-user-sessions is guarded: it returns raw session tokens.)
 */
const ADMIN_READ_ONLY = new Set(['/admin/get-user'])

/** User columns the admin "update user" endpoint must not write (they have their own paths). */
const ADMIN_LOCKED_FIELDS = ['termsVersion', 'termsAcceptedAt', 'deletedAt'] as const

/** Roles can be stored comma-separated ("admin,owner"), so check each part. */
const hasOwnerRole = (value: unknown) =>
  [value]
    .flat()
    .flatMap((r) => (typeof r === 'string' ? r.split(',') : []))
    .some((r) => r.trim() === 'owner')

/** A soft-deleted (closed) account, from any Better Auth user object. */
const isClosed = (user: object) => Boolean((user as { deletedAt?: Date | null }).deletedAt)

const forbid = (code: string, message: string) => new APIError('FORBIDDEN', { code, message })
const badRequest = (code: string, message: string) => new APIError('BAD_REQUEST', { code, message })

/**
 * Request guards that run before every Better Auth endpoint:
 * - Time zones must be real IANA names (they decide when the daily AI limit resets).
 * - termsVersion is only set at sign-up, where the server stamps termsAcceptedAt with it.
 * - /admin/remove-user is refused: it hard-deletes sessions and credentials before the
 *   (blocked) user delete. Accounts are closed with softDeleteUser() instead.
 * - Admin "update user" can't touch consent fields or deletedAt.
 * - Owners can't be changed, banned, impersonated, re-passworded or signed out through the
 *   admin API by anyone, and no account can be made an owner that way. Owners are set in
 *   the database.
 */
const authGuards = createAuthMiddleware(async (ctx) => {
  const path = ctx.path
  const body = (ctx.body ?? {}) as Record<string, unknown> & {
    userId?: unknown
    role?: unknown
    data?: Record<string, unknown>
  }

  if ((path === '/sign-up/email' || path === '/update-user') && 'timezone' in body) {
    if (!isTimeZone(body.timezone)) throw badRequest('INVALID_TIMEZONE', 'Unknown time zone.')
  }
  if (path === '/update-user' && 'termsVersion' in body) {
    throw badRequest('FIELD_NOT_ALLOWED', 'termsVersion can only be set at sign-up.')
  }
  if (!path.startsWith('/admin/')) return

  if (path === '/admin/remove-user') {
    throw forbid('USE_SOFT_DELETE', 'Accounts are closed, not removed. Use the close-account flow.')
  }
  if (path === '/admin/update-user' && body.data) {
    const locked = ADMIN_LOCKED_FIELDS.filter((f) => f in (body.data ?? {}))
    if (locked.length) throw badRequest('FIELD_NOT_ALLOWED', `Can't change ${locked.join(', ')}.`)
  }
  if (hasOwnerRole(body.role) || hasOwnerRole(body.data?.role)) {
    throw forbid('OWNER_ROLE_LOCKED', 'The owner role can only be set in the database.')
  }
  if (ADMIN_READ_ONLY.has(path) || typeof body.userId !== 'string') return
  const [target] = await getDb()
    .select({ role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, body.userId))
  if (hasOwnerRole(target?.role)) {
    throw forbid(
      'OWNER_PROTECTED',
      'Owner accounts can’t be changed or impersonated from the admin.',
    )
  }
})

// Built on first use, not at import: `next build` imports route modules without any secrets.
function createAuth() {
  const env = serverEnv()
  return betterAuth({
    appName: 'Keepmint',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: 'pg', schema }),
    telemetry: { enabled: false },
    // Counters live in Postgres so every Vercel instance shares them (memory is per
    // instance). On in production only, Better Auth's default.
    rateLimit: { storage: 'database' },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      resetPasswordTokenExpiresIn: 30 * 60,
      // A reset is a security event: sign out every device.
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        // Closed accounts can't log in, so a reset would only confuse (or reveal the account).
        if (isClosed(user)) return
        await sendEmail(
          user.email,
          await resetPasswordEmail({
            appUrl: env.BETTER_AUTH_URL,
            name: user.name,
            email: user.email,
            url,
          }),
        )
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 24 * 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        if (isClosed(user)) return
        await sendEmail(
          user.email,
          await verifyEmail({
            appUrl: env.BETTER_AUTH_URL,
            name: user.name,
            email: user.email,
            url,
          }),
        )
      },
    },

    user: {
      additionalFields: {
        // Set by the browser at sign-up and refreshed on login; decides when "today" ends.
        timezone: { type: 'string', required: false, defaultValue: 'UTC', input: true },
        // The Terms/Privacy version the user ticked at sign-up; the server stamps the time.
        termsVersion: { type: 'string', required: false, input: true },
        termsAcceptedAt: { type: 'date', required: false, input: false },
        // Soft delete (see lib/account.ts). Never settable from the client.
        deletedAt: { type: 'date', required: false, input: false },
      },
    },

    databaseHooks: {
      user: {
        create: {
          // Consent under India's DPDP Act: sign-up only goes through if the current
          // Terms and Privacy Policy were accepted, and the server records when.
          before: async (user, ctx) => {
            if (ctx?.path !== '/sign-up/email') return
            if (user.termsVersion !== LEGAL_VERSION) {
              throw new APIError('BAD_REQUEST', {
                code: 'TERMS_NOT_ACCEPTED',
                message: 'Please accept the Terms and Privacy Policy to continue.',
              })
            }
            return { data: { ...user, termsAcceptedAt: new Date() } }
          },
          after: async (user, ctx) => {
            if (!(user.termsAcceptedAt instanceof Date) || typeof user.termsVersion !== 'string') {
              return
            }
            await getDb()
              .insert(consentEvents)
              .values({
                userId: user.id,
                email: user.email,
                version: user.termsVersion,
                acceptedAt: user.termsAcceptedAt,
                ipAddress: clientIp(ctx?.headers),
                userAgent: ctx?.headers?.get('user-agent')?.slice(0, 500) ?? null,
              })
          },
        },
        // Accounts are soft-deleted, never removed (the database also refuses). Closing an
        // account goes through softDeleteUser() in lib/account.ts instead.
        delete: {
          before: async () => false,
        },
      },
      session: {
        create: {
          // A closed (soft-deleted) account can't start a new session.
          before: async (session) => {
            const [row] = await getDb()
              .select({ deletedAt: schema.user.deletedAt })
              .from(schema.user)
              .where(eq(schema.user.id, session.userId))
            if (row?.deletedAt) {
              throw new APIError('FORBIDDEN', {
                code: 'ACCOUNT_DELETED',
                message: 'This account has been closed.',
              })
            }
          },
        },
      },
    },

    hooks: { before: authGuards },

    plugins: [
      admin({ ac, roles, adminRoles: ['admin', 'owner'], defaultRole: 'user' }),
      nextCookies(),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
export type Session = Auth['$Infer']['Session']

let instance: Auth | undefined
export function getAuth() {
  instance ??= createAuth()
  return instance
}
