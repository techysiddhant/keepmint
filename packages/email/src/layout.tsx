import type { ReactNode } from 'react'
import { Body, Container, Head, Html, Link, Preview, Section, Text } from 'react-email'

// Email-safe version of the design: table layout (react-email), inline styles, and
// font stacks that fall back to Arial in clients that ignore web fonts.

const ink = '#111111'
const muted = '#45405C'
const line = '#DDD8F2'
const display = "Unbounded, 'Arial Black', Arial, sans-serif"
const body = "'DM Sans', Arial, sans-serif"

export const emailStyles = { ink, muted, line, display, body, link: '#5536E0', violet: '#6A4CF5' }

export function EmailLayout({
  preview,
  appUrl,
  children,
}: {
  preview: string
  appUrl: string
  children: ReactNode
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{ margin: 0, padding: '28px 12px', backgroundColor: '#EEEDF2', fontFamily: body }}
      >
        <Container
          style={{
            maxWidth: 600,
            margin: '0 auto',
            backgroundColor: '#FFFFFF',
            border: `2px solid ${ink}`,
            borderRadius: 22,
            overflow: 'hidden',
          }}
        >
          <Section
            style={{
              padding: '18px 28px',
              backgroundColor: '#FFD43B',
              borderBottom: `2px solid ${ink}`,
            }}
          >
            <Text
              style={{ margin: 0, fontFamily: display, fontWeight: 800, fontSize: 19, color: ink }}
            >
              keepmint
            </Text>
          </Section>
          <Section style={{ padding: '32px 28px' }}>{children}</Section>
          <Section style={{ padding: '16px 28px', borderTop: `2px solid ${line}` }}>
            <Text style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: muted }}>
              You’re getting this because someone used this address on keepmint.store. This is an
              account email, so it can’t be unsubscribed from.
              <br />
              Keepmint · AI bookmarks that sort themselves ·{' '}
              <Link href={`${appUrl}/privacy`} style={{ color: '#5536E0' }}>
                Privacy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
