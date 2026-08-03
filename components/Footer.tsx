'use client'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <span>© {new Date().getFullYear()} СВОИ UGC</span>
        <div>
          <Link href="/catalog">Каталог</Link>
          <Link href="/support">Поддержка</Link>
        </div>
      </div>
    </footer>
  )
}
