'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

type Author = {
  id: string; user_id: string | null; name: string; city: string; instagram_url: string
  followers_count: number; stories_views: number; occupation: string; lifestyle: string[]
  hobbies: string; bio: string; open_to_barter: boolean; status: string; created_at: string
}
type UserProfile = { id: string; email: string; role: string; created_at: string }

export default function AdminDashboard() {
  const router = useRouter()
  const toast = useToast()
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
    const { error } = await supabase.from('authors').update({ status }).eq('id', id)
    if (error) { toast.error('Не удалось изменить статус анкеты.'); return }
    setAuthors(authors.map(a => a.id === id ? { ...a, status } : a))
    toast.success(status === 'approved' ? 'Анкета одобрена' : 'Анкета отклонена')
  }

  const statusBadge = (status: string) => {
    if (status === 'approved') return { text: 'Опубликован', color: '#16a34a', bg: '#f0fdf4' }
    if (status === 'pending') return { text: 'На модерации', color: '#c17f3e', bg: '#fdf3e7' }
    if (status === 'rejected') return { text: 'Отклонён', color: '#dc2626', bg: '#fef2f2' }
    return { text: status, color: '#9a9590', bg: '#f0ede6' }
  }

  const roleBadge = (role: string) => {
    if (role === 'admin') return { text: 'Админ', color: '#7c3aed', bg: '#f5f3ff' }
    if (role === 'business') return { text: 'Бизнес', color: '#2563eb', bg: '#eff6ff' }
    return { text: 'Автор', color: '#7a7570', bg: '#f0ede6' }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })

  const emailById: Record<string, string> = {}
  users.forEach(u => { emailById[u.id] = u.email })

  const pending = authors.filter(a => a.status === 'pending')

  const btn = { padding:'8px 18px', borderRadius:'100px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:'none' }

  const AuthorCard = ({ a }: { a: Author }) => {
    const sBadge = statusBadge(a.status)
    const email = a.user_id ? (emailById[a.user_id] || '—') : '—'
    return (
      <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'16px', padding:'20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px', gap:'12px', flexWrap:'wrap' }}>
          <div>
            <h3 style={{ fontSize:'17px', fontWeight:700, color:'#1a1a1a', marginBottom:'2px' }}>{a.name || '(без имени)'}</h3>
            <span style={{ fontSize:'13px', color:'#9a9590' }}>📍 {a.city || '—'} · ✉️ {email}</span>
          </div>
          <span style={{ padding:'4px 12px', background:sBadge.bg, borderRadius:'100px', fontSize:'12px', fontWeight:600, color:sBadge.color, whiteSpace:'nowrap' }}>{sBadge.text}</span>
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:'20px', marginBottom:'14px', padding:'12px 0', borderTop:'1px solid #f0ede6', borderBottom:'1px solid #f0ede6' }}>
          <div>
            <div style={{ fontSize:'17px', fontWeight:700, color:'#1a1a1a' }}>{a.followers_count > 0 ? a.followers_count.toLocaleString('ru') : '—'}</div>
            <div style={{ fontSize:'11px', color:'#9a9590' }}>подписчиков</div>
          </div>
          <div>
            <div style={{ fontSize:'17px', fontWeight:700, color:'#1a1a1a' }}>{a.stories_views > 0 ? a.stories_views.toLocaleString('ru') : '—'}</div>
            <div style={{ fontSize:'11px', color:'#9a9590' }}>просмотров историй</div>
          </div>
          <div>
            <div style={{ fontSize:'17px', fontWeight:700, color: a.open_to_barter ? '#16a34a' : '#9a9590' }}>{a.open_to_barter ? 'Да' : 'Нет'}</div>
            <div style={{ fontSize:'11px', color:'#9a9590' }}>открыт к бартеру</div>
          </div>
        </div>

        {a.occupation && (
          <div style={{ fontSize:'13px', color:'#5a5650', marginBottom:'6px' }}><b>Род занятий:</b> {a.occupation}</div>
        )}
        {a.hobbies && (
          <div style={{ fontSize:'13px', color:'#5a5650', marginBottom:'6px' }}><b>Хобби:</b> {a.hobbies}</div>
        )}
        {a.bio && (
          <div style={{ fontSize:'13px', color:'#5a5650', marginBottom:'10px' }}><b>О себе:</b> <span style={{ color:'#7a7570' }}>{a.bio}</span></div>
        )}

        {a.lifestyle?.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'12px' }}>
            {a.lifestyle.map(tag => <span key={tag} style={{ padding:'3px 10px', background:'#f0ede6', borderRadius:'100px', fontSize:'11px', color:'#7a7570', fontWeight:500 }}>{tag}</span>)}
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
          <span style={{ fontSize:'12px', color:'#9a9590' }}>Анкета создана: {formatDate(a.created_at)}</span>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {a.instagram_url && <a href={a.instagram_url} target="_blank" rel="noopener noreferrer" style={{ ...btn, border:'1.5px solid #e0ddd8', background:'#fff', color:'#1a1a1a' }}>Instagram →</a>}
            {a.status !== 'approved' && <button onClick={() => setStatus(a.id, 'approved')} style={{ ...btn, background:'#16a34a', color:'#fff' }}>Одобрить</button>}
            {a.status !== 'rejected' && <button onClick={() => setStatus(a.id, 'rejected')} style={{ ...btn, background:'#fff', border:'1.5px solid #e0ddd8', color:'#5a5650' }}>Отклонить</button>}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Загрузка...</div>

  if (denied) return (
    <main style={{ minHeight:'100vh', background:'#fafaf9', display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(20px, 6vw, 40px)' }}>
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
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px clamp(16px, 5vw, 40px)', borderBottom:'1px solid #e8e6e1', background:'#fafaf9' }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <Link href="/support" style={{ padding:'8px 16px', fontSize:'14px', color:'#7a7570', textDecoration:'none' }}>Поддержка</Link>
          <span style={{ fontSize:'14px', color:'#7a7570' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ padding:'8px 20px', border:'1px solid #d4d0c8', borderRadius:'100px', background:'none', cursor:'pointer', fontSize:'14px', fontFamily:'inherit', color:'#1a1a1a' }}>Выйти</button>
        </div>
      </nav>

      <div style={{ maxWidth:'1000px', margin:'0 auto', padding:'clamp(28px, 7vw, 48px) clamp(16px, 5vw, 40px)' }}>
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
              {pending.map(a => <AuthorCard key={a.id} a={a} />)}
            </div>
          )
        )}

        {/* All authors */}
        {tab === 'authors' && (
          authors.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#9a9590' }}>Анкет пока нет</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {authors.map(a => <AuthorCard key={a.id} a={a} />)}
            </div>
          )
        )}

        {/* Users */}
        {tab === 'users' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {users.map(u => {
              const rBadge = roleBadge(u.role)
              const authorProfile = authors.find(a => a.user_id === u.id)
              const aBadge = authorProfile ? statusBadge(authorProfile.status) : null
              return (
                <div key={u.id} style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'14px', padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px' }}>
                  <div>
                    <div style={{ fontSize:'14px', color:'#1a1a1a', fontWeight:600 }}>{u.email}</div>
                    <div style={{ fontSize:'12px', color:'#9a9590' }}>Регистрация: {formatDate(u.created_at)}</div>
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ padding:'2px 10px', background:rBadge.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:rBadge.color }}>{rBadge.text}</span>
                    {aBadge && authorProfile && (
                      <span style={{ padding:'2px 10px', background:aBadge.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:aBadge.color }}>Анкета: {aBadge.text}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
