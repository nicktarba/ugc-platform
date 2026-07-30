'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import { useToast } from '@/components/Toast'
import { truncate, formatRelative, formatDate } from '@/lib/format'
import { authorStatusBadge } from '@/lib/status'
import { OPEN_STATUSES, type AuthorRequest as Req } from '@/lib/types'
import { useApp } from '../../../AppContext'

export default function AuthorDealsPage() {
  const toast = useToast()
  const { userId, authorProfile: profile, bumpBadge } = useApp()
  const [requests, setRequests] = useState<Req[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [businessNames, setBusinessNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (!profile) { setLoading(false); return }
    ;(async () => {
      const { data: r, error: reqErr } = await supabase.from('requests').select('id, business_id, business_email, author_id, message, budget, deadline, status, created_at').eq('author_id', profile.id).order('created_at', { ascending: false })
      if (reqErr) toast.error('Не удалось загрузить заявки. Проверь соединение.')
      setRequests(r || [])

      if (r && r.length > 0) {
        const bizIds = [...new Set(r.map(req => req.business_id))]
        const { data: bps } = await supabase.from('business_profiles').select('id, company_name').in('id', bizIds)
        if (bps) {
          const names: Record<string, string> = {}
          bps.forEach(bp => { if (bp.company_name) names[bp.id] = bp.company_name })
          setBusinessNames(names)
        }

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
      .channel(`author-deals-${profile.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `author_id=eq.${profile.id}` }, (payload) => {
        const updated = payload.new as { id: string; status: string }
        setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, status: updated.status } : r))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: `author_id=eq.${profile.id}` }, (payload) => {
        const newReq = payload.new as Req
        setRequests(prev => [newReq, ...prev])
        bumpBadge(1)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        const notif = payload.new as { type: string; data: { request_id?: string } }
        if (notif.type === 'new_message' && notif.data?.request_id) {
          setUnreadCounts(prev => ({ ...prev, [notif.data.request_id!]: (prev[notif.data.request_id!] || 0) + 1 }))
          bumpBadge(1)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile, bumpBadge])

  const markViewed = async (id: string, status: string) => {
    if (status === 'new') {
      const { error } = await supabase.from('requests').update({ status: 'viewed' }).eq('id', id)
      if (error) { toast.error('Не удалось обновить статус заявки.'); return }
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'viewed' } : r))
    }
  }

  const newRequestIds = new Set(requests.filter(r => r.status === 'new').map(r => r.id))
  const newRequestsCount = newRequestIds.size
  const totalUnread = Object.entries(unreadCounts)
    .filter(([reqId]) => !newRequestIds.has(reqId))
    .reduce((sum, [, count]) => sum + count, 0)
  const badgeCount = totalUnread + newRequestsCount

  const OPEN: string[] = OPEN_STATUSES
  const historyRequests = requests.filter(r => !OPEN.includes(r.status))

  if (loading) return <LoadingScreen />

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'28px' }}>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a', display:'flex', alignItems:'center', gap:'10px' }}>
            Сделки
            {badgeCount > 0 && <span style={{ padding:'2px 12px', background:'#c17f3e', borderRadius:'100px', fontSize:'14px', fontWeight:700, color:'#fff' }}>{badgeCount}</span>}
          </h1>
        </div>

        {!profile ? (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px', textAlign:'center' }}>
            <p style={{ fontSize:'14px', color:'#9a9590' }}>Сначала заполни анкету автора</p>
            <Link href="/dashboard/author/profile" style={{ display:'inline-block', marginTop:'12px', padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Заполнить анкету →</Link>
          </div>
        ) : (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
            {requests.length === 0 ? (
              <div>
                <p style={{ fontSize:'14px', color:'#9a9590', marginBottom: profile.status === 'approved' ? '16px' : 0 }}>Пока запросов нет — появятся здесь когда бизнес напишет тебе.</p>
                {profile.status === 'approved' && (
                  <div style={{ padding:'14px 16px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'12px', fontSize:'13px', color:'#c17f3e', lineHeight:1.6 }}>
                    💡 Поделись ссылкой на свой профиль с брендами — это ускорит первые заявки.{' '}
                    <Link href={`/author/${profile.id}`} style={{ fontWeight:600, color:'#c17f3e', textDecoration:'none' }}>Открыть профиль →</Link>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Сделки — accepted */}
                {(() => {
                  const deals = requests.filter(r => r.status === 'accepted')
                  if (deals.length === 0) return null
                  return (
                    <div style={{ marginBottom:'20px' }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'#1a1a1a', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.04em' }}>В работе ({deals.length})</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                        {deals.map(r => {
                          const unread = unreadCounts[r.id] || 0
                          return (
                            <Link key={r.id} href={`/dashboard/chat/${r.id}`} style={{ display:'block', textDecoration:'none', padding:'16px', background: unread > 0 ? '#f0fdf4' : '#fafaf9', border:'1px solid #bbf7d0', borderRadius:'14px' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'6px' }}>
                                <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{businessNames[r.business_id] || r.business_email}</span>
                                <div style={{ display:'flex', gap:'6px', alignItems:'center', flexShrink:0 }}>
                                  {unread > 0 && <span style={{ padding:'2px 8px', background:'#c17f3e', borderRadius:'100px', fontSize:'11px', fontWeight:700, color:'#fff' }}>{unread}</span>}
                                  <span style={{ padding:'2px 10px', background:'#f0fdf4', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#16a34a', whiteSpace:'nowrap' }}>В работе</span>
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
                    </div>
                  )
                })()}

                {/* Запросы — new, viewed */}
                {(() => {
                  const incoming = requests.filter(r => r.status === 'new' || r.status === 'viewed')
                  if (incoming.length === 0 && requests.filter(r => r.status === 'accepted').length > 0) return null
                  if (incoming.length === 0) return <p style={{ fontSize:'13px', color:'#9a9590', marginBottom: historyRequests.length > 0 ? '16px' : 0 }}>Нет новых запросов</p>
                  return (
                    <div style={{ marginBottom:'20px' }}>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'#1a1a1a', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Запросы ({incoming.length})</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                        {incoming.map(r => {
                          const unread = unreadCounts[r.id] || 0
                          const isNew = r.status === 'new' || unread > 0
                          return (
                            <Link key={r.id} href={`/dashboard/chat/${r.id}`} onClick={() => markViewed(r.id, r.status)} style={{ display:'block', textDecoration:'none', padding:'16px', background: isNew ? '#fdf3e7' : '#fafaf9', border:'1px solid #e8e6e1', borderRadius:'14px' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'6px' }}>
                                <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{businessNames[r.business_id] || r.business_email}</span>
                                <div style={{ display:'flex', gap:'6px', alignItems:'center', flexShrink:0 }}>
                                  {unread > 0 && <span style={{ padding:'2px 8px', background:'#c17f3e', borderRadius:'100px', fontSize:'11px', fontWeight:700, color:'#fff' }}>{unread}</span>}
                                  {r.status === 'new' && unread === 0 && <span style={{ padding:'2px 10px', background:'#c17f3e', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#fff', whiteSpace:'nowrap' }}>Новое</span>}
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
                    </div>
                  )
                })()}

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
                                <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{businessNames[r.business_id] || r.business_email}</span>
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
