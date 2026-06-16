'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Props = {
  role: 'business' | 'author' | 'admin' | null
  email: string | null
  badgeCount?: number
  authorId?: string | null
}

export default function Sidebar({ role, email, badgeCount = 0, authorId }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initial = email?.[0]?.toUpperCase() || '?'

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const navItem = (href: string, icon: string, label: string, badge?: number) => (
    <Link href={href} className={`sidebar-nav-item${isActive(href) ? ' active' : ''}`}>
      <span style={{ fontSize:'16px', width:'18px', textAlign:'center', flexShrink:0 }}>{icon}</span>
      <span style={{ flex:1 }}>{label}</span>
      {badge ? <span style={{ background:'#c17f3e', color:'#fff', fontSize:'10px', fontWeight:700, padding:'1px 6px', borderRadius:'100px', minWidth:'18px', textAlign:'center' }}>{badge}</span> : null}
    </Link>
  )

  const businessNav = () => (<>
    {navItem('/dashboard/business', '💬', 'Сделки', badgeCount || undefined)}
    {navItem('/catalog', '🔍', 'Каталог')}
    {navItem('/dashboard/business/favorites', '⭐️', 'Избранное')}
    {navItem('/dashboard/business/profile', '🏢', 'Профиль компании')}
  </>)

  const authorNav = () => (<>
    {navItem('/dashboard/author', '💬', 'Запросы', badgeCount || undefined)}
    {navItem('/catalog', '🔍', 'Каталог')}
    {navItem('/dashboard/author/profile', '👤', 'Профиль')}
  </>)

  const adminNav = () => (<>
    {navItem('/dashboard/admin', '🛡', 'Модерация')}
    {navItem('/catalog', '🔍', 'Каталог')}
  </>)

  return (
    <aside className="sidebar">
      <div style={{ padding:'20px 16px 16px' }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'20px', fontWeight:700, color:'#1a1a1a', textDecoration:'none', display:'block', marginBottom:'24px' }}>ugcmarket</Link>

        {role && (
          <div style={{ marginBottom:'8px' }}>
            <div style={{ fontSize:'11px', color:'#9a9590', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', padding:'0 12px', marginBottom:'6px' }}>
              {role === 'business' ? 'Бизнес' : role === 'author' ? 'Автор' : 'Админ'}
            </div>
            <nav style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
              {role === 'business' && businessNav()}
              {role === 'author' && authorNav()}
              {role === 'admin' && adminNav()}
            </nav>
          </div>
        )}
      </div>

      <div style={{ marginTop:'auto', padding:'16px', borderTop:'1px solid #e8e6e1' }}>
        <Link href="/support" className="sidebar-nav-item" style={{ marginBottom:'4px' }}>
          <span style={{ fontSize:'16px', width:'18px', textAlign:'center', flexShrink:0 }}>❓</span>
          <span>Поддержка</span>
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#f0ede6', border:'1px solid #e0ddd8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'#1a1a1a', flexShrink:0 }}>{initial}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'12px', color:'#1a1a1a', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email}</div>
            <button onClick={handleLogout} style={{ fontSize:'11px', color:'#9a9590', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', padding:0, textAlign:'left' }}>Выйти</button>
          </div>
        </div>
      </div>
    </aside>
  )
}
