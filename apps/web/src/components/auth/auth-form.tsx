'use client'

import { LEGAL_VERSION } from '@keepmint/core'
import { useForm } from '@tanstack/react-form'
import { LockIcon, MailIcon, UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authClient } from '@/lib/auth-client'
import { submitThenChange } from '@/lib/form'
import { loginSchema, signupSchema } from '@/lib/validation/auth'
import { AuthCard, AuthHeading, authErrorMessage, FormAlert, SubmitButton } from './auth-ui'
import { fieldInvalid, TextField } from './form-field'
import { PasswordStrength } from './password-strength'

type Mode = 'login' | 'signup'

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const textLink =
  'font-semibold underline decoration-2 underline-offset-[3px] hover:decoration-primary'

// Base UI's checkbox puts `id` on its hidden input, so the visible control is named via aria-labelledby.

/** Log in / sign up switch from the design. Tabs navigate, so each mode has its own URL. */
function ModeTabs({ mode }: { mode: Mode }) {
  const router = useRouter()
  return (
    <Tabs value={mode} onValueChange={(v) => router.push(v === 'login' ? '/login' : '/signup')}>
      <TabsList aria-label="Log in or sign up" className="w-full">
        <TabsTrigger value="login">Log in</TabsTrigger>
        <TabsTrigger value="signup">Sign up</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export function AuthForm({ mode, next = '/app' }: { mode: Mode; next?: string }) {
  return (
    <>
      <ModeTabs mode={mode} />
      {mode === 'login' ? <LoginForm next={next} /> : <SignupForm />}
    </>
  )
}

function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [formError, setFormError] = useState('')
  const form = useForm({
    defaultValues: { email: '', password: '', remember: true },
    validationLogic: submitThenChange,
    validators: { onDynamic: loginSchema },
    onSubmit: async ({ value }) => {
      setFormError('')
      const { error } = await authClient.signIn.email({
        email: value.email.trim(),
        password: value.password,
        rememberMe: value.remember,
        // An unverified user gets a fresh verification email on sign-in; its link lands here.
        callbackURL: '/verified',
      })
      if (error) return setFormError(authErrorMessage(error))
      // Keep "today" in the user's own time zone for the daily AI limit.
      void authClient.updateUser({ timezone: timezone() })
      router.replace(next)
      router.refresh()
    },
  })

  return (
    <AuthCard>
      <AuthHeading title="Welcome back">Log in to your library.</AuthHeading>
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
          <form.Field name="password">
            {(field) => (
              <TextField
                field={field}
                label="Password"
                icon={LockIcon}
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                aside={
                  <Link href="/forgot-password" className={`text-sm ${textLink}`}>
                    Forgot password?
                  </Link>
                }
              />
            )}
          </form.Field>
          <form.Field name="remember">
            {(field) => (
              <Field orientation="horizontal">
                <Checkbox
                  id="remember"
                  aria-labelledby="remember-label"
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
                <FieldLabel
                  id="remember-label"
                  htmlFor="remember"
                  className="text-[15px] font-medium"
                >
                  Keep me logged in on this device
                </FieldLabel>
              </Field>
            )}
          </form.Field>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(busy) => (
              <SubmitButton loading={busy}>{busy ? 'Logging in…' : 'Log in'}</SubmitButton>
            )}
          </form.Subscribe>
        </FieldGroup>
      </form>
      <p className="mt-[22px] text-center text-muted-foreground">
        New to Keepmint?{' '}
        <Link href="/signup" className={`font-bold text-foreground ${textLink}`}>
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}

function SignupForm() {
  const router = useRouter()
  const [formError, setFormError] = useState('')
  const form = useForm({
    defaultValues: { name: '', email: '', password: '', agree: false },
    validationLogic: submitThenChange,
    validators: { onDynamic: signupSchema },
    onSubmit: async ({ value }) => {
      setFormError('')
      const email = value.email.trim()
      const { error } = await authClient.signUp.email({
        name: value.name.trim(),
        email,
        password: value.password,
        timezone: timezone(),
        // Only reachable with the Terms box ticked (zod); the server records when.
        termsVersion: LEGAL_VERSION,
        callbackURL: '/verified',
      })
      if (error) return setFormError(authErrorMessage(error))
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    },
  })

  return (
    <AuthCard>
      <AuthHeading title="Create your Keepmint">
        The beta is open. It takes under a minute.
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
          <form.Field name="name">
            {(field) => (
              <TextField
                field={field}
                label="Name"
                icon={UserIcon}
                autoComplete="name"
                placeholder="What should we call you?"
              />
            )}
          </form.Field>
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
          <form.Field name="password">
            {(field) => (
              <TextField
                field={field}
                label="Password"
                icon={LockIcon}
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
              >
                <PasswordStrength password={field.state.value} />
              </TextField>
            )}
          </form.Field>
          <form.Field name="agree">
            {(field) => {
              const invalid = fieldInvalid(field)
              return (
                <Field orientation="horizontal" data-invalid={invalid} className="flex-wrap">
                  <Checkbox
                    id="agree"
                    aria-labelledby="agree-label"
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    aria-invalid={invalid}
                    className="mt-0.5 self-start"
                  />
                  <FieldLabel
                    id="agree-label"
                    htmlFor="agree"
                    className="block text-[15px] leading-normal font-medium"
                  >
                    I agree to the{' '}
                    <Link href="/terms" className={textLink}>
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className={textLink}>
                      Privacy Policy
                    </Link>
                  </FieldLabel>
                  {invalid && (
                    <FieldError className="basis-full" errors={field.state.meta.errors} />
                  )}
                </Field>
              )
            }}
          </form.Field>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(busy) => (
              <SubmitButton loading={busy}>
                {busy ? 'Creating account…' : 'Create account'}
              </SubmitButton>
            )}
          </form.Subscribe>
        </FieldGroup>
      </form>
      <p className="mt-[22px] text-center text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className={`font-bold text-foreground ${textLink}`}>
          Log in
        </Link>
      </p>
    </AuthCard>
  )
}
