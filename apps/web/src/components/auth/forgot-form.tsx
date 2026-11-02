'use client'

import { useForm } from '@tanstack/react-form'
import { ArrowLeftIcon, MailCheckIcon, MailIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { authClient } from '@/lib/auth-client'
import { submitThenChange } from '@/lib/form'
import { cn } from '@/lib/utils'
import { emailOnlySchema } from '@/lib/validation/auth'
import {
  AuthCard,
  AuthHeading,
  authErrorMessage,
  FormAlert,
  mailAppUrl,
  SubmitButton,
} from './auth-ui'
import { TextField } from './form-field'

export function BackToLogin() {
  return (
    <Link
      href="/login"
      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'self-start pl-1')}
    >
      <ArrowLeftIcon aria-hidden />
      Back to log in
    </Link>
  )
}

const requestReset = (email: string) =>
  authClient.requestPasswordReset({ email, redirectTo: '/reset-password' })

export function ForgotForm() {
  const [sentTo, setSentTo] = useState('')
  const [resending, setResending] = useState(false)
  const [formError, setFormError] = useState('')
  const form = useForm({
    defaultValues: { email: '' },
    validationLogic: submitThenChange,
    validators: { onDynamic: emailOnlySchema },
    onSubmit: async ({ value }) => {
      setFormError('')
      const email = value.email.trim()
      const { error } = await requestReset(email)
      if (error) return setFormError(authErrorMessage(error))
      setSentTo(email)
    },
  })

  async function resend() {
    setResending(true)
    await requestReset(sentTo)
    setResending(false)
  }

  if (sentTo) {
    const inbox = mailAppUrl(sentTo)
    return (
      <>
        <BackToLogin />
        <div
          role="status"
          className="flex animate-pop flex-col gap-4 rounded-3xl border-2 border-border bg-yellow p-6 text-sticker-ink shadow-pop tablet:p-8"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl border-2 border-sticker-ink bg-white">
            <MailCheckIcon className="size-6" aria-hidden />
          </span>
          <h1 className="font-display text-[clamp(26px,3vw,32px)] leading-[1.1] font-extrabold tracking-[-0.03em]">
            Reset link sent
          </h1>
          <p>
            If an account exists for <strong>{sentTo}</strong>, a password reset link is on its way.
            It expires in 30 minutes.
          </p>
          <div className="mt-1 flex flex-wrap gap-2.5 [--shadow:#111]">
            {inbox && (
              <a
                href={inbox}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: 'secondary' })}
              >
                Open my email
              </a>
            )}
            <Button
              variant="link"
              onClick={resend}
              disabled={resending}
              className="text-sticker-ink"
            >
              {resending ? 'Sending…' : 'Send it again'}
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <BackToLogin />
      <AuthCard>
        <AuthHeading title="Reset your password">
          Enter your email and we’ll send you a reset link.
        </AuthHeading>
        {formError && <FormAlert>{formError}</FormAlert>}
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
                <SubmitButton loading={busy}>{busy ? 'Sending…' : 'Send reset link'}</SubmitButton>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </AuthCard>
    </>
  )
}
