import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Вход — СВОИ UGC',
  robots: { index: false, follow: false },
  description: 'Вход в личный кабинет автора или бизнеса на платформе СВОИ UGC.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
