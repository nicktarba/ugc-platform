import type { Metadata } from 'next'
import { Suspense } from 'react'
export const metadata: Metadata = {
  title: 'Каталог авторов — ugcmarket',
  description: 'Найди микро-автора по городу, нише и стилю жизни. Каталог UGC-блогеров для рекламы и коллабораций.',
  openGraph: {
    title: 'Каталог авторов — ugcmarket',
    description: 'Найди микро-автора по городу, нише и стилю жизни.',
  },
}
export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>
}

