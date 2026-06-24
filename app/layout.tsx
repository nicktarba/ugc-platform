import type { Metadata } from 'next'
import './globals.css'
import ToastProvider from '@/components/Toast'
export const metadata: Metadata = {
  title: 'ugcmarket — живые авторы для бизнеса',
  description: 'Маркетплейс микро-авторов и UGC-блогеров. Найди автора с живой аудиторией для рекламы и коллабораций.',
  openGraph: {
    title: 'ugcmarket — живые авторы для бизнеса',
    description: 'Маркетплейс микро-авторов и UGC-блогеров. Найди автора с живой аудиторией для рекламы и коллабораций.',
    siteName: 'ugcmarket',
    locale: 'ru_RU',
    type: 'website',
  },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,700;1,700&family=Manrope:wght@400;500;600;700;800&family=Great+Vibes&display=swap" rel="stylesheet" />
      </head>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  )
}

