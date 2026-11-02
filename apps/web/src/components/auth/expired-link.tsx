'use client'

import { useForm } from '@tanstack/react-form'
import { MailIcon, UnlinkIcon } from 'lucide-react'
import { useState } from 'react'
import { FieldGroup } from '@/components/ui/field'
import { authClient } from '@/lib/auth-client'
import { submitThenChange } from '@/lib/form'
import { emailOnlySchema } from '@/lib/validation/auth'
import { AuthCard, AuthHeading, SubmitButton } from './auth-ui'
import { BackToLogin } from './forgot-form'
import { TextField } from './form-field'

const KINDS = {
  reset: {
    text: 'That password reset link is too old or was already used. Send yourself a fresh one.',
    sentText:
      'Open the newest email from Keepmint to choose a new password. Older links won’t work any more.',
    life: '30 minutes',
    note: 'Links expire after 30 minutes and work only once, to keep your account safe.',
  },
  verify: {
    text: 'That verification link is too old or was already used. Send yourself a fresh one.',
    sentText:
      'Open the newest email from Keepmint to verify your address. Older links won’t work any more.',
    life: '24 hours',
    note: 'Verification links expire after 24 hours and work only once.',
  },
}

/** "This link has expired" screen for both reset and verification links. */
export function ExpiredLink({ kind }: { kind: 'reset' | 'verify' }) {
  const k = KINDS[kind]
  const [sentTo, setSentTo] = useState('')
  const form = useForm({
    defaultValues: { email: '' },
    validationLogic: submitThenChange,
    validators: { onDynamic: emailOnlySchema },
    onSubmit: async ({ value }) => {
      const email = value.email.trim()
      if (kind === 'reset')
        await authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })
      else await authClient.sendVerificationEmail({ email, callbackURL: '/verified' })
      // Same answer whether or not the account exists, so emails can't be probed.
      setSentTo(email)
    },
  })

  return (
    <>
      <BackToLogin />
      <AuthCard className="flex flex-col gap-4">
        <span
          aria-hidden
          className="flex size-16 items-center justify-center self-start rounded-[18px] border-2 border-border bg-pink text-sticker-ink"
        >
          <UnlinkIcon className="size-7" />
        </span>
        <AuthHeading title={sentTo ? 'Check your inbox' : 'This link has expired'}>
          {sentTo ? k.sentText : k.text}
        </AuthHeading>
        {sentTo ? (
          <div
            role="status"
            className="animate-drop rounded-xl border-2 border-border bg-mint px-3.5 py-3 font-semibold text-sticker-ink"
          >
            ✓ New link sent to {sentTo}. It works for {k.life}.
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              void form.handleSubmit()
            }}
          >
            <FieldGroup className="gap-[18px]">
              <form.Field name="email">
                {(field) => (
                  <TextField
                    field={field}
                    label="Email"
                    icon={MailIcon}
                    type="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                  />
                )}
              </form.Field>
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(busy) => (
                  <SubmitButton loading={busy}>
                    {busy ? 'Sending…' : 'Send a new link'}
                  </SubmitButton>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>
        )}
        <p className="text-sm text-muted-foreground">{k.note}</p>
      </AuthCard>
    </>
  )
}
