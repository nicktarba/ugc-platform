'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Author = {
  id: string; name: string; city: string; instagram_url: string; followers_count: number
  occupation: string; lifestyle: string[]; bio: string; open_to_barter: boolean; status: string; created_at: string
}
type UserProfile = { id: string; email: string; role: string; created_at: string }

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [authors, setAuthors] = useState<Author[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [tab, setTab] = useState<'pending'|'authors'|'users'>('pending')
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (profile?.role !== 'admin') { setDenied(true); setLoading(false); return }

      setUser(data.user)
      await loadData()
      setLoading(false)
    }
    init()
  }, [router])

  const loadData = async () => {
    const { data: a } = await supabase.from('authors').select('*').order('created_at', { ascending: false })
    setAuthors(a || [])
    const { data: u } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(u || [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const setStatus = async (id: string, status: string) => {
    await supabase.from('authors').update({ status }).eq('id', id)
    setAuthors(authors.map(a => a.id === id ? { ...a, status } : a))
  }

  const statusBadge = (status: string) => {
    if (status === 'approved') return { text: 'Опубликован', color: '#16a34a', bg: '#f0fdf4' }
    if (status === 'pending') return { text: 'На модерации', color: '#c17f3e', bg: '#fdf3e7' }
    if (status === 'rejected') return { text: 'Отклонён', color: '#dc2626', bg: '#fef2f2' }
    return { text: status, color: '#9a9590', bg: '#f0ede6' }
  }

  const pending = authors.filter(a => a.status === 'pending')

  const btn = { padding:'8px 18px', borderRadius:'100px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none' }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Загрузка...</div>

  if (denied) return (
    <main style={{ minHeight:'100vh', background:'#fafaf9', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px' }}>
      <div style={{ textAlign:'center', maxWidth:'400px' }}>
        <div style={{ fontSize:'40px', marginBottom:'16px' }}>🔒</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'28px', fontWeight:700, color:'#1a1a1a', marginBottom:'12px' }}>Доступ запрещён</h1>
        <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'24px' }}>У тебя нет прав администратора.</p>
        <Link href="/" style={{ padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>На главную</Link>
      </div>
    </main>
  )

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 40px', borderBottom:'1px solid #e8e6e1', background:'#fafaf9' }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <span style={{ fontSize:'14px', color:'#7a7570' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ padding:'8px 20px', border:'1px solid #d4d0c8', borderRadius:'100px', background:'none', cursor:'pointer', fontSize:'14px', fontFamily:'inherit', color:'#1a1a1a' }}>Выйти</button>
        </div>
      </nav>

      <div style={{ maxWidth:'1000px', margin:'0 auto', padding:'48px 40px' }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'12px', fontWeight:500 }}>Админка</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a' }}>Управление платформой</h1>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'24px' }}>
          {[
            { val:'pending', label:`На модерации${pending.length ? ` (${pending.length})` : ''}` },
            { val:'authors', label:`Все анкеты (${authors.length})` },
            { val:'users', label:`Пользователи (${users.length})` },
          ].map(t => (
            <button key={t.val} onClick={() => setTab(t.val as 'pending'|'authors'|'users')} style={{
              padding:'10px 20px', borderRadius:'100px', fontSize:'14px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit',
              borderColor: tab===t.val?'#1a1a1a':'#e0ddd8', background: tab===t.val?'#1a1a1a':'#fff', color: tab===t.val?'#fff':'#5a5650',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Pending moderation */}
        {tab === 'pending' && (
          pending.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#9a9590' }}>Нет анкет на модерации 🎉</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {pending.map(a => (
                <div key={a.id} style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'16px', padding:'20px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                    <div>
                      <h3 style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a' }}>{a.name}</h3>
                      <span style={{ fontSize:'13px', color:'#9a9590' }}>📍 {a.city} {a.followers_count > 0 && `· ${a.followers_count.toLocaleString('ru')} подписчиков`}</span>
                    </div>
                  </div>
                  {a.occupation && <div style={{ fontSize:'13px', color:'#5a5650', marginBottom:'6px' }}>💼 {a.occupation}</div>}
                  {a.bio && <p style={{ fontSize:'13px', color:'#7a7570', marginBottom:'10px', lineHeight:1.6 }}>{a.bio}</p>}
                  {a.lifestyle?.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'12px' }}>
                      {a.lifestyle.map(tag => <span key={tag} style={{ padding:'3px 10px', background:'#f0ede6', borderRadius:'100px', fontSize:'11px', color:'#7a7570', fontWeight:500 }}>{tag}</span>)}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:'8px' }}>
                    {a.instagram_url && <a href={a.instagram_url} target="_blank" rel="noopener noreferrer" style={{ ...btn, border:'1.5px solid #e0ddd8', background:'#fff', color:'#1a1a1a' }}>Instagram →</a>}
                    <button onClick={() => setStatus(a.id, 'approved')} style={{ ...btn, background:'#16a34a', color:'#fff' }}>Одобрить</button>
                    <button onClick={() => setStatus(a.id, 'rejected')} style={{ ...btn, background:'#fff', border:'1.5px solid #e0ddd8', color:'#5a5650' }}>Отклонить</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* All authors */}
        {tab === 'authors' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {authors.map(a => {
              const sBadge = statusBadge(a.status)
              return (
                <div key={a.id} style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'14px', padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
                  <div>
                    <span style={{ fontSize:'14px', fontWeight:600, color:'#1a1a1a' }}>{a.name}</span>
                    <span style={{ fontSize:'13px', color:'#9a9590', marginLeft:'8px' }}>📍 {a.city}</span>
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <span style={{ padding:'2px 10px', background:sBadge.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:sBadge.color }}>{sBadge.text}</span>
                    {a.status !== 'approved' && <button onClick={() => setStatus(a.id, 'approved')} style={{ ...btn, padding:'6px 14px', background:'#f0fdf4', color:'#16a34a' }}>Одобрить</button>}
                    {a.status !== 'rejected' && <button onClick={() => setStatus(a.id, 'rejected')} style={{ ...btn, padding:'6px 14px', background:'#fef2f2', color:'#dc2626' }}>Отклонить</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {users.map(u => (
              <div key={u.id} style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'14px', padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'14px', color:'#1a1a1a' }}>{u.email}</span>
                <span style={{ padding:'2px 10px', background:'#f0ede6', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#7a7570' }}>{u.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
