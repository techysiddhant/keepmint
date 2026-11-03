'use client'

import { useForm } from '@tanstack/react-form'
import { ArrowRightIcon, CheckIcon, KeyRoundIcon, LockIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { authClient } from '@/lib/auth-client'
import { submitThenChange } from '@/lib/form'
import { cn } from '@/lib/utils'
import { resetPasswordSchema } from '@/lib/validation/auth'
import {
  AuthCard,
  AuthHeading,
  authErrorMessage,
  FormAlert,
  SubmitButton,
  SuccessCard,
} from './auth-ui'
import { ExpiredLink } from './expired-link'
import { TextField } from './form-field'
import { PasswordStrength } from './password-strength'

export function ResetForm({ token }: { token: string }) {
  const [reveal, setReveal] = useState(false)
  const [state, setState] = useState<'form' | 'done' | 'expired'>('form')
  const [formError, setFormError] = useState('')
  const form = useForm({
    defaultValues: { password: '', confirm: '' },
    validationLogic: submitThenChange,
    validators: { onDynamic: resetPasswordSchema },
    onSubmit: async ({ value }) => {
      setFormError('')
      const { error } = await authClient.resetPassword({ newPassword: value.password, token })
      if (!error) return setState('done')
      if (error.code === 'INVALID_TOKEN' || error.status === 400) return setState('expired')
      setFormError(authErrorMessage(error))
    },
  })

  if (state === 'expired') return <ExpiredLink kind="reset" />
  if (state === 'done') {
    return (
      <SuccessCard icon={<CheckIcon className="size-7" aria-hidden />} title="Password updated">
        <p>For your safety we’ve logged you out on every device. Log in with your new password.</p>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'lg' }),
            'mt-1 self-start [--shadow:#111]',
          )}
        >
          Log in <ArrowRightIcon aria-hidden />
        </Link>
      </SuccessCard>
    )
  }

  const toggleReveal = () => setReveal((r) => !r)
  return (
    <AuthCard>
      <span
        aria-hidden
        className="mb-2.5 flex size-14 items-center justify-center rounded-2xl border-2 border-border bg-lilac text-sticker-ink"
      >
        <KeyRoundIcon className="size-6" />
      </span>
      <AuthHeading title="Choose a new password">Pick one you don’t use anywhere else.</AuthHeading>
      {formError && <FormAlert>{formError}</FormAlert>}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FieldGroup className="gap-4.5">
          <form.Field name="password">
            {(field) => (
              <TextField
                field={field}
                label="New password"
                icon={LockIcon}
                type="password"
                revealed={reveal}
                onReveal={toggleReveal}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              >
                <PasswordStrength password={field.state.value} />
              </TextField>
            )}
          </form.Field>
          <form.Field name="confirm">
            {(field) => (
              <TextField
                field={field}
                label="Type it again"
                icon={LockIcon}
                type="password"
                revealed={reveal}
                onReveal={toggleReveal}
                autoComplete="new-password"
                placeholder="Same password"
              >
                {field.state.value &&
                  field.state.value === field.form.state.values.password &&
                  field.state.value.length >= 8 && (
                    <span className="animate-drop text-sm font-semibold text-up-ink">
                      ✓ Passwords match
                    </span>
                  )}
              </TextField>
            )}
          </form.Field>
          <p className="text-sm text-muted-foreground">
            Saving logs you out on all your devices, including this one.
          </p>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(busy) => (
              <SubmitButton loading={busy}>{busy ? 'Saving…' : 'Save new password'}</SubmitButton>
            )}
          </form.Subscribe>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
