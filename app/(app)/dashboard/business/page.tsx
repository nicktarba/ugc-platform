'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import LoadingScreen from '@/components/LoadingScreen'
import UiIcon from '@/components/UiIcon'
import { truncate, formatRelative, formatDate } from '@/lib/format'
import { businessStatusLabel } from '@/lib/status'
import { OPEN_STATUSES, type BusinessRequest as Req } from '@/lib/types'
import { useApp } from '../../AppContext'
import styles from '../dashboard.module.css'

export default function BusinessDashboard() {
  const { userId, bumpBadge, businessProfile } = useApp()
  const toast = useToast()
  const [requests, setRequests] = useState<Req[]>([])
  const [reqTab, setReqTab] = useState<'active'|'history'|'all'>('active')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [loading, setLoading] = useState(true)

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
  const companyName = businessProfile?.company_name || 'Ваш бизнес'
  const profileIncomplete = businessProfile && (!businessProfile.company_name || !businessProfile.inn)

  if (loading) return <LoadingScreen />

  const shown = reqTab === 'active' ? activeRequests : reqTab === 'history' ? historyRequests : requests

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div className={styles.headerCopy}>
            <div className={styles.eyebrow}>Кабинет бизнеса</div>
            <h1 className={styles.title}>{companyName}</h1>
            <p className={styles.subtitle}>Ищите авторов, обсуждайте задачи и контролируйте все сотрудничества в одном месте.</p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/catalog" className={styles.buttonPrimary}><UiIcon name="search" width={16} height={16}/>Найти автора</Link>
            <Link href="/dashboard/business/profile" className={styles.buttonSecondary}><UiIcon name="building" width={16} height={16}/>Профиль</Link>
          </div>
        </header>

        {profileIncomplete && (
          <div className={styles.alert}>
            <div className={styles.alertMain}>
              <span className={styles.alertIcon}><UiIcon name="building" width={18} height={18}/></span>
              <span>Заполните название компании и ИНН, чтобы отправлять предложения авторам.</span>
            </div>
            <Link href="/dashboard/business/profile" className={styles.buttonPrimary}>Заполнить профиль</Link>
          </div>
        )}

        <section className={styles.metrics} aria-label="Статистика кабинета">
          <div className={styles.metric}>
            <div className={styles.metricTop}><span className={styles.metricIcon}><UiIcon name="briefcase" width={17} height={17}/></span></div>
            <div className={styles.metricValue}>{activeRequests.length}</div>
            <div className={styles.metricLabel}>активных запросов и сделок</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricTop}><span className={styles.metricIcon}><UiIcon name="message" width={17} height={17}/></span>{totalUnread > 0 && <span className={styles.metricDelta}>Новые сообщения</span>}</div>
            <div className={styles.metricValue}>{totalUnread}</div>
            <div className={styles.metricLabel}>непрочитанных сообщений</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricTop}><span className={styles.metricIcon}><UiIcon name="heart" width={17} height={17}/></span></div>
            <div className={styles.metricValue}>{favoritesCount}</div>
            <div className={styles.metricLabel}>авторов в избранном</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricTop}><span className={styles.metricIcon}><UiIcon name="check" width={17} height={17}/></span></div>
            <div className={styles.metricValue}>{historyRequests.length}</div>
            <div className={styles.metricLabel}>завершённых и архивных</div>
          </div>
        </section>

        <section className={styles.quickGrid}>
          <article className={styles.quickCard}>
            <span className={styles.quickIcon}><UiIcon name="search" width={20} height={20}/></span>
            <h2 className={styles.quickTitle}>Найдите подходящего автора</h2>
            <p className={styles.quickText}>Используйте обычный поиск или ИИ-подбор, фильтры по городу, тематике и аудитории.</p>
            <Link href="/catalog" className={styles.quickLink}>Открыть каталог <UiIcon name="arrowRight" width={14} height={14}/></Link>
          </article>
          <article className={styles.quickCard}>
            <span className={styles.quickIcon}><UiIcon name="heart" width={20} height={20}/></span>
            <h2 className={styles.quickTitle}>Соберите свой шортлист</h2>
            <p className={styles.quickText}>Сохраняйте интересных авторов и возвращайтесь к ним, когда появится подходящая задача.</p>
            <Link href="/dashboard/business/favorites" className={styles.quickLink}>Открыть избранное <UiIcon name="arrowRight" width={14} height={14}/></Link>
          </article>
        </section>

        {requests.length === 0 && favoritesCount === 0 && (
          <section className={styles.onboarding}>
            <div>
              <div className={styles.eyebrow}>Первое сотрудничество</div>
              <h2 className={styles.onboardingTitle}>От поиска автора до договорённости — в одном интерфейсе</h2>
              <p className={styles.onboardingText}>Начните с каталога, отправьте предложение и продолжите обсуждение в чате. Все статусы сохраняются в кабинете.</p>
              <Link href="/catalog" className={styles.buttonPrimary} style={{ marginTop: 18 }}>Открыть каталог</Link>
            </div>
            <div className={styles.steps}>
              {['Выберите автора по задаче', 'Отправьте предложение и бюджет', 'Обсудите детали в чате', 'Завершите сделку и оставьте отзыв'].map((text, i) => (
                <div className={styles.step} key={text}><span className={styles.stepNumber}>{i + 1}</span>{text}</div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Сделки и запросы {totalUnread > 0 && <span className={styles.badge}>{totalUnread}</span>}</h2>
              <div className={styles.panelMeta}>{requests.length ? `${requests.length} всего` : 'Здесь появятся ваши предложения авторам'}</div>
            </div>
            {requests.length > 0 && (
              <div className={styles.tabs}>
                {[{key:'active' as const, label:'Активные'}, {key:'history' as const, label:'Завершённые'}, {key:'all' as const, label:'Все'}].map(t => (
                  <button key={t.key} type="button" onClick={() => setReqTab(t.key)} className={`${styles.tab} ${reqTab === t.key ? styles.tabActive : ''}`}>{t.label}</button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.panelBody}>
            {shown.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><UiIcon name="message" width={22} height={22}/></span>
                <h3 className={styles.emptyTitle}>{requests.length === 0 ? 'Запросов пока нет' : reqTab === 'active' ? 'Нет активных запросов' : 'Нет завершённых запросов'}</h3>
                <p className={styles.emptyText}>Откройте каталог, выберите автора и расскажите о задаче. Диалог и статус сотрудничества появятся здесь.</p>
                {requests.length === 0 && <div className={styles.emptyActions}><Link href="/catalog" className={styles.buttonPrimary}>Найти автора</Link></div>}
              </div>
            ) : (
              <div className={styles.list}>
                {shown.map(r => {
                  const s = businessStatusLabel(r.status)
                  const unread = unreadCounts[r.id] || 0
                  return (
                    <Link key={r.id} href={`/dashboard/chat/${r.id}`} className={`${styles.requestCard} ${unread > 0 ? styles.requestUnread : ''}`}>
                      <div className={styles.requestTop}>
                        <div className={styles.requestIdentity}>
                          <div className={styles.requestName}>{r.authors?.name || 'Автор'}</div>
                          {r.authors?.city && <div className={styles.requestLocation}>{r.authors.city}</div>}
                        </div>
                        <div className={styles.requestBadges}>
                          {unread > 0 && <span className={styles.badge}>{unread}</span>}
                          <span className={styles.status} style={{ background: s.bg, color: s.color }}>{s.text}</span>
                        </div>
                      </div>
                      <p className={styles.requestMessage}>{truncate(r.message)}</p>
                      <div className={styles.requestBottom}>
                        <div className={styles.requestFacts}>
                          {r.budget && <span className={styles.requestFact}><UiIcon name="wallet" width={13} height={13}/>{r.budget}</span>}
                          {r.deadline && <span className={styles.requestFact}><UiIcon name="calendar" width={13} height={13}/>{formatDate(r.deadline)}</span>}
                        </div>
                        <span>{formatRelative(r.created_at)}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
