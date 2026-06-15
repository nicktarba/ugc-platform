'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import { truncate, formatRelative, formatDate } from '@/lib/format'
import { authorStatusBadge } from '@/lib/status'
import { OPEN_STATUSES, type AuthorRequest as Req } from '@/lib/types'
import { useApp } from '../../AppContext'

export default function AuthorRequestsPage() {
  const { authorProfile: profile, bumpBadge } = useApp()
  const [requests, setRequests] = useState<Req[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (!profile) { setLoading(false); return }
    ;(async () => {
      const { data: r } = await supabase.from('requests').select('*').eq('author_id', profile.id).order('created_at', { ascending: false })
      setRequests(r || [])

      if (r && r.length > 0) {
        const ids = r.map(req => req.id)
        const { data: unread } = await supabase.from('messages').select('request_id').in('request_id', ids).eq('sender_role', 'business').eq('read', false)
        const counts: Record<string, number> = {}
        unread?.forEach(m => { counts[m.request_id] = (counts[m.request_id] || 0) + 1 })
        setUnreadCounts(counts)
      }
      setLoading(false)
    })()
  }, [profile])

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
        bumpBadge(1)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { request_id: string; sender_role: string }
        if (msg.sender_role === 'business') {
          setUnreadCounts(prev => ({ ...prev, [msg.request_id]: (prev[msg.request_id] || 0) + 1 }))
          bumpBadge(1)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile, bumpBadge])

  const markViewed = async (id: string, status: string) => {
    if (status === 'new') {
      await supabase.from('requests').update({ status: 'viewed' }).eq('id', id)
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'viewed' } : r))
    }
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)
  const newRequestsCount = requests.filter(r => r.status === 'new').length
  const badgeCount = totalUnread + newRequestsCount

  const OPEN: string[] = OPEN_STATUSES
  const activeRequests = requests.filter(r => OPEN.includes(r.status))
  const historyRequests = requests.filter(r => !OPEN.includes(r.status))

  if (loading) return <LoadingScreen />

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'16px', fontWeight:500 }}>Кабинет автора</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a', display:'flex', alignItems:'center', gap:'10px' }}>
            Входящие запросы
            {badgeCount > 0 && <span style={{ padding:'2px 12px', background:'#c17f3e', borderRadius:'100px', fontSize:'14px', fontWeight:700, color:'#fff' }}>{badgeCount} новых</span>}
          </h1>
        </div>

        {profile?.status === 'pending' && (
          <div style={{ padding:'12px 20px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'14px', marginBottom:'24px', fontSize:'14px', color:'#c17f3e', fontWeight:500 }}>
            ⏳ Анкета на модерации — скоро появится в каталоге
          </div>
        )}

        {profile?.status === 'rejected' && (
          <div style={{ padding:'12px 20px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', marginBottom:'24px', fontSize:'14px', color:'#dc2626', fontWeight:500 }}>
            Анкета не прошла модерацию. Проверь данные на вкладке «Профиль».
          </div>
        )}

        {!profile ? (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'clamp(20px, 6vw, 40px)', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>✍️</div>
            <h3 style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Заполни анкету</h3>
            <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'24px', lineHeight:1.6 }}>Чтобы бизнесы могли найти тебя в каталоге — нужно заполнить профиль.</p>
            <Link href="/become-author" style={{ padding:'12px 32px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600 }}>Заполнить анкету</Link>
          </div>
        ) : (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
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
                      const sBadge = authorStatusBadge(r.status)
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
                              {r.deadline && <span>📅 {formatDate(r.deadline)}</span>}
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
                          const sBadge = authorStatusBadge(r.status)
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
        )}
      </div>
    </main>
  )
}
