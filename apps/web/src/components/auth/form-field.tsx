'use client'

import type { AnyFieldApi } from '@tanstack/react-form'
import { EyeIcon, EyeOffIcon, type LucideIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

type TextFieldProps = {
  field: AnyFieldApi
  label: string
  icon: LucideIcon
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  autoComplete?: string
  /** Right of the label, e.g. "Forgot password?". */
  aside?: ReactNode
  /** Share one show/hide toggle between several password fields. */
  revealed?: boolean
  onReveal?: () => void
  children?: ReactNode
}

export const fieldInvalid = (field: AnyFieldApi) => !field.state.meta.isValid

/** shadcn Field + InputGroup bound to a TanStack Form field: label, icon, input, error. */
export function TextField({
  field,
  label,
  icon: Icon,
  type = 'text',
  placeholder,
  autoComplete,
  aside,
  revealed,
  onReveal,
  children,
}: TextFieldProps) {
  const [ownReveal, setOwnReveal] = useState(false)
  const shown = revealed ?? ownReveal
  const toggle = onReveal ?? (() => setOwnReveal((v) => !v))
  const invalid = fieldInvalid(field)
  const isPassword = type === 'password'
  const id = `field-${field.name}`

  return (
    <Field data-invalid={invalid}>
      <div className="flex items-baseline justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {aside}
      </div>
      <InputGroup>
        <InputGroupInput
          id={id}
          name={field.name}
          type={isPassword ? (shown ? 'text' : 'password') : type}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={invalid}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <InputGroupAddon>
          <Icon aria-hidden />
        </InputGroupAddon>
        {isPassword && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-sm"
              onClick={toggle}
              aria-label={shown ? 'Hide password' : 'Show password'}
              aria-pressed={shown}
            >
              {shown ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      {invalid && <FieldError errors={field.state.meta.errors} />}
      {children}
    </Field>
  )
}
