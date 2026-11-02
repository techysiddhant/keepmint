import { z } from 'zod'

// Copy comes from the auth design. Validation runs on submit, then live as the user fixes things.
// `abort: true` on the "required" checks means an empty field shows one message, not two.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const emailField = z
  .string()
  .trim()
  .min(1, { message: 'Enter your email address.', abort: true })
  .regex(EMAIL, 'That email doesn’t look right. Try name@example.com.')

const newPassword = (empty: string) =>
  z
    .string()
    .min(1, { message: empty, abort: true })
    .min(8, 'Use at least 8 characters.')
    .max(128, 'Use 128 characters or fewer.')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean(),
})

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Enter your name.', abort: true })
    .min(2, 'Please enter at least 2 characters.')
    .max(60),
  email: emailField,
  password: newPassword('Create a password.'),
  agree: z.boolean().refine((v) => v, 'Please accept the Terms to continue.'),
})

export const emailOnlySchema = z.object({ email: emailField })

export const resetPasswordSchema = z
  .object({
    password: newPassword('Enter a new password.'),
    confirm: z.string().min(1, 'Type the password again.'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'These don’t match yet.' })

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
