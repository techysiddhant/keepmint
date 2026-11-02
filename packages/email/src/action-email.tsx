import { Button, Heading, Link, Text } from 'react-email'
import { EmailLayout, emailStyles as s } from './layout'

type ActionEmailProps = {
  appUrl: string
  preview: string
  heading: string
  greeting: string
  body: string
  cta: string
  url: string
  expiry: string
  ignore: string
}

/** One template for every "tap this button" account email (verify, reset). */
export function ActionEmail(p: ActionEmailProps) {
  const text = { margin: '0 0 18px', fontSize: 16, lineHeight: 1.6, color: s.ink }
  return (
    <EmailLayout preview={p.preview} appUrl={p.appUrl}>
      <Heading
        as="h1"
        style={{
          margin: '0 0 18px',
          fontFamily: s.display,
          fontWeight: 800,
          fontSize: 26,
          lineHeight: 1.15,
          color: s.ink,
        }}
      >
        {p.heading}
      </Heading>
      <Text style={text}>{p.greeting}</Text>
      <Text style={text}>{p.body}</Text>
      <Button
        href={p.url}
        style={{
          display: 'inline-block',
          padding: '16px 26px',
          border: `2px solid ${s.ink}`,
          borderRadius: 14,
          backgroundColor: s.violet,
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: 17,
          textDecoration: 'none',
          boxShadow: `4px 4px 0 ${s.ink}`,
        }}
      >
        {p.cta}
      </Button>
      <Text
        style={{
          margin: '22px 0 18px',
          padding: '12px 14px',
          border: `2px dashed ${s.line}`,
          borderRadius: 12,
          fontSize: 14,
          lineHeight: 1.5,
          color: s.muted,
        }}
      >
        {p.expiry}
      </Text>
      <Text style={{ margin: '0 0 18px', fontSize: 13, lineHeight: 1.5, color: s.muted }}>
        Button not working? Paste this link into your browser:
        <br />
        <Link href={p.url} style={{ color: s.link, wordBreak: 'break-all' }}>
          {p.url}
        </Link>
      </Text>
      <Text style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: s.muted }}>{p.ignore}</Text>
    </EmailLayout>
  )
}
