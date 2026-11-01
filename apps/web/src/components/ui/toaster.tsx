'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            '!rounded-[14px] !border-2 !border-border !bg-ink !text-bg !font-sans !font-bold !shadow-hard',
          actionButton: '!bg-yellow !text-sticker-ink !font-bold',
        },
      }}
    />
  )
}
