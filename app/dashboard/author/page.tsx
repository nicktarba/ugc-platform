'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = { id: string; name: string; city: string; instagram_url: string; followers_count: number; lifestyle: string[]; open_to_barter: boolean; status: string }
type Req = { id: string; message: string; status: string; business_email: string; created_at: string; budget: string | null; deadline: string | null }

export default function AuthorDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [requests, setRequests] = useState<Req[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      const { data: p } = await supabase.from('authors').select('*').eq('user_id', data.user.id).single()
      setProfile(p)
      if (p) {
        const { data: r } = await supabase.from('requests').select('*').eq('author_id', p.id).order('created_at', { ascending: false })
        setRequests(r || [])

        if (r && r.length > 0) {
          const ids = r.map(req => req.id)
          const { data: unread } = await supabase.from('messages').select('request_id').in('request_id', ids).eq('sender_role', 'business').eq('read', false)
          const counts: Record<string, number> = {}
          unread?.forEach(m => { counts[m.request_id] = (counts[m.request_id] || 0) + 1 })
          setUnreadCounts(counts)
        }
      }
      setLoading(false)
    })
  }, [router])

  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`author-requests-${profile.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `author_id=eq.${profile.id}` }, (payload) => {
        const updated = payload.new as { id: string; status: string }
        setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, status: updated.status } : r))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: `author_id=eq.${profile.id}` }, (payload) => {
        const newReq = payload.new as Req
        setRequests(prev => [newReq, ...prev])
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { request_id: string; sender_role: string }
        if (msg.sender_role === 'business') {
          setUnreadCounts(prev => ({ ...prev, [msg.request_id]: (prev[msg.request_id] || 0) + 1 }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const markViewed = async (id: string, status: string) => {
    if (status === 'new') {
      await supabase.from('requests').update({ status: 'viewed' }).eq('id', id)
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'viewed' } : r))
    }
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  const statusBadge = (status: string) => {
    if (status === 'accepted') return { text: 'В работе', color: '#16a34a', bg: '#f0fdf4' }
    if (status === 'declined') return { text: 'Отклонено', color: '#dc2626', bg: '#fef2f2' }
    if (status === 'cancelled') return { text: 'Отменено', color: '#7a7570', bg: '#f0ede6' }
    if (status === 'completed') return { text: '✓ Завершено', color: '#16a34a', bg: '#f0fdf4' }
    return null
  }

  const truncate = (s: string, n = 110) => s.length > n ? s.slice(0, n).trim() + '…' : s

  const formatRelative = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const diffDays = Math.floor((today.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86400000)
    if (diffDays === 0) return 'сегодня'
    if (diffDays === 1) return 'вчера'
    if (diffDays < 7) return `${diffDays} дн назад`
    return d.toLocaleDateString('ru', { day:'numeric', month:'short' })
  }

  const OPEN = ['new', 'viewed', 'accepted']
  const activeRequests = requests.filter(r => OPEN.includes(r.status))
  const historyRequests = requests.filter(r => !OPEN.includes(r.status))

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Загрузка...</div>

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 40px', borderBottom:'1px solid #e8e6e1', background:'#fafaf9' }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <Link href="/support" style={{ padding:'8px 16px', fontSize:'14px', color:'#7a7570', textDecoration:'none' }}>Поддержка</Link>
          <span style={{ fontSize:'14px', color:'#7a7570', position:'relative' }}>
            {user?.email}
            {totalUnread > 0 && <span style={{ position:'absolute', top:'-6px', right:'-14px', width:'8px', height:'8px', borderRadius:'50%', background:'#c17f3e' }} />}
          </span>
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

        {profile?.status === 'pending' && (
          <div style={{ padding:'12px 20px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'14px', marginBottom:'24px', fontSize:'14px', color:'#c17f3e', fontWeight:500 }}>
            ⏳ Анкета на модерации — скоро появится в каталоге
          </div>
        )}

        {profile?.status === 'rejected' && (
          <div style={{ padding:'12px 20px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', marginBottom:'24px', fontSize:'14px', color:'#dc2626', fontWeight:500 }}>
            Анкета не прошла модерацию. Проверь данные и отредактируй профиль.
          </div>
        )}

        {profile ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
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
              <h3 style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
                Входящие запросы {requests.length > 0 && `(${requests.length})`}
                {totalUnread > 0 && <span style={{ padding:'2px 10px', background:'#c17f3e', borderRadius:'100px', fontSize:'12px', fontWeight:700, color:'#fff' }}>{totalUnread} новых</span>}
              </h3>
              {requests.length === 0 ? (
                <p style={{ fontSize:'14px', color:'#9a9590' }}>Пока запросов нет — появятся здесь когда бизнес напишет тебе.</p>
              ) : (
                <>
                  {activeRequests.length === 0 ? (
                    <p style={{ fontSize:'13px', color:'#9a9590', marginBottom: historyRequests.length > 0 ? '16px' : 0 }}>Нет активных запросов</p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom: historyRequests.length > 0 ? '16px' : 0 }}>
                      {activeRequests.map(r => {
                        const unread = unreadCounts[r.id] || 0
                        const isNew = r.status === 'new' || unread > 0
                        const sBadge = statusBadge(r.status)
                        return (
                          <Link key={r.id} href={`/dashboard/chat/${r.id}`} onClick={() => markViewed(r.id, r.status)} style={{ display:'block', textDecoration:'none', padding:'16px', background: isNew ? '#fdf3e7' : '#fafaf9', border:'1px solid #e8e6e1', borderRadius:'14px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'6px' }}>
                              <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{r.business_email}</span>
                              <div style={{ display:'flex', gap:'6px', alignItems:'center', flexShrink:0 }}>
                                {unread > 0 && <span style={{ padding:'2px 8px', background:'#c17f3e', borderRadius:'100px', fontSize:'11px', fontWeight:700, color:'#fff' }}>{unread}</span>}
                                {r.status === 'new' && unread === 0 && <span style={{ padding:'2px 10px', background:'#c17f3e', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#fff', whiteSpace:'nowrap' }}>Новое</span>}
                                {sBadge && <span style={{ padding:'2px 10px', background:sBadge.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:sBadge.color, whiteSpace:'nowrap' }}>{sBadge.text}</span>}
                              </div>
                            </div>
                            <p style={{ fontSize:'13px', color:'#7a7570', lineHeight:1.5, marginBottom:'8px' }}>{truncate(r.message)}</p>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px', color:'#9a9590', flexWrap:'wrap', gap:'8px' }}>
                              <div style={{ display:'flex', gap:'12px' }}>
                                {r.budget && <span>💰 {r.budget}</span>}
                                {r.deadline && <span>📅 {new Date(r.deadline).toLocaleDateString('ru', { day:'numeric', month:'short' })}</span>}
                              </div>
                              <span>{formatRelative(r.created_at)}</span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}

                  {historyRequests.length > 0 && (
                    <>
                      <button onClick={() => setShowHistory(!showHistory)} style={{ width:'100%', padding:'10px', border:'1px dashed #e0ddd8', borderRadius:'12px', background:'none', cursor:'pointer', fontSize:'13px', fontWeight:500, color:'#9a9590', fontFamily:'inherit' }}>
                        {showHistory ? 'Скрыть историю' : `Показать историю (${historyRequests.length})`}
                      </button>
                      {showHistory && (
                        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'12px' }}>
                          {historyRequests.map(r => {
                            const sBadge = statusBadge(r.status)
                            return (
                              <Link key={r.id} href={`/dashboard/chat/${r.id}`} style={{ display:'block', textDecoration:'none', padding:'16px', background:'#fafaf9', border:'1px solid #e8e6e1', borderRadius:'14px', opacity:0.75 }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'6px' }}>
                                  <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{r.business_email}</span>
                                  {sBadge && <span style={{ padding:'2px 10px', background:sBadge.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:sBadge.color, whiteSpace:'nowrap' }}>{sBadge.text}</span>}
                                </div>
                                <p style={{ fontSize:'13px', color:'#7a7570', lineHeight:1.5, marginBottom:'8px' }}>{truncate(r.message)}</p>
                                <div style={{ display:'flex', justifyContent:'flex-end', fontSize:'12px', color:'#9a9590' }}>
                                  <span>{formatRelative(r.created_at)}</span>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
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
