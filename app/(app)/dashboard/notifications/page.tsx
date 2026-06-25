'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useApp } from '../../../AppContext'

type Notification = {
  id: string; type: string; title: string; body: string | null
  data: { request_id?: string }; read: boolean; created_at: string
}

const ICONS: Record<string, string> = {
  new_request: '📩', request_accepted: '✅', request_declined: '❌',
  request_cancelled: '🚫', request_completed: '🎉', new_message: '💬',
  new_review: '⭐', author_approved: '✓', author_rejected: '⚠️',
}

export default function NotificationsPage() {
  const router = useRouter()
  const { userId } = useApp()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data } = await supabase.from('notifications').select('id, type, title, body, data, read, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      setNotifications((data as Notification[]) || [])
      setLoading(false)
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    })()
  }, [userId])

  const handleClick = (n: Notification) => {
    if (n.data?.request_id) {
      if (n.type === 'new_message') router.push(`/dashboard/chat/${n.data.request_id}`)
      else router.push(`/dashboard/request/${n.data.request_id}`)
    } else if (n.type === 'author_approved' || n.type === 'author_rejected') {
      router.push('/dashboard/author/profile')
    }
  }

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'только что'
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
    return `${Math.floor(diff / 86400)} дн назад`
  }

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'600px', margin:'0 auto', padding:'clamp(24px, 5vw, 40px) clamp(16px, 5vw, 24px)' }}>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'28px', fontWeight:700, color:'#1a1a1a', marginBottom:'20px' }}>Уведомления</h1>

        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#9a9590', fontSize:'14px' }}>Загрузка...</div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#9a9590', fontSize:'14px' }}>Уведомлений пока нет</div>
        ) : (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'16px', overflow:'hidden' }}>
            {notifications.map((n, i) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding:'14px 16px', cursor: n.data?.request_id ? 'pointer' : 'default',
                  display:'flex', gap:'12px', alignItems:'flex-start',
                  background: n.read ? 'transparent' : '#fdf8f3',
                  borderBottom: i < notifications.length - 1 ? '1px solid #f7f5f0' : 'none',
                }}
              >
                <span style={{ fontSize:'20px', flexShrink:0, marginTop:'2px' }}>{ICONS[n.type] || '📌'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'14px', fontWeight: n.read ? 500 : 700, color:'#1a1a1a', marginBottom:'3px' }}>{n.title}</div>
                  {n.body && <div style={{ fontSize:'13px', color:'#7a7570', lineHeight:1.5 }}>{n.body}</div>}
                  <div style={{ fontSize:'12px', color:'#b5b0a8', marginTop:'4px' }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.read && <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#c17f3e', flexShrink:0, marginTop:'8px' }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

