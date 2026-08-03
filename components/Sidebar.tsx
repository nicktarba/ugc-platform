'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UiIcon from './UiIcon'

type Props = {
  role: 'business' | 'author' | 'admin' | null
  email: string | null
  userId: string | null
  badgeCount?: number
  authorId?: string | null
}

type IconName = Parameters<typeof UiIcon>[0]['name']

type NavItem = { href: string; icon: IconName; label: string; badge?: number }

export default function Sidebar({ role, email, userId, badgeCount = 0 }: Props) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const initial = email?.[0]?.toUpperCase() || '?'

  const isActive = (href: string) => {
    if (href === '/dashboard/business' && (pathname.startsWith('/dashboard/chat/') || pathname.startsWith('/dashboard/request/'))) return true
    if (href === '/dashboard/author/deals' && (pathname.startsWith('/dashboard/chat/') || pathname.startsWith('/dashboard/request/'))) return true
    if (href === '/dashboard/author') return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const items: NavItem[] = role === 'business'
    ? [
        { href: '/dashboard/business', icon: 'message', label: 'Сделки', badge: badgeCount },
        { href: '/catalog', icon: 'search', label: 'Каталог авторов' },
        { href: '/dashboard/business/favorites', icon: 'heart', label: 'Избранное' },
        { href: '/dashboard/business/profile', icon: 'building', label: 'Профиль компании' },
      ]
    : role === 'author'
      ? [
          { href: '/dashboard/author', icon: 'home', label: 'Главная' },
          { href: '/dashboard/author/deals', icon: 'message', label: 'Сделки', badge: badgeCount },
          { href: '/catalog', icon: 'search', label: 'Каталог авторов' },
          { href: '/dashboard/author/profile', icon: 'user', label: 'Мой профиль' },
        ]
      : [
          { href: '/dashboard/admin', icon: 'shield', label: 'Модерация' },
          { href: '/catalog', icon: 'search', label: 'Каталог авторов' },
        ]

  const roleLabel = role === 'business' ? 'Кабинет бизнеса' : role === 'author' ? 'Кабинет автора' : 'Администрирование'

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Link href="/" className="sidebar-brand" aria-label="СВОИ UGC">
          СВОИ <span>UGC</span>
        </Link>
        {role && <div className="sidebar-role">{roleLabel}</div>}
        <nav className="sidebar-nav" aria-label="Основная навигация">
          {items.map(item => (
            <Link key={item.href} href={item.href} className={`sidebar-nav-item${isActive(item.href) ? ' active' : ''}`}>
              <UiIcon name={item.icon} width={19} height={19} />
              <span className="sidebar-nav-label">{item.label}</span>
              {!!item.badge && item.badge > 0 && <span className="sidebar-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
            </Link>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <Link href="/dashboard/notifications" className={`sidebar-nav-item${pathname.startsWith('/dashboard/notifications') ? ' active' : ''}`}>
          <UiIcon name="bell" width={19} height={19} />
          <span className="sidebar-nav-label">Уведомления</span>
        </Link>
        <Link href="/support" className={`sidebar-nav-item${pathname.startsWith('/support') ? ' active' : ''}`}>
          <UiIcon name="help" width={19} height={19} />
          <span className="sidebar-nav-label">Поддержка</span>
        </Link>

        {userId && (
          <div className="sidebar-account">
            <div className="sidebar-avatar">{initial}</div>
            <div className="sidebar-account-copy">
              <span title={email || ''}>{email}</span>
              <button type="button" onClick={handleLogout}>Выйти</button>
            </div>
            <button type="button" className="sidebar-logout" onClick={handleLogout} aria-label="Выйти">
              <UiIcon name="logout" width={18} height={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
