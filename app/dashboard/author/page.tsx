'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthorDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      setLoading(false)
    })
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fafaf9', color: '#9a9590' }}>Загрузка...</div>

  return (
    <main style={{ background: '#fafaf9', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #e8e6e1', background: '#fafaf9' }}>
        <Link href="/" style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}>ugcmarket</Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#7a7570' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ padding: '8px 20px', border: '1px solid #d4d0c8', borderRadius: '100px', background: 'none', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', color: '#1a1a1a' }}>Выйти</button>
        </div>
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 40px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', background: '#f0ede6', borderRadius: '100px', fontSize: '13px', color: '#7a7570', marginBottom: '16px', fontWeight: 500 }}>Кабинет автора</div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '36px', fontWeight: 700, color: '#1a1a1a' }}>Добро пожаловать</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {[
            { title: 'Мой профиль', desc: 'Заполни анкету чтобы бизнесы могли тебя найти', link: '/become-author', btn: 'Заполнить анкету' },
            { title: 'Каталог', desc: 'Посмотри как выглядят другие авторы', link: '/catalog', btn: 'Открыть каталог' },
          ].map(card => (
            <div key={card.title} style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: '20px', padding: '28px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>{card.title}</h3>
              <p style={{ fontSize: '14px', color: '#7a7570', marginBottom: '20px', lineHeight: 1.6 }}>{card.desc}</p>
              <Link href={card.link} style={{ display: 'inline-block', padding: '10px 24px', background: '#1a1a1a', borderRadius: '100px', textDecoration: 'none', color: '#fff', fontSize: '14px', fontWeight: 600 }}>{card.btn}</Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
