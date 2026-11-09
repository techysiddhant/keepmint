'use client'

import { COLLECTION_COLORS, type CollectionColor, type SyncCollection } from '@keepmint/core'
import { useForm } from '@tanstack/react-form'
import { FolderIcon } from 'lucide-react'
import { z } from 'zod'
import { useLibraryActions } from '@/components/library/library-actions'
import { COLLECTION_BG } from '@/components/library/link-display'
import { useLibrary } from '@/components/library/use-library'
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
import { Input } from '@/components/ui/input'
import { submitThenChange } from '@/lib/form'
import { cn } from '@/lib/utils'

const COLOR_NAMES: Record<CollectionColor, string> = {
  violet: 'Violet',
  pink: 'Pink',
  yellow: 'Yellow',
  mint: 'Mint',
  sky: 'Sky',
  lilac: 'Lilac',
}

/**
 * New / edit collection. `collection` set = edit (no "Let AI fill it"). Resolves to the
 * collection's id through `onSaved`.
 */
export function CollectionDialog({
  open,
  onOpenChange,
  collection,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  collection?: SyncCollection
  onSaved?: (id: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-120">
        {open && (
          <CollectionForm
            collection={collection}
            onDone={(id) => {
              onOpenChange(false)
              if (id) onSaved?.(id)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CollectionForm({
  collection,
  onDone,
}: {
  collection?: SyncCollection
  onDone: (id: string | null) => void
}) {
  const { collections, usage } = useLibrary()
  const actions = useLibraryActions()
  const taken = new Set(
    Object.values(collections)
      .filter((c) => c.id !== collection?.id)
      .map((c) => c.name.trim().toLowerCase()),
  )
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, { message: 'Give it a name.', abort: true })
      .max(60, { message: 'Keep it under 60 characters.', abort: true })
      .refine((n) => !taken.has(n.toLowerCase()), 'You already have a collection with that name.'),
    color: z.enum(COLLECTION_COLORS),
    description: z.string().max(300, 'Keep it under 300 characters.'),
    aiFill: z.boolean(),
  })

  const form = useForm({
    defaultValues: {
      name: collection?.name ?? '',
      color: (collection?.color ?? 'violet') as CollectionColor,
      description: collection?.description ?? '',
      aiFill: !collection,
    },
    validationLogic: submitThenChange,
    validators: { onDynamic: schema },
    onSubmit: async ({ value }) => {
      const description = value.description.trim() || null
      if (collection) {
        const ok = await actions.updateCollection(collection.id, {
          name: value.name.trim(),
          color: value.color,
          description,
        })
        if (ok) onDone(collection.id)
      } else {
        const id = await actions.createCollection({
          name: value.name.trim(),
          color: value.color,
          description,
          aiFill: value.aiFill,
        })
        if (id) onDone(id)
      }
      // A failed save has shown its toast; the form stays open so nothing typed is lost.
    },
  })

  const aiOff = usage !== null && (!usage.enabled || usage.used >= usage.limit)

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Subscribe selector={(s) => s.values.color}>
        {(color) => (
          <div className="flex items-center gap-3 pr-10">
            <span
              aria-hidden
              className={cn(
                'flex size-10 items-center justify-center rounded-xl border-2 border-border',
                COLLECTION_BG[color],
              )}
            >
              <FolderIcon className="size-5" strokeWidth={2.2} />
            </span>
            <DialogTitle className="pr-0 text-xl">
              {collection ? 'Edit collection' : 'New collection'}
            </DialogTitle>
          </div>
        )}
      </form.Subscribe>
      <DialogDescription className="sr-only">
        Name, colour and an optional description for the collection.
      </DialogDescription>

      <form.Field name="name">
        {(field) => (
          <Field data-invalid={!field.state.meta.isValid}>
            <FieldLabel htmlFor="col-name">Name</FieldLabel>
            <Input
              id="col-name"
              autoComplete="off"
              maxLength={60}
              placeholder="e.g. Weekend reads"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={!field.state.meta.isValid}
            />
            {!field.state.meta.isValid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        )}
      </form.Field>

      <form.Field name="color">
        {(field) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-bold">Colour</legend>
            <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2.5">
              {COLLECTION_COLORS.map((c) => (
                // biome-ignore lint/a11y/useSemanticElements: a swatch button is the design's radio
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={field.state.value === c}
                  aria-label={COLOR_NAMES[c]}
                  onClick={() => field.handleChange(c)}
                  className={cn(
                    'size-9 rounded-full border-2 border-sticker-ink',
                    COLLECTION_BG[c],
                    field.state.value === c && 'outline-3 outline-offset-2 outline-foreground',
                  )}
                />
              ))}
            </div>
          </fieldset>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <Field data-invalid={!field.state.meta.isValid}>
            <FieldLabel htmlFor="col-desc">
              Description <span className="font-medium text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Input
              id="col-desc"
              autoComplete="off"
              maxLength={300}
              placeholder="What goes in here?"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {!field.state.meta.isValid && <FieldError errors={field.state.meta.errors} />}
          </Field>
        )}
      </form.Field>

      {!collection && (
        <form.Field name="aiFill">
          {(field) => (
            <Field
              orientation="horizontal"
              className="items-start rounded-xl border-2 border-dashed border-line p-3"
            >
              <Checkbox
                id="col-ai"
                aria-labelledby="col-ai-label"
                checked={field.state.value}
                onCheckedChange={(checked) => field.handleChange(checked)}
                className="mt-0.5"
              />
              <FieldLabel id="col-ai-label" htmlFor="col-ai" className="flex-col items-start gap-0">
                <strong className="text-[15px]">✦ Let AI fill it</strong>
                <span className="text-[13px] font-normal text-muted-foreground">
                  {aiOff
                    ? 'AI is off or used up today: Keepmint will match Unsorted links by name only.'
                    : 'Writes a description (1 AI sort) and moves matching Unsorted links in.'}
                </span>
              </FieldLabel>
            </Field>
          )}
        </form.Field>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={() => onDone(null)}>
          Cancel
        </Button>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(busy) => (
            <Button type="submit" size="lg" disabled={busy}>
              {collection ? 'Save' : 'Create collection'}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}
