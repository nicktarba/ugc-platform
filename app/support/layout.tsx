import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Поддержка — СВОИ UGC',
  alternates: { canonical: 'https://svoi-ugc.ru/support' },
  description: 'Помощь по аккаунтам, поиску авторов, предложениям и сделкам на платформе СВОИ UGC.',
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
