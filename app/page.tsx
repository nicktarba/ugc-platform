import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'СВОИ UGC — найти UGC-автора для бизнеса',
  description: SITE_DESCRIPTION,
  alternates: { canonical: absoluteUrl('/') },
  openGraph: {
    title: 'СВОИ UGC — найти UGC-автора для бизнеса',
    description: SITE_DESCRIPTION,
    url: absoluteUrl('/'),
    siteName: SITE_NAME,
    locale: 'ru_RU',
    type: 'website',
  },
}

export default function HomePage() {
  return <HomeClient />
}
