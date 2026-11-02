import { cn } from '@/lib/utils'

const LABELS = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong']
const BAR = ['bg-pink', 'bg-yellow', 'bg-mint', 'bg-mint']

export function passwordChecks(pw: string) {
  return [pw.length >= 8, /[0-9]/.test(pw), /[A-Z]/.test(pw), /[^A-Za-z0-9]/.test(pw)]
}

/** Four-bar meter + checklist from the sign-up design. Only 8+ characters is required. */
export function PasswordStrength({ password }: { password: string }) {
  const checks = passwordChecks(password)
  const score = password ? checks.filter(Boolean).length : 0
  const reqs: Array<[string, boolean]> = [
    ['8+ characters', checks[0] ?? false],
    ['A number', checks[1] ?? false],
    ['An uppercase letter', checks[2] ?? false],
  ]
  return (
    <div className="mt-1 flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <div aria-hidden className="grid flex-1 grid-cols-4 gap-[5px]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                'h-2 rounded-full border-[1.5px] border-border transition-colors duration-200',
                i < score ? BAR[Math.max(0, score - 1)] : 'bg-transparent',
              )}
            />
          ))}
        </div>
        <span aria-live="polite" className="min-w-[74px] text-right text-[13px] font-bold">
          {password ? LABELS[score] : ''}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold">
        {reqs.map(([text, ok]) => (
          <li
            key={text}
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              ok ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'inline-flex size-4 items-center justify-center rounded-full border-[1.5px] border-current text-[10px] text-sticker-ink',
                ok ? 'bg-mint' : 'bg-transparent',
              )}
            >
              {ok ? '✓' : ''}
            </span>
            {text}
            <span className="sr-only">{ok ? ' (done)' : ' (not yet)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
