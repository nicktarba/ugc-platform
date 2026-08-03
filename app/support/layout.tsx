import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Поддержка — СВОИ UGC',
  description: 'Помощь по аккаунтам, поиску авторов, предложениям и сделкам на платформе СВОИ UGC.',
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
