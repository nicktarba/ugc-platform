import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Новый пароль — СВОИ UGC',
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
