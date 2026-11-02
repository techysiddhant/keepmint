import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage } from '@/components/legal/legal-page'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <section>
        <p>
          These terms cover your use of Keepmint (keepmint.store). By creating an account you agree
          to them. If you don’t agree, please don’t use Keepmint.
        </p>
      </section>
      <section>
        <h2>The beta</h2>
        <p>
          Keepmint is in public beta and free to use. Features may change, and the AI reads and
          sorts a limited number of links per person each day. Links past the limit are still saved.
          We’ll tell you well before introducing paid plans.
        </p>
      </section>
      <section>
        <h2>Your account</h2>
        <p>
          You need a valid email address and you’re responsible for keeping your password safe. One
          person per account.
        </p>
      </section>
      <section>
        <h2>Your content</h2>
        <p>
          You own what you save. You give us permission to store and process it only to run Keepmint
          for you, as described in the <Link href="/privacy">Privacy Policy</Link>. AI summaries can
          be wrong; check the original when it matters.
        </p>
      </section>
      <section>
        <h2>Fair use</h2>
        <ul>
          <li>
            Don’t use Keepmint to break the law or to store content you don’t have the right to.
          </li>
          <li>
            Don’t try to get around the daily limits, overload the service, or access other people’s
            data.
          </li>
          <li>Don’t resell or automate access to Keepmint without our permission.</li>
        </ul>
        <p className="mt-3">We may suspend accounts that break these rules.</p>
      </section>
      <section>
        <h2>Availability and liability</h2>
        <p>
          We work hard to keep Keepmint running and your data safe, but during the beta the service
          is provided as is, without guarantees. Keep your own export of anything you can’t afford
          to lose. To the extent the law allows, we aren’t liable for indirect losses from using
          Keepmint.
        </p>
      </section>
      <section>
        <h2>Ending things</h2>
        <p>
          You can close your account at any time. If we ever shut Keepmint down, we’ll give you
          notice and time to export your data.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          <a href="mailto:hello@keepmint.store">hello@keepmint.store</a>
        </p>
      </section>
    </LegalPage>
  )
}
