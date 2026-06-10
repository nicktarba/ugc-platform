'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; user_metadata?: { role?: string } } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #e8e6e1', background: '#fafaf9', position: 'sticky', top: 0, zIndex: 100 }}>
      <Link href="/" style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}>ugcmarket</Link>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Link href="/catalog" style={{ padding: '8px 16px', border: '1px solid #d4d0c8', borderRadius: '100px', textDecoration: 'none', color: '#1a1a1a', fontSize: '14px', fontWeight: 500 }}>Каталог</Link>
        {user ? (
          <>
            <Link href={user.user_metadata?.role === 'author' ? '/dashboard/author' : '/catalog'} style={{ padding: '8px 16px', fontSize: '14px', color: '#7a7570', textDecoration: 'none' }}>{user.email}</Link>
            <button onClick={handleLogout} style={{ padding: '8px 20px', border: '1px solid #d4d0c8', borderRadius: '100px', background: 'none', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', color: '#1a1a1a' }}>Выйти</button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ padding: '8px 16px', fontSize: '14px', color: '#1a1a1a', textDecoration: 'none', fontWeight: 500 }}>Войти</Link>
            <Link href="/register" style={{ padding: '8px 20px', background: '#1a1a1a', borderRadius: '100px', textDecoration: 'none', color: '#fff', fontSize: '14px', fontWeight: 500 }}>Регистрация</Link>
          </>
        )}
      </div>
    </nav>
  )
}
