'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import LoadingScreen from '@/components/LoadingScreen'
import { truncate, formatRelative, formatDate } from '@/lib/format'
import { businessStatusLabel } from '@/lib/status'
import { OPEN_STATUSES, type BusinessRequest as Req } from '@/lib/types'
import { useApp } from '../../AppContext'

export default function BusinessDashboard() {
  const { userId, bumpBadge, businessProfile } = useApp()
  const toast = useToast()
  const [requests, setRequests] = useState<Req[]>([])
  const [reqTab, setReqTab] = useState<'active'|'history'|'all'>('active')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data: r, error: reqErr } = await supabase.from('requests').select('id, business_id, business_email, author_id, message, budget, deadline, status, created_at, authors(name, city)').eq('business_id', userId).order('created_at', { ascending: false })
      if (reqErr) toast.error('Не удалось загрузить заявки. Проверь соединение.')
      setRequests((r as unknown as Req[]) || [])

      const { count } = await supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('business_id', userId)
      setFavoritesCount(count || 0)

      if (r && r.length > 0) {
        const ids = r.map(req => req.id)
        const { data: unread } = await supabase.from('messages').select('request_id').in('request_id', ids).eq('sender_role', 'author').eq('read', false)
        const counts: Record<string, number> = {}
        unread?.forEach(m => { counts[m.request_id] = (counts[m.request_id] || 0) + 1 })
        setUnreadCounts(counts)
      }
      setLoading(false)
    })()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`business-requests-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `business_id=eq.${userId}` }, (payload) => {
        const updated = payload.new as { id: string; status: string }
        setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, status: updated.status } : r))
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
  }, [userId, bumpBadge])

  const OPEN: string[] = OPEN_STATUSES
  const activeRequests = requests.filter(r => OPEN.includes(r.status))
  const historyRequests = requests.filter(r => !OPEN.includes(r.status))

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  if (loading) return <LoadingScreen />

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'40px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'16px', fontWeight:500 }}>Кабинет бизнеса</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a' }}>{businessProfile?.company_name || 'Добро пожаловать'}</h1>
        </div>

        {businessProfile && (!businessProfile.company_name || !businessProfile.inn) && (
          <div style={{ padding:'14px 20px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'14px', marginBottom:'16px', fontSize:'14px', color:'#c17f3e', fontWeight:500, display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
            <span>Заполни профиль компании (название и ИНН), чтобы писать авторам</span>
            <Link href="/dashboard/business/profile" style={{ padding:'6px 16px', background:'#c17f3e', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'13px', fontWeight:600, flexShrink:0 }}>Заполнить</Link>
          </div>
        )}

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

        {requests.length === 0 && favoritesCount === 0 && (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px', marginBottom:'16px', borderLeft:'4px solid #c17f3e' }}>
            <div style={{ fontSize:'28px', marginBottom:'12px' }}>👋</div>
            <h3 style={{ fontSize:'17px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Как это работает</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', fontSize:'14px', color:'#5a5650', lineHeight:1.6 }}>
              <div>1. Открой каталог и найди подходящего автора</div>
              <div>2. Нажми «Написать» — расскажи о задаче и бюджете</div>
              <div>3. Автор ответит в чате — договоритесь об условиях</div>
              <div>4. Отметьте сделку завершённой когда всё готово</div>
            </div>
            <Link href="/catalog" style={{ display:'inline-block', marginTop:'16px', padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Открыть каталог</Link>
          </div>
        )}


        <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'8px' }}>
            <h3 style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a', display:'flex', alignItems:'center', gap:'8px', margin:0 }}>
              Мои запросы {requests.length > 0 && `(${requests.length})`}
              {totalUnread > 0 && <span style={{ padding:'2px 10px', background:'#c17f3e', borderRadius:'100px', fontSize:'12px', fontWeight:700, color:'#fff' }}>{totalUnread} новых</span>}
            </h3>
            {requests.length > 0 && (
              <div style={{ display:'flex', gap:'4px' }}>
                {[{key:'active' as const, label:'Активные'}, {key:'history' as const, label:'Завершённые'}, {key:'all' as const, label:'Все'}].map(t => (
                  <button key={t.key} onClick={() => setReqTab(t.key)} style={{ padding:'5px 12px', borderRadius:'100px', fontSize:'12px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', borderColor: reqTab === t.key ? '#1a1a1a' : '#e0ddd8', background: reqTab === t.key ? '#1a1a1a' : '#fff', color: reqTab === t.key ? '#fff' : '#5a5650' }}>{t.label}</button>
                ))}
              </div>
            )}
          </div>
          {requests.length === 0 ? (
            <p style={{ fontSize:'14px', color:'#9a9590' }}>Запросы которые ты отправил авторам появятся здесь.</p>
          ) : (() => {
            const shown = reqTab === 'active' ? activeRequests : reqTab === 'history' ? historyRequests : requests
            return shown.length === 0 ? (
              <p style={{ fontSize:'13px', color:'#9a9590' }}>{reqTab === 'active' ? 'Нет активных запросов' : 'Нет завершённых запросов'}</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {shown.map(r => {
                    const s = businessStatusLabel(r.status)
                    const unread = unreadCounts[r.id] || 0
                    return (
                      <Link key={r.id} href={`/dashboard/request/${r.id}`} style={{ display:'block', textDecoration:'none', padding:'16px', background: unread > 0 ? '#fdf3e7' : '#fafaf9', border:'1px solid #e8e6e1', borderRadius:'14px' }}>
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
                            {r.deadline && <span>📅 {formatDate(r.deadline)}</span>}
                          </div>
                          <span>{formatRelative(r.created_at)}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
          )()}
        </div>
      </div>
    </main>
  )
}

