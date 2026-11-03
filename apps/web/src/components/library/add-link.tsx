'use client'

import { detectTypeFromHost, parseLinkInput, SAMPLE_LINKS } from '@keepmint/core'
import { useForm } from '@tanstack/react-form'
import { CircleAlertIcon, LinkIcon, SparklesIcon } from 'lucide-react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { submitThenChange } from '@/lib/form'
import { cn } from '@/lib/utils'
import { addLinkSchema } from '@/lib/validation/link'
import { LINK_TYPE_DISPLAY } from './link-display'
import { useLibrary } from './use-library'

type AddLinkApi = { open: (url?: string) => void }
const AddLinkContext = createContext<AddLinkApi | null>(null)

export function useAddLink() {
  const value = useContext(AddLinkContext)
  if (!value) throw new Error('useAddLink must be used inside <AddLinkProvider>')
  return value
}

/** Typing in a field, or a menu/dialog has focus: leave keys and paste alone. */
function isEditable(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return Boolean(
    el?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'),
  )
}

/**
 * The Add link dialog, plus its shortcuts: `N` opens it, and pasting a link anywhere in
 * the app (outside a text field) opens it with the link filled in.
 */
export function AddLinkProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [prefill, setPrefill] = useState('')
  // Remounting the form on each open resets it.
  const [formKey, setFormKey] = useState(0)

  const show = useCallback((url = '') => {
    setPrefill(url)
    setFormKey((k) => k + 1)
    setOpen(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditable(e.target) || document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      show()
    }
    const onPaste = (e: ClipboardEvent) => {
      if (isEditable(e.target) || document.querySelector('[role="dialog"]')) return
      const text = e.clipboardData?.getData('text/plain').trim() ?? ''
      if (!text || /\s/.test(text) || !parseLinkInput(text)) return
      e.preventDefault()
      show(text)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paste', onPaste)
    }
  }, [show])

  const api = useMemo(() => ({ open: show }), [show])
  return (
    <AddLinkContext.Provider value={api}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-5 sm:max-w-130">
          <AddLinkForm key={formKey} initialUrl={prefill} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </AddLinkContext.Provider>
  )
}

function AddLinkForm({ initialUrl, onDone }: { initialUrl: string; onDone: () => void }) {
  const { addLink, usage } = useLibrary()
  const form = useForm({
    defaultValues: { url: initialUrl, readLater: false },
    validationLogic: submitThenChange,
    validators: { onDynamic: addLinkSchema },
    onSubmit: async ({ value }) => {
      const saved = await addLink(value.url.trim(), { readLater: value.readLater })
      if (!saved) return
      onDone()
      // A duplicate already got "Already in your library" from addLink.
      if (!saved.duplicate) toast.success('Saved — Keepmint is reading it')
    },
  })

  const left = usage ? Math.max(0, usage.limit - usage.used) : null
  const limitHit = Boolean(usage?.enabled) && left === 0
  const hint = !usage?.enabled
    ? 'Keepmint will save it. AI sorting is turned off for your account.'
    : limitHit
      ? 'It’ll be saved — AI sorting is paused until midnight.'
      : `Keepmint will read it, summarise it and file it for you.${left !== null ? ` ${left} AI sorts left today.` : ''}`

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="flex items-center gap-3 pr-10">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-yellow text-sticker-ink"
        >
          <LinkIcon className="size-5" strokeWidth={2.4} />
        </span>
        <DialogTitle className="pr-0 text-xl">Add link</DialogTitle>
      </div>
      <DialogDescription className="sr-only">
        Paste a link. Keepmint reads it, summarises it and files it into a collection.
      </DialogDescription>

      <form.Field name="url">
        {(field) => {
          const invalid = !field.state.meta.isValid
          const parsed = parseLinkInput(field.state.value)
          const type = parsed ? detectTypeFromHost(parsed) : null
          const display = LINK_TYPE_DISPLAY[type ?? 'article']
          return (
            <Field data-invalid={invalid} className="gap-3">
              <FieldLabel htmlFor="add-url" className="sr-only">
                Link to save
              </FieldLabel>
              <InputGroup className="h-14">
                <InputGroupInput
                  id="add-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  autoFocus
                  placeholder="Paste any link…"
                  className="text-[17px]"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={invalid}
                />
                <InputGroupAddon>
                  <LinkIcon aria-hidden />
                </InputGroupAddon>
              </InputGroup>
              {invalid && <FieldError errors={field.state.meta.errors} />}

              {parsed ? (
                <div className="flex items-center gap-3 rounded-[14px] border-2 border-border p-3">
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-12 w-16 shrink-0 items-center justify-center rounded-[10px] border-2 border-border text-sticker-ink',
                      display.bg,
                    )}
                  >
                    <display.icon className="size-5.5" strokeWidth={2} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <strong className="truncate">{parsed.hostname.replace(/^www\./, '')}</strong>
                    <span className="text-[13px] text-muted-foreground">
                      {type
                        ? `Looks like a ${display.label.toLowerCase()}`
                        : 'Keepmint will work out what it is'}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <SparklesIcon aria-hidden className="size-4 text-primary" />
                  <span>{hint}</span>
                  <button
                    type="button"
                    className="rounded-full border-2 border-border bg-card px-2.5 py-1 text-[13px] font-bold text-foreground hover:bg-muted"
                    onClick={() => {
                      const sample = SAMPLE_LINKS[Math.floor(Math.random() * SAMPLE_LINKS.length)]
                      if (sample) field.handleChange(sample.url)
                    }}
                  >
                    Try a sample link
                  </button>
                </div>
              )}
            </Field>
          )
        }}
      </form.Field>

      {limitHit && (
        <p className="flex items-start gap-2 rounded-xl border-2 border-border bg-pink px-3 py-2.5 text-sm font-semibold text-sticker-ink">
          <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2.6} />
          Today’s {usage?.limit} AI sorts are used. This link will still be saved, but won’t be
          summarised or sorted. It goes to Unsorted.
        </p>
      )}

      <form.Field name="readLater">
        {(field) => (
          <Field orientation="horizontal">
            <Checkbox
              id="add-read-later"
              aria-labelledby="add-read-later-label"
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
            <FieldLabel
              id="add-read-later-label"
              htmlFor="add-read-later"
              className="text-[15px] font-semibold"
            >
              Also add to Read later
            </FieldLabel>
          </Field>
        )}
      </form.Field>

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          Cancel
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(busy) => (
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? 'Saving…' : 'Save link'}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}
