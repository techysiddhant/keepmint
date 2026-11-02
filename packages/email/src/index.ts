import { render, toPlainText } from '@react-email/render'
import { ActionEmail } from './action-email'

export { EmailLayout } from './layout'

export type RenderedEmail = { subject: string; html: string; text: string }

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there'

async function build(subject: string, node: React.ReactElement): Promise<RenderedEmail> {
  const html = await render(node)
  return { subject, html, text: toPlainText(html) }
}

export function verifyEmail(p: { appUrl: string; name: string; email: string; url: string }) {
  return build(
    'Verify your email for Keepmint',
    ActionEmail({
      appUrl: p.appUrl,
      preview: 'One tap and your account is confirmed.',
      heading: 'Confirm it’s you',
      greeting: `Hi ${firstName(p.name)},`,
      body: `Thanks for joining the Keepmint beta. Tap the button below to verify ${p.email} and finish setting up your account.`,
      cta: 'Verify my email',
      url: p.url,
      expiry: 'This link works for 24 hours. After that, you can request a new one from the app.',
      ignore: 'Didn’t sign up for Keepmint? You can ignore this email. No account will be created.',
    }),
  )
}

export function resetPasswordEmail(p: {
  appUrl: string
  name: string
  email: string
  url: string
}) {
  return build(
    'Reset your Keepmint password',
    ActionEmail({
      appUrl: p.appUrl,
      preview: 'Your reset link is inside. It expires in 30 minutes.',
      heading: 'Reset your password',
      greeting: `Hi ${firstName(p.name)},`,
      body: `We got a request to reset the password for ${p.email}. Tap the button to choose a new one.`,
      cta: 'Choose a new password',
      url: p.url,
      expiry: 'This link works for 30 minutes and can only be used once.',
      ignore:
        'Didn’t ask for this? Ignore this email and your password stays the same. Nobody can change it without this link.',
    }),
  )
}
