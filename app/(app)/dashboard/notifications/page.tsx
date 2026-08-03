'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UiIcon from '@/components/UiIcon'
import { useApp } from '../../AppContext'
import styles from '../dashboard.module.css'

type Notification = {
  id: string; type: string; title: string; body: string | null
  data: { request_id?: string }; read: boolean; created_at: string
}

type IconName = Parameters<typeof UiIcon>[0]['name']
const ICONS: Record<string, IconName> = {
  new_request: 'message', request_accepted: 'check', request_declined: 'close',
  request_cancelled: 'flag', request_completed: 'star', new_message: 'message',
  new_review: 'star', author_approved: 'shield', author_rejected: 'flag',
}

export default function NotificationsPage() {
  const router = useRouter()
  const { userId, setNotifCount } = useApp()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data } = await supabase.from('notifications').select('id, type, title, body, data, read, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      setNotifications((data as Notification[]) || [])
      setLoading(false)
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
      setNotifCount(0)
    })()
  }, [userId, setNotifCount])

  const handleClick = (n: Notification) => {
    if (n.data?.request_id) router.push(`/dashboard/chat/${n.data.request_id}`)
    else if (n.type === 'author_approved' || n.type === 'author_rejected') router.push('/dashboard/author/profile')
  }

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'только что'
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
    return `${Math.floor(diff / 86400)} дн назад`
  }

  return (
    <main className={styles.page}>
      <div className={`${styles.container} ${styles.narrow}`}>
        <header className={styles.pageHeader}>
          <div className={styles.headerCopy}>
            <div className={styles.eyebrow}>Центр событий</div>
            <h1 className={styles.title}>Уведомления</h1>
            <p className={styles.subtitle}>Новые сообщения, изменения статусов, отзывы и решения по модерации.</p>
          </div>
        </header>

        {loading ? (
          <section className={styles.panel}><div className={styles.empty}><span className={styles.emptyIcon}><UiIcon name="bell" width={22} height={22}/></span><p className={styles.emptyText}>Загружаем уведомления...</p></div></section>
        ) : notifications.length === 0 ? (
          <section className={styles.panel}><div className={styles.empty}><span className={styles.emptyIcon}><UiIcon name="bell" width={22} height={22}/></span><h2 className={styles.emptyTitle}>Уведомлений пока нет</h2><p className={styles.emptyText}>Здесь появятся важные события по профилю, сообщениям и сделкам.</p></div></section>
        ) : (
          <section className={styles.notificationList}>
            {notifications.map(n => {
              const clickable = !!n.data?.request_id || n.type === 'author_approved' || n.type === 'author_rejected'
              return (
                <button key={n.id} type="button" onClick={() => handleClick(n)} className={`${styles.notification} ${clickable ? styles.notificationClickable : ''} ${!n.read ? styles.notificationUnread : ''}`}>
                  <span className={styles.notificationIcon}><UiIcon name={ICONS[n.type] || 'bell'} width={18} height={18}/></span>
                  <span className={styles.notificationCopy}>
                    <span className={styles.notificationTitle}>{n.title}</span>
                    {n.body && <span className={styles.notificationBody}>{n.body}</span>}
                    <span className={styles.notificationTime}>{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read && <span className={styles.notificationDot}/>}
                  {clickable && <UiIcon name="arrowRight" width={16} height={16} style={{ color:'var(--app-muted-soft)', marginTop: 9, flexShrink: 0 }}/>}
                </button>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
