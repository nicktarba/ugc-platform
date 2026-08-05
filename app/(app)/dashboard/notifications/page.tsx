'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UiIcon from '@/components/UiIcon'
import { useToast } from '@/components/Toast'
import { getNotificationHref, type NotificationData } from '@/lib/notifications'
import { useApp } from '../../AppContext'
import styles from '../dashboard.module.css'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  data: NotificationData | null
  read: boolean
  created_at: string
}

type IconName = Parameters<typeof UiIcon>[0]['name']
const ICONS: Record<string, IconName> = {
  new_request: 'message',
  request_viewed: 'eye',
  request_accepted: 'check',
  request_declined: 'close',
  request_cancelled: 'flag',
  request_completed: 'star',
  new_message: 'message',
  work_done: 'check',
  new_review: 'star',
  author_approved: 'shield',
  author_rejected: 'flag',
  complaint_created: 'flag',
  complaint_updated: 'shield',
}

export default function NotificationsPage() {
  const router = useRouter()
  const toast = useToast()
  const { userId, userRole, setNotifCount } = useApp()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.read).length,
    [notifications],
  )

  useEffect(() => {
    setNotifCount(unreadCount)
  }, [unreadCount, setNotifCount])

  useEffect(() => {
    if (!userId) return

    let active = true

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, data, read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!active) return

      if (error) {
        toast.error('Не удалось загрузить уведомления.')
        setNotifications([])
      } else {
        setNotifications((data as Notification[]) || [])
      }
      setLoading(false)
    }

    loadNotifications()

    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => {
          const notification = payload.new as Notification
          setNotifications(previous =>
            previous.some(item => item.id === notification.id)
              ? previous
              : [notification, ...previous].slice(0, 100),
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => {
          const notification = payload.new as Notification
          setNotifications(previous =>
            previous.map(item => item.id === notification.id ? notification : item),
          )
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => {
          const deleted = payload.old as { id?: string }
          if (!deleted.id) return
          setNotifications(previous => previous.filter(item => item.id !== deleted.id))
        },
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [userId, toast])

  const markOneRead = async (notification: Notification) => {
    if (notification.read || !userId) return true

    setNotifications(previous =>
      previous.map(item => item.id === notification.id ? { ...item, read: true } : item),
    )

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notification.id)
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      setNotifications(previous =>
        previous.map(item => item.id === notification.id ? { ...item, read: false } : item),
      )
      toast.error('Не удалось отметить уведомление прочитанным.')
      return false
    }

    return true
  }

  const handleClick = async (notification: Notification) => {
    const marked = await markOneRead(notification)
    if (!marked) return

    const href = getNotificationHref(notification.type, notification.data, userRole)
    if (href) router.push(href)
  }

  const markAllRead = async () => {
    if (!userId || unreadCount === 0 || markingAll) return

    setMarkingAll(true)
    const snapshot = notifications
    setNotifications(previous => previous.map(item => ({ ...item, read: true })))

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    setMarkingAll(false)

    if (error) {
      setNotifications(snapshot)
      toast.error('Не удалось отметить уведомления прочитанными.')
      return
    }

    toast.success('Все уведомления прочитаны')
  }

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'только что'
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
    if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
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
          {unreadCount > 0 && (
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={markAllRead}
                disabled={markingAll}
              >
                <UiIcon name="check" width={16} height={16}/>
                {markingAll ? 'Отмечаем…' : `Прочитать все · ${unreadCount}`}
              </button>
            </div>
          )}
        </header>

        {loading ? (
          <section className={styles.panel}><div className={styles.empty}><span className={styles.emptyIcon}><UiIcon name="bell" width={22} height={22}/></span><p className={styles.emptyText}>Загружаем уведомления...</p></div></section>
        ) : notifications.length === 0 ? (
          <section className={styles.panel}><div className={styles.empty}><span className={styles.emptyIcon}><UiIcon name="bell" width={22} height={22}/></span><h2 className={styles.emptyTitle}>Уведомлений пока нет</h2><p className={styles.emptyText}>Здесь появятся важные события по профилю, сообщениям и сделкам.</p></div></section>
        ) : (
          <section className={styles.notificationList}>
            {notifications.map(notification => {
              const href = getNotificationHref(notification.type, notification.data, userRole)
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleClick(notification)}
                  className={`${styles.notification} ${styles.notificationClickable} ${!notification.read ? styles.notificationUnread : ''}`}
                >
                  <span className={styles.notificationIcon}><UiIcon name={ICONS[notification.type] || 'bell'} width={18} height={18}/></span>
                  <span className={styles.notificationCopy}>
                    <span className={styles.notificationTitle}>{notification.title}</span>
                    {notification.body && <span className={styles.notificationBody}>{notification.body}</span>}
                    <span className={styles.notificationTime}>{timeAgo(notification.created_at)}</span>
                  </span>
                  {!notification.read && <span className={styles.notificationDot}/>}
                  {href && <UiIcon name="arrowRight" width={16} height={16} style={{ color:'var(--app-muted-soft)', marginTop: 9, flexShrink: 0 }}/>}
                </button>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
