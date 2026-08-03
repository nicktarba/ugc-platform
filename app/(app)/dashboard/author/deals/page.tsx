'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import { useToast } from '@/components/Toast'
import UiIcon from '@/components/UiIcon'
import { truncate, formatRelative, formatDate } from '@/lib/format'
import { authorStatusBadge } from '@/lib/status'
import { OPEN_STATUSES, type AuthorRequest as Req } from '@/lib/types'
import { useApp } from '../../../AppContext'
import styles from '../../dashboard.module.css'

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
  }, [profile, bumpBadge, userId])

  const markViewed = async (id: string, status: string) => {
    if (status === 'new') {
      const { error } = await supabase.from('requests').update({ status: 'viewed' }).eq('id', id)
      if (error) { toast.error('Не удалось обновить статус заявки.'); return }
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'viewed' } : r))
    }
  }

  const newRequestIds = new Set(requests.filter(r => r.status === 'new').map(r => r.id))
  const newRequestsCount = newRequestIds.size
  const totalUnread = Object.entries(unreadCounts).filter(([reqId]) => !newRequestIds.has(reqId)).reduce((sum, [, count]) => sum + count, 0)
  const badgeCount = totalUnread + newRequestsCount
  const OPEN: string[] = OPEN_STATUSES
  const historyRequests = requests.filter(r => !OPEN.includes(r.status))
  const deals = requests.filter(r => r.status === 'accepted')
  const incoming = requests.filter(r => r.status === 'new' || r.status === 'viewed')

  if (loading) return <LoadingScreen />

  const renderRequest = (r: Req, mode: 'accepted' | 'incoming' | 'history') => {
    const unread = unreadCounts[r.id] || 0
    const badge = mode === 'history' ? authorStatusBadge(r.status) : null
    const className = [styles.requestCard, unread > 0 || r.status === 'new' ? styles.requestUnread : '', mode === 'accepted' ? styles.requestAccepted : '', mode === 'history' ? styles.requestHistory : ''].filter(Boolean).join(' ')
    return (
      <Link key={r.id} href={`/dashboard/chat/${r.id}`} onClick={() => mode === 'incoming' && markViewed(r.id, r.status)} className={className}>
        <div className={styles.requestTop}>
          <div className={styles.requestIdentity}>
            <div className={styles.requestName}>{businessNames[r.business_id] || r.business_email}</div>
            <div className={styles.requestLocation}>{mode === 'accepted' ? 'Активное сотрудничество' : mode === 'incoming' ? 'Новое предложение' : 'История сотрудничества'}</div>
          </div>
          <div className={styles.requestBadges}>
            {unread > 0 && <span className={styles.badge}>{unread}</span>}
            {mode === 'accepted' && <span className={styles.status} style={{ background:'#e8f7ef', color:'#26754f' }}>В работе</span>}
            {mode === 'incoming' && r.status === 'new' && unread === 0 && <span className={styles.status} style={{ background:'var(--app-accent)', color:'#fff' }}>Новое</span>}
            {badge && <span className={styles.status} style={{ background:badge.bg, color:badge.color }}>{badge.text}</span>}
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
  }

  return (
    <main className={styles.page}>
      <div className={`${styles.container} ${styles.narrow}`}>
        <header className={styles.pageHeader}>
          <div className={styles.headerCopy}>
            <div className={styles.eyebrow}>Работа с брендами</div>
            <h1 className={styles.title}>Сделки {badgeCount > 0 && <span className={styles.badge}>{badgeCount}</span>}</h1>
            <p className={styles.subtitle}>Новые предложения, активная работа и завершённые сотрудничества в одном списке.</p>
          </div>
          <div className={styles.headerActions}><Link href="/dashboard/author/profile" className={styles.buttonSecondary}><UiIcon name="user" width={16} height={16}/>Мой профиль</Link></div>
        </header>

        {!profile ? (
          <section className={styles.panel}>
            <div className={styles.empty}>
              <span className={styles.emptyIcon}><UiIcon name="user" width={22} height={22}/></span>
              <h2 className={styles.emptyTitle}>Сначала заполните анкету автора</h2>
              <p className={styles.emptyText}>После создания профиля вы сможете получать предложения и обсуждать сотрудничества.</p>
              <div className={styles.emptyActions}><Link href="/dashboard/author/profile" className={styles.buttonPrimary}>Заполнить анкету</Link></div>
            </div>
          </section>
        ) : requests.length === 0 ? (
          <section className={styles.panel}>
            <div className={styles.empty}>
              <span className={styles.emptyIcon}><UiIcon name="message" width={22} height={22}/></span>
              <h2 className={styles.emptyTitle}>Предложений пока нет</h2>
              <p className={styles.emptyText}>Когда бизнес отправит вам предложение, оно появится здесь. Заполненный профиль и прямая ссылка помогают получить первые обращения быстрее.</p>
              <div className={styles.emptyActions}>
                <Link href="/dashboard/author/profile" className={styles.buttonSecondary}>Проверить профиль</Link>
                {profile.status === 'approved' && <Link href={`/author/${profile.id}`} className={styles.buttonPrimary}>Открыть профиль</Link>}
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Все сотрудничества</h2>
                <div className={styles.panelMeta}>{requests.length} всего · {deals.length} в работе · {incoming.length} новых</div>
              </div>
            </div>
            <div className={styles.panelBody}>
              {deals.length > 0 && <div className={styles.listSection}><div className={styles.sectionLabel}>В работе · {deals.length}</div><div className={styles.list}>{deals.map(r => renderRequest(r, 'accepted'))}</div></div>}
              {incoming.length > 0 && <div className={styles.listSection}><div className={styles.sectionLabel}>Новые запросы · {incoming.length}</div><div className={styles.list}>{incoming.map(r => renderRequest(r, 'incoming'))}</div></div>}
              {deals.length === 0 && incoming.length === 0 && <div className={styles.empty}><h3 className={styles.emptyTitle}>Нет активных запросов</h3><p className={styles.emptyText}>Завершённые сотрудничества доступны в истории ниже.</p></div>}
              {historyRequests.length > 0 && (
                <div className={styles.listSection}>
                  <button type="button" onClick={() => setShowHistory(!showHistory)} className={styles.buttonGhost} style={{ width:'100%' }}>{showHistory ? 'Скрыть историю' : `Показать историю (${historyRequests.length})`}</button>
                  {showHistory && <div className={styles.list} style={{ marginTop: 10 }}>{historyRequests.map(r => renderRequest(r, 'history'))}</div>}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
