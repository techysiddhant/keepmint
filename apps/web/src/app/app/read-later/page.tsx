import type { Metadata } from 'next'
import { ReadLaterView } from '@/components/read-later/read-later-view'

export const metadata: Metadata = { title: 'Read later' }

export default function ReadLaterPage() {
  return <ReadLaterView />
}
