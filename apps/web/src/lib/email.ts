import 'server-only'
import type { RenderedEmail } from '@keepmint/email'
import { Resend } from 'resend'
import { serverEnv } from './env'

let resend: Resend | undefined

/**
 * Sends an account email. Without RESEND_API_KEY it prints the email to the log instead —
 * development only: env validation refuses to start in production without the key.
 */
export async function sendEmail(to: string, email: RenderedEmail) {
  const env = serverEnv()
  if (!env.RESEND_API_KEY) {
    console.info(`\n[email] to ${to}: ${email.subject}\n${email.text}\n`)
    return
  }
  resend ??= new Resend(env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })
  if (error) throw new Error(`Resend failed: ${error.name} — ${error.message}`)
}
