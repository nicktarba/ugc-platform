'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import AppHeader from '@/components/AppHeader'

type Req = { id: string; message: string; status: string; created_at: string; budget: string | null; deadline: string | null; authors: { name: string; city: string } | null }

export default function BusinessDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [requests, setRequests] = useState<Req[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      const { data: r } = await supabase.from('requests').select('*, authors(name, city)').eq('business_id', data.user.id).order('created_at', { ascending: false })
      setRequests((r as unknown as Req[]) || [])

      const { count } = await supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('business_id', data.user.id)
      setFavoritesCount(count || 0)

      if (r && r.length > 0) {
        const ids = r.map(req => req.id)
        const { data: unread } = await supabase.from('messages').select('request_id').in('request_id', ids).eq('sender_role', 'author').eq('read', false)
        const counts: Record<string, number> = {}
        unread?.forEach(m => { counts[m.request_id] = (counts[m.request_id] || 0) + 1 })
        setUnreadCounts(counts)
      }
      setLoading(false)
    })
  }, [router])

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`business-requests-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `business_id=eq.${user.id}` }, (payload) => {
        const updated = payload.new as { id: string; status: string }
        setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, status: updated.status } : r))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { request_id: string; sender_role: string }
        if (msg.sender_role === 'author') {
          setUnreadCounts(prev => ({ ...prev, [msg.request_id]: (prev[msg.request_id] || 0) + 1 }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const statusLabel = (status: string) => {
    if (status === 'new') return { text: 'Отправлено', color: '#9a9590', bg: '#f0ede6' }
    if (status === 'viewed') return { text: 'Просмотрено', color: '#c17f3e', bg: '#fdf3e7' }
    if (status === 'accepted') return { text: 'В работе', color: '#16a34a', bg: '#f0fdf4' }
    if (status === 'cancelled') return { text: 'Отменено', color: '#7a7570', bg: '#f0ede6' }
    if (status === 'completed') return { text: '✓ Завершено', color: '#16a34a', bg: '#f0fdf4' }
    return { text: 'Отклонено', color: '#dc2626', bg: '#fef2f2' }
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

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Загрузка...</div>

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <AppHeader />

      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'40px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'16px', fontWeight:500 }}>Кабинет бизнеса</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a' }}>Добро пожаловать</h1>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px', marginBottom:'16px' }}>
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>🔍</div>
            <h3 style={{ fontSize:'17px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Найти авторов</h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'20px', lineHeight:1.6 }}>Каталог микро-авторов с фильтрами по городу, хобби и стилю жизни.</p>
            <Link href="/catalog" style={{ display:'inline-block', padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Открыть каталог</Link>
          </div>

          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>⭐️</div>
            <h3 style={{ fontSize:'17px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Избранные {favoritesCount > 0 && `(${favoritesCount})`}</h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'20px', lineHeight:1.6 }}>Авторы которых ты сохранил. Удобно собирать шортлист.</p>
            <Link href="/dashboard/business/favorites" style={{ display:'inline-block', padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Открыть</Link>
          </div>
        </div>

        <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
          <h3 style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
            Мои запросы {requests.length > 0 && `(${requests.length})`}
            {totalUnread > 0 && <span style={{ padding:'2px 10px', background:'#c17f3e', borderRadius:'100px', fontSize:'12px', fontWeight:700, color:'#fff' }}>{totalUnread} новых</span>}
          </h3>
          {requests.length === 0 ? (
            <p style={{ fontSize:'14px', color:'#9a9590' }}>Запросы которые ты отправил авторам появятся здесь.</p>
          ) : (
            <>
              {activeRequests.length === 0 ? (
                <p style={{ fontSize:'13px', color:'#9a9590', marginBottom: historyRequests.length > 0 ? '16px' : 0 }}>Нет активных запросов</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom: historyRequests.length > 0 ? '16px' : 0 }}>
                  {activeRequests.map(r => {
                    const s = statusLabel(r.status)
                    const unread = unreadCounts[r.id] || 0
                    return (
                      <Link key={r.id} href={`/dashboard/chat/${r.id}`} style={{ display:'block', textDecoration:'none', padding:'16px', background: unread > 0 ? '#fdf3e7' : '#fafaf9', border:'1px solid #e8e6e1', borderRadius:'14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'6px' }}>
                          <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{r.authors?.name} · {r.authors?.city}</span>
                          <div style={{ display:'flex', gap:'6px', alignItems:'center', flexShrink:0 }}>
                            {unread > 0 && <span style={{ padding:'2px 8px', background:'#c17f3e', borderRadius:'100px', fontSize:'11px', fontWeight:700, color:'#fff' }}>{unread}</span>}
                            <span style={{ padding:'2px 10px', background:s.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:s.color, whiteSpace:'nowrap' }}>{s.text}</span>
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
                        const s = statusLabel(r.status)
                        return (
                          <Link key={r.id} href={`/dashboard/chat/${r.id}`} style={{ display:'block', textDecoration:'none', padding:'16px', background:'#fafaf9', border:'1px solid #e8e6e1', borderRadius:'14px', opacity:0.75 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'6px' }}>
                              <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{r.authors?.name} · {r.authors?.city}</span>
                              <span style={{ padding:'2px 10px', background:s.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:s.color, whiteSpace:'nowrap' }}>{s.text}</span>
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
      <BottomNav role="business" active="requests" unread={totalUnread} />
    </main>
  )
}
