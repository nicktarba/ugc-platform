import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Регистрация — СВОИ UGC',
  robots: { index: false, follow: false },
  description: 'Создайте аккаунт автора или бизнеса на платформе СВОИ UGC.',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
