import type { ReactNode } from 'react'
import { Body, Container, Head, Html, Preview, Section, Text } from 'react-email'

const ink = '#111111'

/** Shared frame for every Keepmint email: lavender ground, white card with an ink border. */
export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: '32px 16px',
          backgroundColor: '#F1EEFF',
          fontFamily: "'DM Sans', Arial, sans-serif",
          color: ink,
        }}
      >
        <Container style={{ maxWidth: 560, margin: '0 auto' }}>
          <Text style={{ fontSize: 22, fontWeight: 800, margin: '0 0 16px' }}>keepmint</Text>
          <Section
            style={{
              backgroundColor: '#FFFFFF',
              border: `2px solid ${ink}`,
              borderRadius: 16,
              padding: 28,
            }}
          >
            {children}
          </Section>
          <Text style={{ fontSize: 12, color: '#45405C', margin: '16px 0 0' }}>
            You're getting this because of your Keepmint account.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
