'use client'
import Link from 'next/link'

type Tab = { key: string; href: string; label: string; icon: string; badge?: number }

export default function BottomNav({ role, active, unread = 0 }: { role: 'business' | 'author'; active: string; unread?: number }) {
  const tabs: Tab[] = role === 'business'
    ? [
        { key: 'catalog', href: '/catalog', label: 'Каталог', icon: '🔍' },
        { key: 'requests', href: '/dashboard/business', label: 'Запросы', icon: '💬', badge: unread },
        { key: 'favorites', href: '/dashboard/business/favorites', label: 'Избранное', icon: '⭐️' },
        { key: 'support', href: '/support', label: 'Поддержка', icon: '🛟' },
      ]
    : [
        { key: 'requests', href: '/dashboard/author', label: 'Запросы', icon: '💬', badge: unread },
        { key: 'support', href: '/support', label: 'Поддержка', icon: '🛟' },
      ]

  return (
    <>
      <div className="bottom-tab-spacer" />
      <nav className="bottom-tab-bar">
        {tabs.map(t => {
          const isActive = active === t.key
          return (
            <Link key={t.key} href={t.href} className="bottom-tab-item" style={{ color: isActive ? '#1a1a1a' : '#9a9590' }}>
              <span style={{ position: 'relative', fontSize: '20px', lineHeight: 1 }}>
                {t.icon}
                {!!t.badge && t.badge > 0 && <span className="bottom-tab-badge">{t.badge > 9 ? '9+' : t.badge}</span>}
              </span>
              <span style={{ fontSize: '11px', fontWeight: isActive ? 700 : 500 }}>{t.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
