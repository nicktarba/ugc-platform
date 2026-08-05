'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UiIcon from '@/components/UiIcon'
import { useToast } from '@/components/Toast'
import { getNotificationHref } from '@/lib/notifications'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRecord,
} from '@/lib/notification-client'
import { useApp } from '../../AppContext'
import styles from '../dashboard.module.css'

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
  const { error: showError, success: showSuccess } = useToast()
  const { userId, userRole, setNotifCount } = useApp()
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.read).length,
    [notifications],
  )

  useEffect(() => {
    setNotifCount(unreadCount)
  }, [unreadCount, setNotifCount])

  const loadNotifications = useCallback(async (showToast = false) => {
    if (!userId) return

    try {
      const items = await getNotifications(100)
      setNotifications(items)
      setLoadError(null)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Не удалось загрузить уведомления.'
      setLoadError(message)
      if (showToast) showError(message)
    } finally {
      setLoading(false)
    }
  }, [userId, showError])

  useEffect(() => {
    if (!userId) return

    let active = true
    let refreshTimer: ReturnType<typeof setTimeout> | null = null

    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        if (active) void loadNotifications(false)
      }, 120)
    }

    void loadNotifications(true)

    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe()

    // Если Realtime временно недоступен, список всё равно обновится.
    const poll = window.setInterval(refresh, 30_000)
    const onFocus = () => refresh()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      active = false
      if (refreshTimer) clearTimeout(refreshTimer)
      window.clearInterval(poll)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      supabase.removeChannel(channel)
    }
  }, [userId, loadNotifications])

  const markOneRead = async (notification: NotificationRecord) => {
    if (notification.read) return true

    setNotifications(previous =>
      previous.map(item => item.id === notification.id
        ? { ...item, read: true }
        : item),
    )

    try {
      await markNotificationRead(notification.id)
      return true
    } catch (error) {
      setNotifications(previous =>
        previous.map(item => item.id === notification.id
          ? { ...item, read: false }
          : item),
      )
      showError(
        error instanceof Error
          ? error.message
          : 'Не удалось отметить уведомление прочитанным.',
      )
      return false
    }
  }

  const handleClick = async (notification: NotificationRecord) => {
    const marked = await markOneRead(notification)
    if (!marked) return

    const href = getNotificationHref(
      notification.type,
      notification.data,
      userRole,
    )

    if (href) router.push(href)
  }

  const markAllRead = async () => {
    if (unreadCount === 0 || markingAll) return

    setMarkingAll(true)
    const snapshot = notifications
    setNotifications(previous => previous.map(item => ({ ...item, read: true })))

    try {
      await markAllNotificationsRead()
      showSuccess('Все уведомления прочитаны')
    } catch (error) {
      setNotifications(snapshot)
      showError(
        error instanceof Error
          ? error.message
          : 'Не удалось отметить уведомления прочитанными.',
      )
    } finally {
      setMarkingAll(false)
    }
  }

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return 'только что'
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
    if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    })
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
          <section className={styles.panel}>
            <div className={styles.empty}>
              <span className={styles.emptyIcon}><UiIcon name="bell" width={22} height={22}/></span>
              <p className={styles.emptyText}>Загружаем уведомления...</p>
            </div>
          </section>
        ) : loadError ? (
          <section className={styles.panel}>
            <div className={styles.empty}>
              <span className={styles.emptyIcon}><UiIcon name="flag" width={22} height={22}/></span>
              <h2 className={styles.emptyTitle}>Уведомления временно не загрузились</h2>
              <p className={styles.emptyText}>{loadError}</p>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => {
                  setLoading(true)
                  void loadNotifications(true)
                }}
              >
                Повторить
              </button>
            </div>
          </section>
        ) : notifications.length === 0 ? (
          <section className={styles.panel}>
            <div className={styles.empty}>
              <span className={styles.emptyIcon}><UiIcon name="bell" width={22} height={22}/></span>
              <h2 className={styles.emptyTitle}>Уведомлений пока нет</h2>
              <p className={styles.emptyText}>Здесь появятся важные события по профилю, сообщениям и сделкам.</p>
            </div>
          </section>
        ) : (
          <section className={styles.notificationList}>
            {notifications.map(notification => {
              const href = getNotificationHref(
                notification.type,
                notification.data,
                userRole,
              )

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleClick(notification)}
                  className={`${styles.notification} ${styles.notificationClickable} ${!notification.read ? styles.notificationUnread : ''}`}
                >
                  <span className={styles.notificationIcon}>
                    <UiIcon name={ICONS[notification.type] || 'bell'} width={18} height={18}/>
                  </span>
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
