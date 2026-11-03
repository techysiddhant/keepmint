import { DEFAULTS } from '@keepmint/core'
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckIcon,
  ClipboardIcon,
  CloudUploadIcon,
  DownloadIcon,
  GlobeIcon,
  MailIcon,
  MonitorSmartphoneIcon,
  PlayIcon,
  SaveIcon,
  SearchIcon,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { FeatureTabs } from '@/components/landing/feature-tabs'
import { LandingNav } from '@/components/landing/landing-nav'
import { LiveDemo } from '@/components/landing/live-demo'
import { LogoMark } from '@/components/logo'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: { absolute: 'Keepmint — your links, sorted by AI' },
  description:
    'Drop in any link — a video, a thread, a recipe, a repo. Keepmint reads it, sums it up and files it into the right collection. Even offline.',
  openGraph: {
    title: 'Keepmint — your links, sorted by AI',
    description: 'AI bookmarks that sort themselves. Free during the beta, works offline.',
    url: '/',
    siteName: 'Keepmint',
    type: 'website',
  },
}

const LIMIT = DEFAULTS.dailyAiLimit

// On the violet panels the shadow stays ink in both themes.
const onBrand = '[--shadow:#111] border-sticker-ink'
const h2 =
  'font-display text-[clamp(30px,4.4vw,54px)] leading-[1.05] font-extrabold tracking-[-0.03em]'
const section = 'mx-auto max-w-310 px-5 pt-[clamp(80px,10vw,128px)]'

const LINK_TYPES = [
  'Articles',
  'YouTube',
  'Threads',
  'GitHub repos',
  'PDFs',
  'Recipes',
  'Products',
  'Podcasts',
  'Job posts',
]

const STEPS = [
  [
    '01 · You',
    'bg-yellow',
    'Save from anywhere',
    'Paste any link into Keepmint, in any browser on any device. It’s stored instantly — signal or not.',
  ],
  [
    '02 · AI',
    'bg-pink',
    'It reads for you',
    'Keepmint figures out what it is — video, article, recipe, repo — and writes a two-line summary with tags.',
  ],
  [
    '03 · AI',
    'bg-mint',
    'Filed where you’d look',
    'Related links group into collections. Rename one and Keepmint learns your system.',
  ],
]

const OFFLINE = [
  [BookOpenIcon, 'Read offline', 'bg-white'],
  [SaveIcon, 'Save offline', 'bg-yellow'],
  [SearchIcon, 'Search offline', 'bg-mint'],
  [CloudUploadIcon, 'Auto-sync later', 'bg-pink'],
] as const

const ANYWHERE = [
  [GlobeIcon, 'bg-yellow', 'Any browser', 'Chrome, Safari, Firefox or Edge. Nothing to download.'],
  [
    MonitorSmartphoneIcon,
    'bg-pink',
    'Phone, tablet, laptop',
    'The same library on every screen, kept in sync.',
  ],
  [ClipboardIcon, 'bg-mint', 'Paste anywhere', 'Press ⌘V or Ctrl V inside the app. That’s it.'],
  [
    DownloadIcon,
    'bg-violet text-white',
    'Add to home screen',
    'Install it from your browser so it opens like an app and works offline.',
  ],
] as const

const COMPARE = [
  ['Organizes itself', '—', 'Manual tags', '✓ AI collections'],
  ['Summaries', '—', 'Some', '✓ Every link'],
  ['Videos, repos, threads', 'Link only', 'Mostly articles', '✓ Anything with a URL'],
  ['Search', 'Title only', 'Keyword', '✓ Titles, summaries, tags & notes'],
  ['Full library offline', '—', 'Articles only', '✓ Everything'],
]

const INCLUDED = [
  [
    `${LIMIT} AI-sorted links a day`,
    'Each one read, summarised and filed into the right collection.',
  ],
  [
    'Unlimited saving',
    `Past ${LIMIT}, links are still saved and synced — just without AI that day.`,
  ],
  ['Works offline', 'Read, search and save with no connection.'],
  ['Every device, in sync', 'Phone, tablet and laptop — right in your browser.'],
  ['Search, notes & export', 'Search everything you saved, add notes, export your data anytime.'],
]

const FAQ: Array<[string, ReactNode]> = [
  [
    'Does it really work offline?',
    'Yes. Browsing, reading saved copies and searching all work with no connection. Only the AI step — reading and sorting new links — waits until you’re back online.',
  ],
  [
    'What kinds of links can I save?',
    'Anything with a URL: articles, YouTube videos, threads, GitHub repos, PDFs, recipes, products, podcasts and job posts.',
  ],
  [
    'Can I bring my existing bookmarks?',
    'Bookmark import is rolling out to beta users in waves. Request access from your account and we’ll email you when it’s switched on.',
  ],
  [
    'Is there a limit?',
    `During the beta, the AI reads and sorts up to ${LIMIT} links a day for each person. You can save as many as you like — anything past ${LIMIT} is kept, synced and works offline, just without a summary or sorting that day.`,
  ],
  [
    'What happens to my data?',
    <>
      Your links, notes and collections are stored in our database, and readable page copies in
      cloud storage. To summarise a link, its page text is sent to Anthropic’s Claude API, which
      doesn’t train on it. You can export everything or close your account at any time. Details are
      in the{' '}
      <Link href="/privacy" className="font-bold text-foreground underline underline-offset-[3px]">
        privacy policy
      </Link>
      .
    </>,
  ],
  [
    'Is there a mobile app or browser extension?',
    'Not yet. Keepmint runs right in your browser on your phone, tablet or computer — nothing to download. Add it to your home screen and it opens like an app and works offline.',
  ],
]

const FOOTER_STICKERS = [
  [
    'Product',
    'bg-yellow rotate-[-4deg]',
    [
      ['Features', '#features'],
      ['Live demo', '#demo'],
      ['Pricing', '#pricing'],
    ],
  ],
  [
    'Account',
    'bg-pink rotate-3 tablet:mt-6',
    [
      ['Sign up', '/signup'],
      ['Log in', '/login'],
      ['Help & FAQ', '#faq'],
    ],
  ],
  [
    'Company',
    'bg-mint -rotate-2 tablet:mt-1.5',
    [
      ['Contact', 'mailto:hello@keepmint.store'],
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
    ],
  ],
] as const

export default function HomePage() {
  return (
    <div className="text-[17px]">
      <LandingNav />

      <main>
        {/* HERO */}
        <section
          id="top"
          className="mx-auto flex max-w-310 flex-wrap items-center gap-12 px-5 pt-[clamp(40px,7vw,88px)]"
        >
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-6">
            <Badge
              variant="mint"
              className="animate-[rise_.7s_var(--ease-pop)_both,wob_3.2s_ease-in-out_infinite] gap-2 self-start rounded-full px-3.5 py-1.5 text-sm"
            >
              <span aria-hidden className="size-2 rounded-full bg-sticker-ink" />
              Now in beta · works offline
            </Badge>
            <h1 className="animate-rise font-display text-[clamp(40px,6vw,78px)] leading-[1.03] font-extrabold tracking-[-0.035em] [animation-delay:.08s]">
              Your links,
              <br />
              <span className="inline-block -rotate-2 rounded-[18px] border-[3px] border-border bg-yellow px-3.5 text-sticker-ink">
                sorted
              </span>{' '}
              by AI.
            </h1>
            <p className="max-w-130 animate-rise text-[clamp(18px,1.6vw,21px)] text-muted-foreground [animation-delay:.16s]">
              Drop in any link — a video, a thread, a recipe, a repo. Keepmint reads it, sums it up
              and files it into the right collection. You just keep saving. Even offline.
            </p>
            <div className="flex animate-rise flex-wrap gap-3.5 [animation-delay:.24s]">
              <Link href="/signup" className={buttonVariants({ size: 'xl' })}>
                Start saving free <ArrowRightIcon className="size-5" aria-hidden />
              </Link>
              <a href="#demo" className={buttonVariants({ variant: 'secondary', size: 'xl' })}>
                <span
                  aria-hidden
                  className="flex size-6.5 items-center justify-center rounded-full border-2 border-sticker-ink bg-pink text-sticker-ink"
                >
                  <PlayIcon className="size-3 fill-current" />
                </span>
                Try the live demo
              </a>
            </div>
            <ul className="flex animate-rise flex-wrap gap-x-5.5 gap-y-2 text-[15px] font-medium text-muted-foreground [animation-delay:.34s]">
              {['Free during the beta', 'No credit card', 'Runs in any browser'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckIcon className="size-4" aria-hidden strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <LiveDemo />
        </section>

        {/* MARQUEE */}
        <section
          aria-label="Link types Keepmint understands"
          className="group mt-[clamp(64px,8vw,104px)] overflow-hidden border-y-2 border-border bg-yellow text-sticker-ink"
        >
          <div className="flex w-max animate-marquee py-4.5 font-display text-xl font-bold whitespace-nowrap group-hover:paused">
            {[0, 1].map((copy) =>
              LINK_TYPES.map((t) => (
                <span
                  key={`${copy}-${t}`}
                  aria-hidden={copy === 1 || undefined}
                  className="flex items-center"
                >
                  <span className="px-5.5">{t}</span>
                  <span aria-hidden>✦</span>
                </span>
              )),
            )}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" aria-labelledby="how-h" className={section}>
          <div className="mb-11 flex flex-wrap items-end justify-between gap-5">
            <h2 id="how-h" className={`max-w-170 ${h2}`}>
              Three steps. You only do the first one.
            </h2>
            <p className="max-w-90 text-muted-foreground">
              No folders to set up. No tags to remember. Just save and move on.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
            {STEPS.map(([tag, bg, title, text]) => (
              <div
                key={title}
                className="lift flex flex-col gap-3.5 rounded-[22px] border-2 border-border bg-card p-7.5 shadow-hard-lg"
              >
                <span
                  className={`self-start rounded-full border-2 border-border px-3 py-1.5 font-display text-[15px] font-extrabold text-sticker-ink ${bg}`}
                >
                  {tag}
                </span>
                <h3 className="font-display text-2xl tracking-[-0.02em]">{title}</h3>
                <p className="text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" aria-labelledby="feat-h" className={`${section} scroll-mt-24`}>
          <h2 id="feat-h" className={`mb-7 max-w-190 ${h2}`}>
            Bookmarks that don’t turn into a junk drawer.
          </h2>
          <FeatureTabs />
        </section>

        {/* OFFLINE */}
        <section id="offline" aria-labelledby="off-h" className={`${section} scroll-mt-24`}>
          <div className="flex flex-wrap items-center gap-10 rounded-[30px] border-[3px] border-border bg-violet p-[clamp(28px,5vw,64px)] text-white shadow-pop">
            <div className="flex flex-[1_1_400px] flex-col gap-4.5">
              <h2
                id="off-h"
                className="font-display text-[clamp(32px,5vw,60px)] leading-[1.03] font-extrabold tracking-[-0.035em]"
              >
                Airplane mode? Still works.
              </h2>
              <p className="text-[19px]">
                Add Keepmint to your home screen or desktop right from your browser — no app store,
                nothing to download. Your whole library, with summaries, tags and page copies, stays
                on your device. Save, read and search with no signal, and it catches up when you’re
                back.
              </p>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'lg' }),
                  onBrand,
                  'mt-1.5 self-start bg-white text-sticker-ink',
                )}
              >
                <DownloadIcon className="size-4.5" aria-hidden />
                Open Keepmint
              </Link>
            </div>
            <div className="grid flex-[1_1_320px] grid-cols-2 gap-3 font-bold text-sticker-ink">
              {OFFLINE.map(([Icon, label, bg], i) => (
                <div
                  key={label}
                  style={{ animationDelay: `${i * 0.5}s` }}
                  className={`flex animate-floaty flex-col gap-2.5 rounded-[18px] border-2 border-sticker-ink p-5 shadow-[4px_4px_0_#111] ${bg}`}
                >
                  <Icon className="size-6" aria-hidden />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SAVE FROM ANYWHERE */}
        <section aria-labelledby="any-h" className={section}>
          <h2 id="any-h" className={`mb-10 text-center ${h2}`}>
            Works everywhere you browse.
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
            {ANYWHERE.map(([Icon, bg, title, text]) => (
              <div
                key={title}
                className="lift flex flex-col gap-3 rounded-[22px] border-2 border-border bg-card p-6.5 shadow-hard-lg"
              >
                <span
                  aria-hidden
                  className={`flex size-12 items-center justify-center rounded-[14px] border-2 border-border text-sticker-ink ${bg}`}
                >
                  <Icon className="size-5.5" />
                </span>
                <h3 className="font-display text-[19px]">{title}</h3>
                <p className="text-base text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* COMPARISON */}
        <section
          aria-labelledby="cmp-h"
          className="mx-auto max-w-260 px-5 pt-[clamp(80px,10vw,128px)]"
        >
          <h2 id="cmp-h" className={`mb-9 text-center ${h2}`}>
            Why not just use bookmarks?
          </h2>
          <div className="overflow-x-auto rounded-[22px] border-2 border-border bg-card shadow-hard-lg">
            <table className="w-full min-w-140 border-collapse text-base">
              <thead>
                <tr className="text-left">
                  <th
                    scope="col"
                    className="border-b-2 border-border px-5 py-4.5 font-bold text-muted-foreground"
                  >
                    What you get
                  </th>
                  <th scope="col" className="border-b-2 border-border px-5 py-4.5 font-bold">
                    Browser bookmarks
                  </th>
                  <th scope="col" className="border-b-2 border-border px-5 py-4.5 font-bold">
                    Read-later apps
                  </th>
                  <th
                    scope="col"
                    className="border-b-2 border-border bg-yellow px-5 py-4.5 font-display text-sticker-ink"
                  >
                    Keepmint
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([row, a, b, ours], i) => {
                  const last = i === COMPARE.length - 1
                  const cell = `px-5 py-4 ${last ? '' : 'border-b border-line'}`
                  return (
                    <tr key={row}>
                      <th scope="row" className={`${cell} text-left font-semibold`}>
                        {row}
                      </th>
                      <td className={`${cell} text-muted-foreground`}>{a}</td>
                      <td className={`${cell} text-muted-foreground`}>{b}</td>
                      <td className={`${cell} font-bold`}>{ours}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* PRICING */}
        <section
          id="pricing"
          aria-labelledby="price-h"
          className="mx-auto max-w-270 scroll-mt-24 px-5 pt-[clamp(80px,10vw,128px)]"
        >
          <div className="mb-10 flex flex-col items-center gap-3.5 text-center">
            <Badge variant="mint" className="gap-2 rounded-full px-3.5 py-1.5 text-sm">
              <span aria-hidden className="size-2 rounded-full bg-sticker-ink" />
              Public beta
            </Badge>
            <h2 id="price-h" className={h2}>
              Free while we’re in beta
            </h2>
            <p className="max-w-140 text-lg text-muted-foreground">
              No plans to pick and no card to add. Sign up and start saving.
            </p>
          </div>
          <div className="flex flex-wrap overflow-hidden rounded-[28px] border-[3px] border-border bg-card shadow-pop">
            <div className="flex flex-[1_1_320px] flex-col gap-4 bg-yellow p-[clamp(24px,4vw,40px)] text-sticker-ink">
              <Badge
                variant="outline"
                className="self-start rounded-full border-sticker-ink bg-white px-2.5 text-[13px] text-sticker-ink"
              >
                Beta plan
              </Badge>
              <span className="font-display text-[clamp(52px,6vw,72px)] leading-none font-extrabold">
                Free
              </span>
              <span>for everyone during the beta</span>
              <div
                aria-hidden
                className="flex flex-col gap-2 rounded-[14px] border-2 border-sticker-ink bg-white px-3.5 py-3"
              >
                <span className="flex justify-between text-[13px] font-bold">
                  <span>✦ AI sorts today</span>
                  <span>36 / {LIMIT}</span>
                </span>
                <span className="block h-2.5 overflow-hidden rounded-full border-2 border-sticker-ink">
                  <span className="block h-full w-[72%] bg-mint" />
                </span>
                <span className="text-xs">Resets every midnight</span>
              </div>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: 'xl' }), onBrand, 'mt-auto')}
              >
                Start free in the beta →
              </Link>
              <span className="text-center text-[13px] font-semibold">No credit card needed</span>
            </div>
            <div className="flex flex-[1.4_1_360px] flex-col gap-4.5 p-[clamp(24px,4vw,40px)]">
              <strong className="font-display text-xl tracking-[-0.02em]">What’s included</strong>
              <ul className="flex flex-col gap-3.5">
                {INCLUDED.map(([title, text], i) => (
                  <li key={title} className="flex gap-3">
                    <span
                      aria-hidden
                      className={`flex size-6.5 shrink-0 items-center justify-center rounded-lg border-2 border-border text-sticker-ink ${i === 0 ? 'bg-pink' : 'bg-mint'}`}
                    >
                      {i === 0 ? '✦' : <CheckIcon className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span>
                      <strong>{title}</strong>
                      <br />
                      <span className="text-muted-foreground">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="rounded-xl border-2 border-dashed border-line px-3.5 py-3 text-sm text-muted-foreground">
                Paid plans with more AI sorting will come later. We’ll tell you well before anything
                changes.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-h"
          className="mx-auto max-w-215 scroll-mt-24 px-5 pt-[clamp(80px,10vw,128px)]"
        >
          <h2 id="faq-h" className={`mb-8 text-center ${h2}`}>
            Questions? Answers.
          </h2>
          <Accordion defaultValue={[FAQ[0]?.[0]]} className="gap-3.5">
            {FAQ.map(([q, a]) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionContent>{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      {/* FOOTER (sticker board + final CTA) */}
      <footer className="mt-[clamp(80px,10vw,128px)] border-t-[3px] border-sticker-ink bg-brand text-white">
        <div className="mx-auto flex max-w-310 flex-col gap-[clamp(40px,5vw,56px)] px-5 pt-[clamp(48px,6vw,72px)] pb-7">
          <div className="flex flex-wrap items-start justify-between gap-12">
            <div className="flex max-w-120 flex-[1_1_360px] flex-col gap-5.5">
              <h2
                id="cta-h"
                className="font-display text-[clamp(32px,4.2vw,50px)] leading-[1.05] font-extrabold tracking-[-0.03em]"
              >
                Ready to stop losing links?
              </h2>
              <p className="text-lg text-brand-soft">
                The beta is open. Sign up and save your first link in under a minute.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className={cn(buttonVariants({ variant: 'sticker', size: 'xl' }), onBrand)}
                >
                  Start free in the beta <ArrowRightIcon className="size-5" aria-hidden />
                </Link>
                <a
                  href="#demo"
                  className={cn(
                    buttonVariants({ variant: 'secondary', size: 'xl' }),
                    onBrand,
                    'bg-white text-sticker-ink',
                  )}
                >
                  Try the demo first
                </a>
              </div>
            </div>
            <nav
              aria-label="Footer"
              className="flex flex-[1_1_520px] flex-wrap justify-end gap-5.5 pt-2 text-sticker-ink"
            >
              {FOOTER_STICKERS.map(([title, cls, links]) => (
                <div
                  key={title}
                  className={`flex max-w-50 flex-[1_1_160px] flex-col gap-2.5 rounded-[20px] border-2 border-sticker-ink p-5.5 shadow-[6px_6px_0_#111] transition-[transform,box-shadow] duration-200 ease-pop hover:-translate-x-0.75 hover:-translate-y-1.25 hover:shadow-[10px_10px_0_#111] ${cls}`}
                >
                  <strong className="mb-1 font-display text-[15px]">{title}</strong>
                  {links.map(([label, href]) => (
                    <a
                      key={label}
                      href={href}
                      className="self-start font-medium underline-offset-4 hover:underline"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-5 border-t-2 border-white/45 pt-6">
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-3">
              <LogoMark className="size-9 rounded-[10px] border-sticker-ink" />
              <span className="font-display text-[22px] font-extrabold">keepmint</span>
              <span className="text-sm text-brand-soft">
                © 2026 · AI bookmarks that sort themselves
              </span>
            </div>
            <a
              href="mailto:hello@keepmint.store"
              aria-label="Email us"
              className="flex size-11 items-center justify-center rounded-full border-2 border-sticker-ink bg-white text-sticker-ink transition-transform hover:-translate-y-0.75 hover:-rotate-6"
            >
              <MailIcon className="size-4.5" aria-hidden />
            </a>
          </div>
        </div>
      </footer>

      {/* PHONE STICKY CTA */}
      <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t-2 border-border bg-background px-4 py-3 min-[641px]:hidden">
        <span className="flex-1 text-[15px] font-bold">Free during the beta</span>
        <Link href="/signup" className={buttonVariants()}>
          Start free
        </Link>
      </div>
    </div>
  )
}
