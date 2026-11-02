'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TABS = ['Auto-collections', 'Summaries', 'Never lose a page'] as const

const COLLECTIONS = [
  ['Kitchen', '18 links · 6 videos', 'bg-pink text-sticker-ink -rotate-[1.5deg]'],
  ['Rust & systems', '34 links · 2 repos', 'bg-yellow text-sticker-ink rotate-1'],
  ['Side projects', '21 links', 'bg-mint text-sticker-ink rotate-[1.5deg]'],
  ['Design refs', '52 links', 'bg-violet text-white -rotate-1'],
]
const SUMMARIES = [
  [
    'VIDEO',
    'bg-pink',
    'Crispy chili oil, three ways',
    'Key step at 4:10 — steep aromatics low before the chili.',
  ],
  [
    'ARTICLE',
    'bg-yellow',
    'How the async executor polls',
    'Builds a toy executor to explain wakers. 14 min read.',
  ],
  ['JOB', 'bg-sky', 'Senior Frontend Engineer, remote', 'React + TypeScript. Closes Nov 14.'],
]

function Panel({
  title,
  text,
  children,
}: {
  title: string
  text: string
  children: React.ReactNode
}) {
  return (
    <div className="flex animate-pop flex-wrap items-center gap-9">
      <div className="flex flex-[1_1_300px] flex-col gap-3.5">
        <h3 className="font-display text-[clamp(24px,2.6vw,32px)] tracking-[-0.02em]">{title}</h3>
        <p className="text-muted-foreground">{text}</p>
      </div>
      <div className="min-w-0 flex-[1.3_1_360px]">{children}</div>
    </div>
  )
}

export function FeatureTabs() {
  return (
    <Tabs defaultValue="0">
      <TabsList
        aria-label="Features"
        className="h-auto w-full justify-start gap-2.5 overflow-x-auto border-0 bg-transparent p-1 pb-2.5"
      >
        {TABS.map((label, i) => (
          <TabsTrigger
            key={label}
            value={String(i)}
            className="h-12 flex-none rounded-[14px] border-2 border-border bg-card px-[18px] hover:-translate-y-px hover:bg-card data-active:bg-primary data-active:text-primary-foreground data-active:shadow-hard data-active:hover:bg-primary"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent
        value="0"
        className="mt-3.5 rounded-[26px] border-2 border-border bg-card p-[clamp(22px,4vw,44px)] shadow-[5px_5px_0_var(--shadow)]"
      >
        <Panel
          title="Collections that build themselves"
          text="Every save is grouped by topic as it arrives. Pin, rename or merge a collection — Keepmint follows your lead from then on."
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
            {COLLECTIONS.map(([name, count, cls]) => (
              <div
                key={name}
                className={`lift rounded-[18px] border-2 border-border p-[18px] ${cls}`}
              >
                <strong className="font-display">{name}</strong>
                <br />
                <span className="text-sm">{count}</span>
              </div>
            ))}
            <div className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-[18px] border-2 border-dashed border-border p-[18px]">
              <span>
                <strong>Suggested: Travel</strong>{' '}
                <span className="text-muted-foreground">· 7 links look related</span>
              </span>
              <span className="rounded-[10px] border-2 border-border px-3 py-1.5 text-sm font-bold">
                Create
              </span>
            </div>
          </div>
        </Panel>
      </TabsContent>
      <TabsContent
        value="1"
        className="mt-3.5 rounded-[26px] border-2 border-border bg-card p-[clamp(22px,4vw,44px)] shadow-[5px_5px_0_var(--shadow)]"
      >
        <Panel
          title="A TL;DR on every link"
          text="Know why you saved something before you open it. Videos get the key timestamp, recipes the key step, articles the main point."
        >
          <div className="flex flex-col gap-3">
            {SUMMARIES.map(([type, bg, title, text]) => (
              <div
                key={title}
                className="lift flex items-start gap-3.5 rounded-2xl border-2 border-border px-[18px] py-4"
              >
                <span
                  className={`shrink-0 rounded-lg border-2 border-sticker-ink px-2 py-0.5 text-xs font-bold text-sticker-ink ${bg}`}
                >
                  {type}
                </span>
                <span>
                  <strong>{title}</strong>
                  <br />
                  <span className="text-[15px] text-muted-foreground">{text}</span>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </TabsContent>
      <TabsContent
        value="2"
        className="mt-3.5 rounded-[26px] border-2 border-border bg-card p-[clamp(22px,4vw,44px)] shadow-[5px_5px_0_var(--shadow)]"
      >
        <Panel
          title="Never lose a page again"
          text="Keepmint keeps a clean, readable copy of every article you save. If the original disappears, your copy doesn’t."
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
            <div className="flex flex-col gap-1 rounded-[18px] border-2 border-border bg-background p-5">
              <span className="text-[13px] font-bold text-muted-foreground">ORIGINAL LINK</span>
              <span className="font-display text-[40px] font-extrabold">404</span>
              <span className="text-[15px] text-muted-foreground">Page not found</span>
            </div>
            <div className="lift flex flex-col gap-1 rounded-[18px] border-2 border-border bg-mint p-5 text-sticker-ink">
              <span className="text-[13px] font-bold">YOUR KEEPMINT COPY</span>
              <span className="font-display text-lg leading-tight font-bold">
                9 rules for better empty states
              </span>
              <span className="text-[15px]">Full text, readable offline.</span>
            </div>
          </div>
        </Panel>
      </TabsContent>
    </Tabs>
  )
}
