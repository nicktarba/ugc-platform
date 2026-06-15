import type { Metadata } from 'next'
import './globals.css'
import ToastProvider from '@/components/Toast'
export const metadata: Metadata = {
  title: 'ugcmarket — живые авторы для бизнеса',
  description: 'Площадка микро-авторов и UGC-блогеров',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:ital,wght@0,700;1,700&display=swap" rel="stylesheet" />
      </head>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  )
}
