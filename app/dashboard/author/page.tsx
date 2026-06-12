'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = { name: string; city: string; instagram_url: string; followers_count: number; lifestyle: string[]; open_to_barter: boolean }

export default function AuthorDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      const { data: p } = await supabase.from('authors').select('*').eq('user_id', data.user.id).single()
      setProfile(p)
      setLoading(false)
    })
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Загрузка...</div>

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 40px', borderBottom:'1px solid #e8e6e1', background:'#fafaf9' }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <span style={{ fontSize:'14px', color:'#7a7570' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ padding:'8px 20px', border:'1px solid #d4d0c8', borderRadius:'100px', background:'none', cursor:'pointer', fontSize:'14px', fontFamily:'inherit', color:'#1a1a1a' }}>Выйти</button>
        </div>
      </nav>

      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'60px 40px' }}>
        <div style={{ marginBottom:'40px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'16px', fontWeight:500 }}>Кабинет автора</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a' }}>
            {profile ? `Привет, ${profile.name}` : 'Добро пожаловать'}
          </h1>
        </div>

        {profile ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            {/* Profile card */}
            <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                <div>
                  <h3 style={{ fontSize:'18px', fontWeight:700, color:'#1a1a1a', marginBottom:'4px' }}>{profile.name}</h3>
                  <span style={{ fontSize:'14px', color:'#9a9590' }}>📍 {profile.city}</span>
                </div>
                {profile.open_to_barter && <span style={{ padding:'4px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', fontSize:'12px', fontWeight:600, color:'#16a34a' }}>Бартер</span>}
              </div>
              {profile.followers_count > 0 && (
                <div style={{ marginBottom:'16px' }}>
                  <div style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a' }}>{profile.followers_count.toLocaleString('ru')}</div>
                  <div style={{ fontSize:'12px', color:'#9a9590' }}>подписчиков</div>
                </div>
              )}
              {profile.lifestyle?.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'20px' }}>
                  {profile.lifestyle.map(tag => <span key={tag} style={{ padding:'3px 10px', background:'#f0ede6', borderRadius:'100px', fontSize:'12px', color:'#7a7570', fontWeight:500 }}>{tag}</span>)}
                </div>
              )}
              <div style={{ display:'flex', gap:'12px' }}>
                <Link href="/become-author" style={{ padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Редактировать</Link>
                {profile.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" style={{ padding:'10px 24px', border:'1.5px solid #e0ddd8', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'14px', fontWeight:500 }}>Instagram →</a>}
              </div>
            </div>

            <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
              <h3 style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Входящие запросы</h3>
              <p style={{ fontSize:'14px', color:'#9a9590' }}>Пока запросов нет — появятся здесь когда бизнес напишет тебе.</p>
            </div>
          </div>
        ) : (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'40px', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>✍️</div>
            <h3 style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Заполни анкету</h3>
            <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'24px', lineHeight:1.6 }}>Чтобы бизнесы могли найти тебя в каталоге — нужно заполнить профиль.</p>
            <Link href="/become-author" style={{ padding:'12px 32px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600 }}>Заполнить анкету</Link>
          </div>
        )}
      </div>
    </main>
  )
}
