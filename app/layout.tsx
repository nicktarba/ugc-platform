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
export const metadata: Metadata = {
  title: 'СВОИ UGC — авторы для вашего бизнеса',
  description: 'Маркетплейс локальных UGC-авторов. Поиск по городу, тематике и аудитории, предложения, чат и сделки в одном месте.',
  openGraph: {
    title: 'СВОИ UGC — авторы для вашего бизнеса',
    description: 'Маркетплейс локальных UGC-авторов. Поиск по городу, тематике и аудитории, предложения, чат и сделки в одном месте.',
    siteName: 'СВОИ UGC',
    locale: 'ru_RU',
    type: 'website',
  },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  )
}
