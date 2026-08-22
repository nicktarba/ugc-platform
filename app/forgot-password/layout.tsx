import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Восстановление пароля — СВОИ UGC',
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
