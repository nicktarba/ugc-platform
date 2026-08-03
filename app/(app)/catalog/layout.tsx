import type { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Каталог авторов — СВОИ UGC',
  description: 'Найдите UGC-автора по городу, тематике и аудитории для рекламы и коллабораций.',
  openGraph: {
    title: 'Каталог авторов — СВОИ UGC',
    description: 'Поиск локальных UGC-авторов для вашего бизнеса.',
  },
}

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>
}
