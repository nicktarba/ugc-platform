'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  data: { request_id?: string; rating?: number }
  read: boolean
  created_at: string
}

const ICONS: Record<string, string> = {
  new_request: '📩',
  request_accepted: '✅',
  request_declined: '❌',
  request_cancelled: '🚫',
  request_completed: '🎉',
  new_message: '💬',
  new_review: '⭐',
  author_approved: '✓',
  author_rejected: '⚠️',
}

export default function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, data, read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      setNotifications((data as Notification[]) || [])
      setUnread((data || []).filter(n => !n.read).length)
    }
    load()

    const channel = supabase.channel('notifications-' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new as Notification
        setNotifications(prev => [n, ...prev].slice(0, 30))
        setUnread(prev => prev + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  const handleClick = (n: Notification) => {
    if (!n.read) {
      supabase.from('notifications').update({ read: true }).eq('id', n.id)
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setUnread(prev => Math.max(0, prev - 1))
    }
    setOpen(false)
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
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч`
    return `${Math.floor(diff / 86400)} дн`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead() }}
        style={{ position:'relative', width:'36px', height:'36px', borderRadius:'50%', border:'1px solid #e0ddd8', background: open ? '#f0ede6' : '#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontFamily:'inherit' }}
      >
        🔔
        {unread > 0 && (
          <span style={{ position:'absolute', top:'-2px', right:'-2px', width:'18px', height:'18px', borderRadius:'50%', background:'#c17f3e', color:'#fff', fontSize:'10px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0, width:'340px',
          background:'#fff', border:'1px solid #e8e6e1', borderRadius:'16px',
          boxShadow:'0 8px 30px rgba(0,0,0,0.12)', zIndex:1000, overflow:'hidden',
          maxHeight:'420px', display:'flex', flexDirection:'column',
        }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #f0ede6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'15px', fontWeight:700, color:'#1a1a1a' }}>Уведомления</span>
            {notifications.some(n => !n.read) && (
              <button onClick={markAllRead} style={{ fontSize:'12px', color:'#c17f3e', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>Прочитать все</button>
            )}
          </div>

          <div style={{ overflowY:'auto', flex:1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center', color:'#9a9590', fontSize:'14px' }}>
                Уведомлений пока нет
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    padding:'12px 16px', cursor:'pointer', display:'flex', gap:'10px', alignItems:'flex-start',
                    background: n.read ? 'transparent' : '#fdf8f3',
                    borderBottom:'1px solid #f7f5f0',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                  onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : '#fdf8f3')}
                >
                  <span style={{ fontSize:'18px', flexShrink:0, marginTop:'1px' }}>{ICONS[n.type] || '📌'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight: n.read ? 500 : 700, color:'#1a1a1a', marginBottom:'2px' }}>{n.title}</div>
                    {n.body && <div style={{ fontSize:'12px', color:'#7a7570', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>}
                    <div style={{ fontSize:'11px', color:'#b5b0a8', marginTop:'3px' }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.read && <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#c17f3e', flexShrink:0, marginTop:'6px' }} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

