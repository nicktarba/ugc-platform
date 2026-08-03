'use client'
import Link from 'next/link'
import UiIcon from './UiIcon'

type IconName = Parameters<typeof UiIcon>[0]['name']
type Tab = { key: string; href: string; label: string; icon: IconName; badge?: number }

export default function BottomNav({ role, active, unread = 0, notifCount = 0 }: { role: 'business' | 'author'; active: string; unread?: number; notifCount?: number }) {
  const tabs: Tab[] = role === 'business'
    ? [
        { key: 'catalog', href: '/catalog', label: 'Каталог', icon: 'search' },
        { key: 'favorites', href: '/dashboard/business/favorites', label: 'Избранное', icon: 'heart' },
        { key: 'requests', href: '/dashboard/business', label: 'Сделки', icon: 'message', badge: unread },
        { key: 'notifications', href: '/dashboard/notifications', label: 'Уведомления', icon: 'bell', badge: notifCount },
        { key: 'profile', href: '/dashboard/business/profile', label: 'Профиль', icon: 'user' },
      ]
    : [
        { key: 'home', href: '/dashboard/author', label: 'Главная', icon: 'home' },
        { key: 'deals', href: '/dashboard/author/deals', label: 'Сделки', icon: 'message', badge: unread },
        { key: 'catalog', href: '/catalog', label: 'Каталог', icon: 'search' },
        { key: 'notifications', href: '/dashboard/notifications', label: 'Уведомления', icon: 'bell', badge: notifCount },
        { key: 'profile', href: '/dashboard/author/profile', label: 'Профиль', icon: 'user' },
      ]

  return (
    <>
      <div className="bottom-tab-spacer" />
      <nav className="bottom-tab-bar" aria-label="Мобильная навигация">
        {tabs.map(tab => {
          const isActive = active === tab.key
          return (
            <Link key={tab.key} href={tab.href} className={`bottom-tab-item${isActive ? ' active' : ''}`}>
              <span className="bottom-tab-icon">
                <UiIcon name={tab.icon} width={21} height={21} />
                {!!tab.badge && tab.badge > 0 && <span className="bottom-tab-badge">{tab.badge > 9 ? '9+' : tab.badge}</span>}
              </span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
