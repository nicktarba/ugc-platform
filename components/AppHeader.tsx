'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AppHeader() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; user_metadata?: { role?: string } } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [menuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initial = user?.email?.[0]?.toUpperCase() || '?'
  const role = user?.user_metadata?.role
  const dashboardHref = role === 'author' ? '/dashboard/author' : role === 'admin' ? '/dashboard/admin' : '/dashboard/business'

  return (
    <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px clamp(16px, 5vw, 40px)', borderBottom:'1px solid #e8e6e1', background:'#fff', position:'sticky', top:0, zIndex:100 }}>
      <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>

      <div style={{ display:'flex', gap:'20px', alignItems:'center' }}>
        <Link href="/catalog" style={{ fontSize:'14px', color:'#5a5650', textDecoration:'none' }}>Каталог</Link>
        <Link href="/support" style={{ fontSize:'14px', color:'#5a5650', textDecoration:'none' }}>Поддержка</Link>

        {user ? (
          <div ref={menuRef} style={{ position:'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)} aria-label="Меню аккаунта" style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#f0ede6', border:'1px solid #e0ddd8', cursor:'pointer', fontFamily:'inherit', fontSize:'14px', fontWeight:700, color:'#1a1a1a' }}>{initial}</button>
            {menuOpen && (
              <div style={{ position:'absolute', top:'44px', right:0, background:'#fff', border:'1px solid #e8e6e1', borderRadius:'14px', boxShadow:'0 8px 24px rgba(0,0,0,0.10)', minWidth:'200px', padding:'8px', zIndex:300 }}>
                <div style={{ padding:'8px 12px', fontSize:'12px', color:'#9a9590', borderBottom:'1px solid #f0ede6', marginBottom:'4px', wordBreak:'break-all' }}>{user.email}</div>
                <Link href={dashboardHref} onClick={() => setMenuOpen(false)} style={{ display:'block', padding:'9px 12px', fontSize:'14px', color:'#1a1a1a', textDecoration:'none', borderRadius:'8px', fontWeight:600 }}>Личный кабинет</Link>
                <button onClick={handleLogout} style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 12px', fontSize:'14px', color:'#dc2626', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', borderRadius:'8px' }}>Выйти</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <Link href="/login" style={{ padding:'8px 16px', fontSize:'14px', color:'#1a1a1a', textDecoration:'none', fontWeight:500 }}>Войти</Link>
            <Link href="/register" style={{ padding:'8px 20px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:500 }}>Регистрация</Link>
          </div>
        )}
      </div>
    </nav>
  )
}
