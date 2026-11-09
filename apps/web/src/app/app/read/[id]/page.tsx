import { isUuid } from '@keepmint/core'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Reader } from '@/components/read-later/reader'

export const metadata: Metadata = { title: 'Reader' }

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  return <Reader id={id} />
}
