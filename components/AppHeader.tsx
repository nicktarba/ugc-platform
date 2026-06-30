'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AppHeader() {
  const [user, setUser] = useState<{ id?: string; email?: string } | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user?.id) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
        setRole(profile?.role || data.user?.user_metadata?.role || null)
      }
    })
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

  const initial = user?.email?.[0]?.toUpperCase() || '?'
  const dashboardHref = role === 'author' ? '/dashboard/author' : role === 'admin' ? '/dashboard/admin' : '/dashboard/business'

  return (
    <>
      <style>{`
        .ah-nav-links { display:contents; }
        .ah-auth-buttons { display:flex; gap:8px; align-items:center; }
        .ah-burger { display:none; width:36px; height:36px; border:1px solid #e0ddd8; border-radius:10px; background:#fff; cursor:pointer; font-size:18px; align-items:center; justify-content:center; font-family:inherit; }
        @media (max-width: 768px) {
          .ah-nav-links { display:none !important; }
          .ah-auth-buttons { display:none !important; }
          .ah-burger { display:flex; }
        }
      `}</style>
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px clamp(16px, 5vw, 40px)', borderBottom:'1px solid #e8e6e1', background:'#fff', position:'sticky', top:0, zIndex:100 }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>

        <div style={{ display:'flex', gap:'20px', alignItems:'center' }}>
          <span className="ah-nav-links">
            <Link href="/catalog" style={{ fontSize:'14px', color:'#5a5650', textDecoration:'none' }}>Каталог</Link>
            <Link href="/support" style={{ fontSize:'14px', color:'#5a5650', textDecoration:'none' }}>Поддержка</Link>
          </span>

          {user ? (
            <div ref={menuRef} style={{ position:'relative' }}>
              <button onClick={() => setMenuOpen(o => !o)} style={{ width:'36px', height:'36px', borderRadius:'50%', background:'#f0ede6', border:'1px solid #e0ddd8', cursor:'pointer', fontFamily:'inherit', fontSize:'14px', fontWeight:700, color:'#1a1a1a' }}>{initial}</button>
              {menuOpen && (
                <div style={{ position:'absolute', top:'44px', right:0, background:'#fff', border:'1px solid #e8e6e1', borderRadius:'14px', boxShadow:'0 8px 24px rgba(0,0,0,0.10)', minWidth:'200px', padding:'8px', zIndex:300 }}>
                  <div style={{ padding:'8px 12px', fontSize:'12px', color:'#9a9590', borderBottom:'1px solid #f0ede6', marginBottom:'4px', wordBreak:'break-all' }}>{user.email}</div>
                  <Link href={dashboardHref} onClick={() => setMenuOpen(false)} style={{ display:'block', padding:'9px 12px', fontSize:'14px', color:'#1a1a1a', textDecoration:'none', borderRadius:'8px', fontWeight:600 }}>Личный кабинет</Link>
                  <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }} style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 12px', fontSize:'14px', color:'#dc2626', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', borderRadius:'8px' }}>Выйти</button>
                </div>
              )}
            </div>
          ) : (
            <div className="ah-auth-buttons">
              <Link href="/login" style={{ padding:'8px 16px', fontSize:'14px', color:'#1a1a1a', textDecoration:'none', fontWeight:500 }}>Войти</Link>
              <Link href="/register" style={{ padding:'8px 20px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:500 }}>Регистрация</Link>
            </div>
          )}

          <button className="ah-burger" onClick={() => setMobileNav(true)}>☰</button>
        </div>
      </nav>

      {mobileNav && (
        <div onClick={() => setMobileNav(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:999 }}>
          <div onClick={e => e.stopPropagation()} style={{ position:'absolute', right:0, top:0, width:'260px', height:'100%', background:'#fff', padding:'20px', display:'flex', flexDirection:'column', gap:'4px', boxShadow:'-4px 0 20px rgba(0,0,0,0.1)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <span style={{ fontSize:'18px', fontWeight:700, color:'#1a1a1a' }}>Меню</span>
              <button onClick={() => setMobileNav(false)} style={{ border:'none', background:'none', fontSize:'22px', cursor:'pointer', color:'#9a9590' }}>✕</button>
            </div>
            <Link href="/catalog" onClick={() => setMobileNav(false)} style={{ display:'block', padding:'14px 16px', borderRadius:'12px', fontSize:'15px', fontWeight:600, color:'#1a1a1a', textDecoration:'none' }}>Каталог</Link>
            <Link href="/support" onClick={() => setMobileNav(false)} style={{ display:'block', padding:'14px 16px', borderRadius:'12px', fontSize:'15px', fontWeight:600, color:'#1a1a1a', textDecoration:'none' }}>Поддержка</Link>
            {user ? (
              <>
                <Link href={dashboardHref} onClick={() => setMobileNav(false)} style={{ display:'block', padding:'14px 16px', borderRadius:'12px', fontSize:'15px', fontWeight:600, color:'#1a1a1a', textDecoration:'none' }}>Личный кабинет</Link>
                <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }} style={{ display:'block', padding:'14px 16px', borderRadius:'12px', fontSize:'15px', fontWeight:600, color:'#dc2626', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left', width:'100%' }}>Выйти</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileNav(false)} style={{ display:'block', padding:'14px 16px', borderRadius:'12px', fontSize:'15px', fontWeight:600, color:'#1a1a1a', textDecoration:'none' }}>Войти</Link>
                <Link href="/register" onClick={() => setMobileNav(false)} style={{ display:'block', padding:'14px 16px', borderRadius:'12px', fontSize:'15px', fontWeight:600, color:'#fff', background:'#C56A43', textDecoration:'none', textAlign:'center', marginTop:'8px' }}>Регистрация</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

