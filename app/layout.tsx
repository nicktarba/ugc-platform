import type { Metadata } from 'next'
import './globals.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/manrope/800.css'
import '@fontsource/fraunces/700.css'
import '@fontsource/fraunces/700-italic.css'
import '@fontsource/great-vibes/400.css'
import ToastProvider from '@/components/Toast'
import JsonLd from '@/components/seo/JsonLd'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo'

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
const yandexVerification = process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'СВОИ UGC — найти UGC-автора для бизнеса',
    template: '%s',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: 'business',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: 'СВОИ UGC — найти UGC-автора для бизнеса',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'СВОИ UGC — найти UGC-автора для бизнеса',
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: googleVerification || undefined,
    yandex: yandexVerification || undefined,
    other: bingVerification ? { 'msvalidate.01': bingVerification } : undefined,
  },
}

const rootStructuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: 'SVOI UGC',
    description: SITE_DESCRIPTION,
    inLanguage: 'ru-RU',
    publisher: { '@id': `${SITE_URL}/#organization` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: 'SVOI UGC',
    url: SITE_URL,
    email: 'support@svoi-ugc.ru',
    description: 'Платформа для поиска UGC-авторов и сотрудничества бизнеса с создателями UGC-контента.',
  },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <JsonLd data={rootStructuredData} />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
