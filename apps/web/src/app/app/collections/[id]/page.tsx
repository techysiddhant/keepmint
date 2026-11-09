import { isUuid } from '@keepmint/core'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CollectionView } from '@/components/collections/collection-view'

export const metadata: Metadata = { title: 'Collection' }

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  return <CollectionView id={id} />
}
