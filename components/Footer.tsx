'use client'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <span>© {new Date().getFullYear()} СВОИ UGC</span>
        <div>
          <Link href="/ugc">Что такое UGC</Link>
          <Link href="/ugc-avtory">UGC-авторы</Link>
          <Link href="/ugc-dlya-biznesa">Для бизнеса</Link>
          <Link href="/o-servise">О сервисе</Link>
          <Link href="/support">Поддержка</Link>
        </div>
      </div>
    </footer>
  )
}
