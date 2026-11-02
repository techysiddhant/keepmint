import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <p>
          Keepmint is a bookmark manager in public beta at keepmint.store. This page explains what
          we collect, why, who helps us process it, and the choices you have. Questions:{' '}
          <a href="mailto:hello@keepmint.store">hello@keepmint.store</a>.
        </p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            Account details: your name, email address and a hashed password (we never see the
            password itself).
          </li>
          <li>
            What you save: links, the notes and tags you add, your collections and reading progress.
          </li>
          <li>
            What we make from it: summaries, tags and a readable text copy of each page you save.
          </li>
          <li>
            Usage needed to run the service: how many AI sorts you used today, sign-in sessions and
            devices.
          </li>
          <li>Error reports when something breaks, so we can fix it.</li>
          <li>
            A record of your consent: when you agreed to these terms, which version, and the IP
            address and browser you used, so we can show your consent was given.
          </li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <ul>
          <li>
            To run Keepmint: save, summarise, sort, sync and search your library across your
            devices.
          </li>
          <li>
            To send account emails, such as verifying your address or resetting your password.
          </li>
          <li>To keep the service safe and fair, including the daily AI limit during the beta.</li>
        </ul>
        <p className="mt-3">We don’t sell your data and we don’t use it for advertising.</p>
      </section>
      <section>
        <h2>Who helps us</h2>
        <ul>
          <li>
            Anthropic (Claude API) reads the text of pages you save to write summaries and tags. It
            doesn’t use this data to train its models.
          </li>
          <li>Neon hosts our database, and Cloudflare R2 stores readable page copies.</li>
          <li>Vercel and Railway run the app and the background service.</li>
          <li>
            Resend delivers account emails. Sentry receives error reports, without your saved
            content.
          </li>
        </ul>
      </section>
      <section>
        <h2>On your device</h2>
        <p>
          To work offline, Keepmint keeps a copy of your library on each device you use it on. You
          can clear the saved page copies from Settings; logging out removes your library from that
          device.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <ul>
          <li>
            Export your links, notes, tags and collections at any time. One-click export is coming
            to Settings; until then, email us and we’ll send it.
          </li>
          <li>
            Close your account. It’s deactivated straight away and you’re signed out everywhere. We
            keep your data so the account can be restored if you ask. Email us to close it; a button
            is coming to Settings.
          </li>
          <li>
            Ask us to erase your data. We’ll remove it, except the record of your consent, which we
            keep to show that consent was given.
          </li>
          <li>Email us to ask what we hold about you or to correct it.</li>
        </ul>
      </section>
      <section>
        <h2>Changes</h2>
        <p>
          If we change this policy in a way that matters, we’ll email you before it takes effect.
        </p>
      </section>
    </LegalPage>
  )
}
