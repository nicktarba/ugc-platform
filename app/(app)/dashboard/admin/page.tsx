'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminClientError } from '@/lib/admin/client'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import LoadingScreen from '@/components/LoadingScreen'
import UiIcon from '@/components/UiIcon'
import styles from './admin.module.css'

type Tab = 'overview' | 'users' | 'authors' | 'deals' | 'complaints' | 'audit'

type SecurityInfo = { aal: 'aal1' | 'aal2'; mfaRequired: boolean }

type Overview = {
  ok: true
  security: SecurityInfo
  metrics: {
    users: number
    authors: number
    businesses: number
    registrationsToday: number
    registrations7d: number
    registrations30d: number
    pendingAuthors: number
    testAuthors: number
    deals: number
    activeDeals: number
    completedDeals: number
    newComplaints: number
    profileViews30d: number
  }
  registrationSeries: { date: string; count: number }[]
  dealStatuses: { status: string; count: number }[]
  recentUsers: { id: string; email: string; role: string; created_at: string }[]
  recentComplaints: { id: string; reason: string; status: string; created_at: string }[]
}

type UserItem = {
  id: string
  email: string
  role: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  banned_until: string | null
  is_blocked: boolean
  author: { id: string; name: string; city: string; status: string } | null
  business: {
    company_name: string | null
    niche: string | null
    website_url: string | null
    description: string | null
    inn: string | null
    avatar_url: string | null
  } | null
  deals_count: number
  active_deals_count: number
  notes_count: number
}

type AuthorItem = {
  id: string
  user_id: string | null
  email: string | null
  name: string
  city: string
  instagram_url: string
  telegram_url: string | null
  followers_count: number
  telegram_followers: number
  stories_views: number
  occupation: string | null
  lifestyle: string[] | null
  hobbies: string | null
  bio: string | null
  open_to_barter: boolean
  status: string
  rejection_reason: string | null
  avatar_url: string | null
  completed_deals_count: number
  avg_rating: number | null
  reviews_count: number
  created_at: string
  is_test: boolean
  profile_views: number
  deal_stats: { total: number; active: number; completed: number }
}

type DealItem = {
  id: string
  business_id: string
  business_email: string | null
  author_id: string
  message: string
  budget: string | null
  deadline: string | null
  status: string
  created_at: string
  author: { id: string; name: string; city: string; is_test: boolean } | null
  business: { id: string; name: string; email: string | null }
  messages_count: number
  last_message_at: string | null
  complaints_count: number
}

type ComplaintItem = {
  id: string
  reporter_id: string
  target_author_id: string | null
  target_business_id: string | null
  request_id: string | null
  reason: string
  comment: string | null
  status: string
  admin_note: string | null
  assigned_admin_id: string | null
  assigned_admin_email: string | null
  created_at: string
  updated_at: string | null
  reporter: { id: string; email: string; role: string } | null
  target_author: { id: string; name: string; city: string } | null
  target_business: { id: string; name: string } | null
  deal: { id: string; business_id: string; author_id: string; status: string } | null
}

type AuditItem = {
  id: string
  admin_id: string
  admin_email: string
  action: string
  entity_type: string
  entity_id: string | null
  reason: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

type NoteItem = {
  id: string
  note: string
  created_at: string
  created_by_email: string
}

type ListResponse<T> = { ok: true; items: T[]; total: number; security: SecurityInfo }

const STATUS_LABELS: Record<string, string> = {
  new: 'Новое',
  viewed: 'Просмотрено',
  accepted: 'В работе',
  declined: 'Отклонено',
  cancelled: 'Отменено',
  completed: 'Завершено',
  pending: 'На модерации',
  approved: 'Опубликован',
  rejected: 'Нужны исправления',
  reviewed: 'Рассмотрена',
  dismissed: 'Отклонена',
}

const ACTION_LABELS: Record<string, string> = {
  'author.update': 'Изменил профиль автора',
  'business.update': 'Изменил профиль бизнеса',
  'complaint.update': 'Обновил жалобу',
  'complaint.chat_open': 'Открыл переписку по жалобе',
  'user.block': 'Заблокировал пользователя',
  'user.unblock': 'Разблокировал пользователя',
  'note.create': 'Добавил внутреннюю заметку',
  'admin.mfa_enable': 'Включил обязательную двухфакторную защиту',
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return 'Нет данных'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Нет данных'
  return date.toLocaleString('ru-RU', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' })
}

function shortText(value: string | null | undefined, max = 120) {
  if (!value) return 'Не указано'
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function roleLabel(role: string) {
  return role === 'business' ? 'Бизнес' : role === 'author' ? 'Автор' : role === 'admin' ? 'Администратор' : role
}

function statusClass(status: string) {
  if (['approved', 'completed', 'reviewed'].includes(status)) return styles.statusSuccess
  if (['rejected', 'declined', 'cancelled', 'dismissed'].includes(status)) return styles.statusDanger
  if (['accepted', 'viewed'].includes(status)) return styles.statusInfo
  return styles.statusPending
}

export default function AdminDashboard() {
  const router = useRouter()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [denied, setDenied] = useState<string | null>(null)
  const [mfaGate, setMfaGate] = useState(false)
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false)
  const [security, setSecurity] = useState<SecurityInfo | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const [overview, setOverview] = useState<Overview | null>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [authors, setAuthors] = useState<AuthorItem[]>([])
  const [deals, setDeals] = useState<DealItem[]>([])
  const [complaints, setComplaints] = useState<ComplaintItem[]>([])
  const [audit, setAudit] = useState<AuditItem[]>([])

  const [editingAuthor, setEditingAuthor] = useState<AuthorItem | null>(null)
  const [editingBusiness, setEditingBusiness] = useState<UserItem | null>(null)
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null)
  const [chatReason, setChatReason] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender_name: string; sender_role: string; text: string; created_at: string }> | null>(null)
  const [userAction, setUserAction] = useState<{ user: UserItem; kind: 'block' | 'unblock' } | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [notesTarget, setNotesTarget] = useState<{ type: 'user' | 'author' | 'request' | 'complaint'; id: string; title: string } | null>(null)
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Не удалось загрузить данные.'
    if (error instanceof AdminClientError && error.code === 'MFA_REQUIRED') {
      setMfaGate(true)
      return
    }
    if (error instanceof AdminClientError && ['FORBIDDEN', 'ADMIN_NOT_CONFIGURED'].includes(error.code)) {
      setDenied(message)
      return
    }
    if (error instanceof AdminClientError && error.status === 401) {
      router.replace('/login?redirect=%2Fdashboard%2Fadmin')
      return
    }
    toast.error(message)
  }, [router, toast])

  const loadSection = useCallback(async (section: Tab, silent = false) => {
    if (!silent) setLoading(true)
    try {
      const query = new URLSearchParams({ section })
      if (section !== 'overview') {
        if (search.trim()) query.set('search', search.trim())
        if (filter !== 'all') {
          if (section === 'users') query.set('role', filter)
          else query.set('status', filter)
        }
      }

      if (section === 'overview') {
        const response = await adminFetch<Overview>(`/api/admin?${query}`)
        setOverview(response)
        setSecurity(response.security)
      } else if (section === 'users') {
        const response = await adminFetch<ListResponse<UserItem>>(`/api/admin?${query}`)
        setUsers(response.items)
        setSecurity(response.security)
      } else if (section === 'authors') {
        const response = await adminFetch<ListResponse<AuthorItem>>(`/api/admin?${query}`)
        setAuthors(response.items)
        setSecurity(response.security)
      } else if (section === 'deals') {
        const response = await adminFetch<ListResponse<DealItem>>(`/api/admin?${query}`)
        setDeals(response.items)
        setSecurity(response.security)
      } else if (section === 'complaints') {
        const response = await adminFetch<ListResponse<ComplaintItem>>(`/api/admin?${query}`)
        setComplaints(response.items)
        setSecurity(response.security)
      } else {
        const response = await adminFetch<ListResponse<AuditItem>>(`/api/admin?${query}`)
        setAudit(response.items)
        setSecurity(response.security)
      }
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter, handleError, search])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSection(tab), tab === 'overview' ? 0 : 250)
    return () => window.clearTimeout(timer)
  }, [tab, loadSection])

  useEffect(() => {
    setSearch('')
    setFilter('all')
  }, [tab])

  const refresh = () => {
    setRefreshing(true)
    void loadSection(tab, true)
  }

  const performAction = async (payload: Record<string, unknown>, successMessage: string) => {
    setSaving(true)
    try {
      await adminFetch('/api/admin/action', { method: 'POST', body: JSON.stringify(payload) })
      toast.success(successMessage)
      await loadSection(tab, true)
      return true
    } catch (error) {
      handleError(error)
      return false
    } finally {
      setSaving(false)
    }
  }

  const openNotes = async (target: { type: 'user' | 'author' | 'request' | 'complaint'; id: string; title: string }) => {
    setNotesTarget(target)
    setNewNote('')
    setNotes([])
    try {
      const response = await adminFetch<{ ok: true; items: NoteItem[] }>(`/api/admin?section=notes&targetType=${target.type}&targetId=${target.id}`)
      setNotes(response.items)
    } catch (error) {
      handleError(error)
    }
  }

  const addNote = async () => {
    if (!notesTarget || !newNote.trim()) return
    const ok = await performAction({ action: 'add_note', targetType: notesTarget.type, targetId: notesTarget.id, note: newNote.trim() }, 'Заметка добавлена')
    if (ok) await openNotes(notesTarget)
  }

  const openComplaintChat = async () => {
    if (!selectedComplaint || !chatReason.trim()) return
    setSaving(true)
    try {
      const response = await adminFetch<{ ok: true; messages: Array<{ id: string; sender_name: string; sender_role: string; text: string; created_at: string }> }>('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'open_complaint_chat', complaintId: selectedComplaint.id, reason: chatReason.trim() }),
      })
      setChatMessages(response.messages)
      toast.info('Доступ к переписке записан в журнал')
    } catch (error) {
      handleError(error)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  const tabs: Array<{ id: Tab; label: string; icon: Parameters<typeof UiIcon>[0]['name']; count?: number }> = [
    { id: 'overview', label: 'Обзор', icon: 'grid' },
    { id: 'users', label: 'Пользователи', icon: 'users', count: overview?.metrics.users },
    { id: 'authors', label: 'Авторы', icon: 'user', count: overview?.metrics.pendingAuthors },
    { id: 'deals', label: 'Сделки', icon: 'briefcase', count: overview?.metrics.activeDeals },
    { id: 'complaints', label: 'Жалобы', icon: 'flag', count: overview?.metrics.newComplaints },
    { id: 'audit', label: 'Журнал', icon: 'shield' },
  ]

  const filterOptions = useMemo(() => {
    if (tab === 'users') return [['all', 'Все роли'], ['author', 'Авторы'], ['business', 'Бизнес'], ['admin', 'Администраторы']]
    if (tab === 'authors') return [['all', 'Все статусы'], ['pending', 'На модерации'], ['approved', 'Опубликованы'], ['rejected', 'Нужны исправления']]
    if (tab === 'deals') return [['all', 'Все статусы'], ['new', 'Новые'], ['viewed', 'Просмотренные'], ['accepted', 'В работе'], ['completed', 'Завершённые'], ['cancelled', 'Отменённые'], ['declined', 'Отклонённые']]
    if (tab === 'complaints') return [['all', 'Все статусы'], ['new', 'Новые'], ['reviewed', 'Рассмотренные'], ['dismissed', 'Отклонённые']]
    return []
  }, [tab])

  if (loading && !overview && !denied && !mfaGate) return <LoadingScreen />

  if (mfaGate) {
    return (
      <main className={styles.page}>
        <MfaPanel
          gate
          onCancel={handleLogout}
          onVerified={() => {
            setMfaGate(false)
            setDenied(null)
            void loadSection('overview')
          }}
        />
      </main>
    )
  }

  if (denied) {
    return (
      <main className={styles.page}>
        <div className={styles.denied}>
          <div className={styles.deniedCard}>
            <div className={styles.deniedIcon}><UiIcon name="shield" width={25} height={25} /></div>
            <h1>Доступ закрыт</h1>
            <p>{denied}</p>
            <button type="button" className={styles.primaryButton} onClick={handleLogout}>Выйти из аккаунта</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.mobileBar}>
        <strong>СВОИ <span>UGC</span></strong>
        <button type="button" onClick={handleLogout} aria-label="Выйти"><UiIcon name="logout" width={18} height={18} /></button>
      </div>

      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Защищённая админ-CRM</div>
            <h1>Управление платформой</h1>
            <p>Регистрации, профили, сделки, жалобы и действия администраторов в одном месте.</p>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.securityBadge} ${security?.aal === 'aal2' ? styles.securityStrong : ''}`}
              onClick={() => security?.aal !== 'aal2' && setMfaSetupOpen(true)}
              disabled={security?.aal === 'aal2'}
            >
              <UiIcon name="shield" width={15} height={15} />
              {security?.aal === 'aal2'
                ? (security.mfaRequired ? '2FA обязателен' : '2FA подтверждён')
                : 'Включить двухфакторную защиту'}
            </button>
            <button type="button" className={styles.refreshButton} onClick={refresh} disabled={refreshing}>
              <UiIcon name="sliders" width={16} height={16} />
              {refreshing ? 'Обновляем…' : 'Обновить'}
            </button>
          </div>
        </header>

        <nav className={styles.tabs} aria-label="Разделы админ-панели">
          {tabs.map(item => (
            <button key={item.id} type="button" className={`${styles.tab} ${tab === item.id ? styles.tabActive : ''}`} onClick={() => setTab(item.id)}>
              <UiIcon name={item.icon} width={17} height={17} />
              <span>{item.label}</span>
              {!!item.count && item.count > 0 && <b>{item.count > 99 ? '99+' : item.count}</b>}
            </button>
          ))}
        </nav>

        {tab !== 'overview' && (
          <section className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <UiIcon name="search" width={17} height={17} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Поиск по текущему разделу" />
            </div>
            {!!filterOptions.length && (
              <select value={filter} onChange={event => setFilter(event.target.value)}>
                {filterOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            )}
          </section>
        )}

        {loading ? <SectionLoading /> : (
          <>
            {tab === 'overview' && overview && <OverviewSection data={overview} onTab={setTab} />}
            {tab === 'users' && <UsersSection users={users} onEditBusiness={setEditingBusiness} onAction={(user, kind) => { setUserAction({ user, kind }); setActionReason('') }} onNotes={user => void openNotes({ type: 'user', id: user.id, title: user.email })} />}
            {tab === 'authors' && <AuthorsSection authors={authors} onEdit={setEditingAuthor} onNotes={author => void openNotes({ type: 'author', id: author.id, title: author.name })} />}
            {tab === 'deals' && <DealsSection deals={deals} onNotes={deal => void openNotes({ type: 'request', id: deal.id, title: `${deal.business.name} → ${deal.author?.name || 'Автор'}` })} />}
            {tab === 'complaints' && <ComplaintsSection complaints={complaints} onOpen={item => { setSelectedComplaint(item); setChatReason(''); setChatMessages(null) }} onNotes={item => void openNotes({ type: 'complaint', id: item.id, title: item.reason })} />}
            {tab === 'audit' && <AuditSection items={audit} />}
          </>
        )}
      </div>

      {editingAuthor && (
        <AuthorModal
          author={editingAuthor}
          saving={saving}
          onClose={() => setEditingAuthor(null)}
          onSave={async fields => {
            const ok = await performAction({ action: 'update_author', authorId: editingAuthor.id, fields, reason: 'Редактирование из админ-CRM' }, 'Профиль автора сохранён')
            if (ok) setEditingAuthor(null)
          }}
        />
      )}

      {editingBusiness && (
        <BusinessModal
          user={editingBusiness}
          saving={saving}
          onClose={() => setEditingBusiness(null)}
          onSave={async fields => {
            const ok = await performAction({ action: 'update_business', userId: editingBusiness.id, fields, reason: 'Редактирование из админ-CRM' }, 'Профиль бизнеса сохранён')
            if (ok) setEditingBusiness(null)
          }}
        />
      )}

      {selectedComplaint && (
        <ComplaintModal
          item={selectedComplaint}
          saving={saving}
          chatReason={chatReason}
          setChatReason={setChatReason}
          messages={chatMessages}
          onClose={() => setSelectedComplaint(null)}
          onOpenChat={openComplaintChat}
          onUpdate={async (status, adminNote) => {
            const ok = await performAction({ action: 'update_complaint', complaintId: selectedComplaint.id, status, adminNote }, 'Жалоба обновлена')
            if (ok) setSelectedComplaint(null)
          }}
        />
      )}

      {userAction && (
        <ConfirmUserActionModal
          action={userAction}
          reason={actionReason}
          setReason={setActionReason}
          saving={saving}
          onClose={() => setUserAction(null)}
          onConfirm={async () => {
            const blocked = userAction.kind === 'block'
            const ok = await performAction({ action: blocked ? 'block_user' : 'unblock_user', userId: userAction.user.id, reason: actionReason.trim() || null }, blocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован')
            if (ok) setUserAction(null)
          }}
        />
      )}

      {notesTarget && (
        <NotesModal
          target={notesTarget}
          notes={notes}
          value={newNote}
          setValue={setNewNote}
          saving={saving}
          onClose={() => setNotesTarget(null)}
          onAdd={addNote}
        />
      )}

      {mfaSetupOpen && (
        <MfaPanel
          onCancel={() => setMfaSetupOpen(false)}
          onVerified={async () => {
            try {
              await adminFetch('/api/admin/action', {
                method: 'POST',
                body: JSON.stringify({ action: 'enable_admin_mfa' }),
              })
              toast.success('Двухфакторная защита включена и теперь обязательна')
              setMfaSetupOpen(false)
              await loadSection(tab, true)
            } catch (error) {
              handleError(error)
            }
          }}
        />
      )}
    </main>
  )
}

function OverviewSection({ data, onTab }: { data: Overview; onTab: (tab: Tab) => void }) {
  const metrics = [
    ['users', 'Пользователей', data.metrics.users, 'users'] as const,
    ['authors', 'Авторов', data.metrics.authors, 'user'] as const,
    ['businesses', 'Бизнесов', data.metrics.businesses, 'building'] as const,
    ['today', 'Регистраций сегодня', data.metrics.registrationsToday, 'calendar'] as const,
    ['week', 'Регистраций за 7 дней', data.metrics.registrations7d, 'calendar'] as const,
    ['pending', 'На модерации', data.metrics.pendingAuthors, 'shield'] as const,
    ['active', 'Активных сделок', data.metrics.activeDeals, 'briefcase'] as const,
    ['complaints', 'Новых жалоб', data.metrics.newComplaints, 'flag'] as const,
  ]
  const maxRegistration = Math.max(1, ...data.registrationSeries.map(item => item.count))
  const maxDeal = Math.max(1, ...data.dealStatuses.map(item => item.count))

  return (
    <div className={styles.sectionStack}>
      <section className={styles.metrics}>
        {metrics.map(([key, label, value, icon]) => (
          <article className={styles.metric} key={key}>
            <div className={styles.metricIcon}><UiIcon name={icon} width={18} height={18} /></div>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section className={styles.twoColumns}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span>Динамика</span><h2>Регистрации за 14 дней</h2></div><b>{data.metrics.registrations30d} за 30 дней</b></div>
          <div className={styles.chart}>
            {data.registrationSeries.map(item => (
              <div className={styles.chartColumn} key={item.date} title={`${item.date}: ${item.count}`}>
                <span>{item.count || ''}</span>
                <i style={{ height: `${Math.max(5, (item.count / maxRegistration) * 100)}%` }} />
                <small>{new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</small>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span>Воронка</span><h2>Статусы сделок</h2></div><b>{data.metrics.deals} всего</b></div>
          <div className={styles.barList}>
            {data.dealStatuses.map(item => (
              <div className={styles.barRow} key={item.status}>
                <span>{STATUS_LABELS[item.status] || item.status}</span>
                <div><i style={{ width: `${Math.max(3, (item.count / maxDeal) * 100)}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.twoColumns}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span>Последние</span><h2>Новые пользователи</h2></div><button onClick={() => onTab('users')}>Открыть список</button></div>
          <div className={styles.compactList}>
            {data.recentUsers.map(user => (
              <div key={user.id}><div className={styles.avatar}>{user.email?.[0]?.toUpperCase() || '?'}</div><span><strong>{user.email}</strong><small>{roleLabel(user.role)} · {formatDate(user.created_at)}</small></span></div>
            ))}
          </div>
        </article>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><span>Контроль</span><h2>Состояние платформы</h2></div></div>
          <div className={styles.healthList}>
            <div><span>Тестовые анкеты</span><strong>{data.metrics.testAuthors}</strong></div>
            <div><span>Завершённые сделки</span><strong>{data.metrics.completedDeals}</strong></div>
            <div><span>Просмотры профилей за 30 дней</span><strong>{data.metrics.profileViews30d}</strong></div>
            <div><span>Новые жалобы</span><strong>{data.metrics.newComplaints}</strong></div>
          </div>
        </article>
      </section>
    </div>
  )
}

function UsersSection({ users, onEditBusiness, onAction, onNotes }: { users: UserItem[]; onEditBusiness: (user: UserItem) => void; onAction: (user: UserItem, kind: 'block' | 'unblock') => void; onNotes: (user: UserItem) => void }) {
  if (!users.length) return <Empty title="Пользователи не найдены" text="Измените поиск или фильтр." />
  return (
    <section className={styles.list}>
      {users.map(user => (
        <article className={styles.userCard} key={user.id}>
          <div className={styles.avatar}>{user.email?.[0]?.toUpperCase() || '?'}</div>
          <div className={styles.cardMain}>
            <div className={styles.cardTitleRow}>
              <div><h2>{user.author?.name || user.business?.company_name || user.email}</h2><p>{user.email}</p></div>
              <div className={styles.badges}><span className={styles.roleBadge}>{roleLabel(user.role)}</span>{user.is_blocked && <span className={`${styles.status} ${styles.statusDanger}`}>Заблокирован</span>}</div>
            </div>
            <div className={styles.metaRow}>
              <span><UiIcon name="calendar" width={13} height={13} />Регистрация: {formatDate(user.created_at)}</span>
              <span><UiIcon name="logout" width={13} height={13} />Вход: {formatDate(user.last_sign_in_at, true)}</span>
              <span><UiIcon name="briefcase" width={13} height={13} />Сделок: {user.deals_count}</span>
              {user.author && <span><UiIcon name="pin" width={13} height={13} />{user.author.city}</span>}
            </div>
          </div>
          <div className={styles.cardActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => onNotes(user)}>Заметки{user.notes_count ? ` · ${user.notes_count}` : ''}</button>
            {user.role === 'business' && <button type="button" className={styles.secondaryButton} onClick={() => onEditBusiness(user)}>Редактировать</button>}
            {user.role !== 'admin' && <button type="button" className={user.is_blocked ? styles.primaryButton : styles.dangerButton} onClick={() => onAction(user, user.is_blocked ? 'unblock' : 'block')}>{user.is_blocked ? 'Разблокировать' : 'Заблокировать'}</button>}
          </div>
        </article>
      ))}
    </section>
  )
}

function AuthorsSection({ authors, onEdit, onNotes }: { authors: AuthorItem[]; onEdit: (author: AuthorItem) => void; onNotes: (author: AuthorItem) => void }) {
  if (!authors.length) return <Empty title="Авторы не найдены" text="Измените поиск или фильтр." />
  return (
    <section className={styles.cardGrid}>
      {authors.map(author => (
        <article className={styles.authorCard} key={author.id}>
          <div className={styles.authorTop}>
            <div className={styles.authorAvatar}>{author.avatar_url ? <img src={author.avatar_url} alt="" /> : author.name?.[0]?.toUpperCase()}</div>
            <div><h2>{author.name}</h2><p>{author.email || 'Тестовая анкета без аккаунта'}</p></div>
            <span className={`${styles.status} ${statusClass(author.status)}`}>{STATUS_LABELS[author.status] || author.status}</span>
          </div>
          <div className={styles.authorMeta}>
            <span><UiIcon name="pin" width={13} height={13} />{author.city}</span>
            <span><UiIcon name="users" width={13} height={13} />{author.followers_count.toLocaleString('ru-RU')}</span>
            <span><UiIcon name="eye" width={13} height={13} />{author.profile_views}</span>
            <span><UiIcon name="briefcase" width={13} height={13} />{author.deal_stats.total}</span>
          </div>
          <p className={styles.cardCopy}>{shortText(author.bio, 150)}</p>
          <div className={styles.tags}>{(author.lifestyle || []).slice(0, 5).map(tag => <span key={tag}>{tag}</span>)}</div>
          <div className={styles.cardActions}>
            <Link href={`/author/${author.id}`} target="_blank" className={styles.secondaryButton}>Открыть</Link>
            <button type="button" className={styles.secondaryButton} onClick={() => onNotes(author)}>Заметки</button>
            <button type="button" className={styles.primaryButton} onClick={() => onEdit(author)}>Редактировать</button>
          </div>
        </article>
      ))}
    </section>
  )
}

function DealsSection({ deals, onNotes }: { deals: DealItem[]; onNotes: (deal: DealItem) => void }) {
  if (!deals.length) return <Empty title="Сделки не найдены" text="Измените поиск или фильтр." />
  return (
    <section className={styles.list}>
      {deals.map(deal => (
        <article className={styles.dealCard} key={deal.id}>
          <div className={styles.dealParties}>
            <div><span>Бизнес</span><strong>{deal.business.name}</strong><small>{deal.business.email}</small></div>
            <UiIcon name="arrowRight" width={19} height={19} />
            <div><span>Автор</span><strong>{deal.author?.name || 'Автор удалён'}</strong><small>{deal.author?.city}{deal.author?.is_test ? ' · тестовый' : ''}</small></div>
          </div>
          <div className={styles.dealInfo}>
            <span className={`${styles.status} ${statusClass(deal.status)}`}>{STATUS_LABELS[deal.status] || deal.status}</span>
            <p>{shortText(deal.message, 180)}</p>
            <div className={styles.metaRow}><span>Бюджет: {deal.budget || 'не указан'}</span><span>Срок: {formatDate(deal.deadline)}</span><span>Сообщений: {deal.messages_count}</span><span>Жалоб: {deal.complaints_count}</span></div>
          </div>
          <div className={styles.cardActions}><button type="button" className={styles.secondaryButton} onClick={() => onNotes(deal)}>Внутренняя заметка</button></div>
        </article>
      ))}
    </section>
  )
}

function ComplaintsSection({ complaints, onOpen, onNotes }: { complaints: ComplaintItem[]; onOpen: (item: ComplaintItem) => void; onNotes: (item: ComplaintItem) => void }) {
  if (!complaints.length) return <Empty title="Жалобы не найдены" text="Новые обращения появятся здесь." />
  return (
    <section className={styles.list}>
      {complaints.map(item => (
        <article className={styles.complaintCard} key={item.id}>
          <div className={styles.complaintIcon}><UiIcon name="flag" width={18} height={18} /></div>
          <div className={styles.cardMain}>
            <div className={styles.cardTitleRow}><div><h2>{item.reason}</h2><p>{item.reporter?.email || 'Пользователь'}</p></div><span className={`${styles.status} ${statusClass(item.status)}`}>{STATUS_LABELS[item.status] || item.status}</span></div>
            <p className={styles.cardCopy}>{shortText(item.comment, 260)}</p>
            <div className={styles.metaRow}><span>На: {item.target_author?.name || item.target_business?.name || 'не указано'}</span><span>{formatDate(item.created_at, true)}</span><span>{item.request_id ? 'Есть связанная переписка' : 'Без переписки'}</span></div>
          </div>
          <div className={styles.cardActions}><button type="button" className={styles.secondaryButton} onClick={() => onNotes(item)}>Заметки</button><button type="button" className={styles.primaryButton} onClick={() => onOpen(item)}>Разобрать</button></div>
        </article>
      ))}
    </section>
  )
}

function AuditSection({ items }: { items: AuditItem[] }) {
  if (!items.length) return <Empty title="Журнал пока пуст" text="Здесь появятся административные действия." />
  return (
    <section className={styles.timeline}>
      {items.map(item => (
        <article key={item.id}>
          <div className={styles.timelineDot}><UiIcon name="shield" width={14} height={14} /></div>
          <div><div className={styles.timelineTop}><strong>{ACTION_LABELS[item.action] || item.action}</strong><time>{formatDate(item.created_at, true)}</time></div><p>{item.admin_email} · {item.entity_type}{item.entity_id ? ` · ${item.entity_id.slice(0, 8)}` : ''}</p>{item.reason && <blockquote>{item.reason}</blockquote>}</div>
        </article>
      ))}
    </section>
  )
}

function AuthorModal({ author, saving, onClose, onSave }: { author: AuthorItem; saving: boolean; onClose: () => void; onSave: (fields: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({
    name: author.name || '', city: author.city || '', instagram_url: author.instagram_url || '', telegram_url: author.telegram_url || '',
    followers_count: String(author.followers_count || 0), telegram_followers: String(author.telegram_followers || 0), stories_views: String(author.stories_views || 0),
    occupation: author.occupation || '', lifestyle: (author.lifestyle || []).join(', '), hobbies: author.hobbies || '', bio: author.bio || '',
    open_to_barter: author.open_to_barter, status: author.status, rejection_reason: author.rejection_reason || '',
  })
  return (
    <Modal title={`Редактирование: ${author.name}`} subtitle="Все изменения сохраняются в журнале администратора." onClose={onClose} wide>
      <div className={styles.formGrid}>
        <Field label="Имя"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Город"><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></Field>
        <Field label="Instagram"><input value={form.instagram_url} onChange={e => setForm({ ...form, instagram_url: e.target.value })} /></Field>
        <Field label="Telegram"><input value={form.telegram_url} onChange={e => setForm({ ...form, telegram_url: e.target.value })} /></Field>
        <Field label="Подписчики Instagram"><input type="number" min="0" value={form.followers_count} onChange={e => setForm({ ...form, followers_count: e.target.value })} /></Field>
        <Field label="Подписчики Telegram"><input type="number" min="0" value={form.telegram_followers} onChange={e => setForm({ ...form, telegram_followers: e.target.value })} /></Field>
        <Field label="Просмотры Stories"><input type="number" min="0" value={form.stories_views} onChange={e => setForm({ ...form, stories_views: e.target.value })} /></Field>
        <Field label="Занятие"><input value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} /></Field>
        <Field label="Тематики через запятую" full><input value={form.lifestyle} onChange={e => setForm({ ...form, lifestyle: e.target.value })} /></Field>
        <Field label="Интересы" full><textarea value={form.hobbies} onChange={e => setForm({ ...form, hobbies: e.target.value })} rows={2} /></Field>
        <Field label="О себе" full><textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={5} /></Field>
        <Field label="Статус"><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="pending">На модерации</option><option value="approved">Опубликован</option><option value="rejected">Нужны исправления</option></select></Field>
        <Field label="Причина отклонения"><input value={form.rejection_reason} onChange={e => setForm({ ...form, rejection_reason: e.target.value })} /></Field>
        <label className={styles.checkbox}><input type="checkbox" checked={form.open_to_barter} onChange={e => setForm({ ...form, open_to_barter: e.target.checked })} /><span>Готов к бартеру</span></label>
      </div>
      <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Отмена</button><button type="button" className={styles.primaryButton} disabled={saving} onClick={() => void onSave({ ...form, followers_count: Number(form.followers_count), telegram_followers: Number(form.telegram_followers), stories_views: Number(form.stories_views), lifestyle: form.lifestyle.split(',').map(v => v.trim()).filter(Boolean) })}>{saving ? 'Сохраняем…' : 'Сохранить'}</button></div>
    </Modal>
  )
}

function BusinessModal({ user, saving, onClose, onSave }: { user: UserItem; saving: boolean; onClose: () => void; onSave: (fields: Record<string, unknown>) => Promise<void> }) {
  const business = user.business
  const [form, setForm] = useState({ company_name: business?.company_name || '', niche: business?.niche || '', website_url: business?.website_url || '', inn: business?.inn || '', description: business?.description || '' })
  return (
    <Modal title={`Профиль бизнеса: ${user.email}`} subtitle="Изменения применятся к публичной визитке компании." onClose={onClose}>
      <div className={styles.formGrid}>
        <Field label="Название компании" full><input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></Field>
        <Field label="Ниша"><input value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} /></Field>
        <Field label="ИНН"><input value={form.inn} onChange={e => setForm({ ...form, inn: e.target.value })} /></Field>
        <Field label="Сайт" full><input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} /></Field>
        <Field label="Описание" full><textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
      </div>
      <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Отмена</button><button type="button" className={styles.primaryButton} disabled={saving} onClick={() => void onSave(form)}>{saving ? 'Сохраняем…' : 'Сохранить'}</button></div>
    </Modal>
  )
}

function ComplaintModal({ item, saving, chatReason, setChatReason, messages, onClose, onOpenChat, onUpdate }: { item: ComplaintItem; saving: boolean; chatReason: string; setChatReason: (value: string) => void; messages: Array<{ id: string; sender_name: string; sender_role: string; text: string; created_at: string }> | null; onClose: () => void; onOpenChat: () => Promise<void>; onUpdate: (status: string, note: string) => Promise<void> }) {
  const [status, setStatus] = useState(item.status)
  const [note, setNote] = useState(item.admin_note || '')
  return (
    <Modal title={item.reason} subtitle={`Жалоба от ${item.reporter?.email || 'пользователя'} · ${formatDate(item.created_at, true)}`} onClose={onClose} wide>
      <div className={styles.complaintDetail}><div><span>Комментарий пользователя</span><p>{item.comment || 'Комментарий не оставлен.'}</p></div><div><span>Объект жалобы</span><p>{item.target_author?.name || item.target_business?.name || 'Не указан'}</p></div></div>
      <div className={styles.formGrid}>
        <Field label="Статус"><select value={status} onChange={e => setStatus(e.target.value)}><option value="new">Новая</option><option value="reviewed">Рассмотрена</option><option value="dismissed">Отклонена</option></select></Field>
        <Field label="Внутренний комментарий" full><textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Что проверено и какое решение принято" /></Field>
      </div>
      {item.request_id && !messages && <div className={styles.sensitiveBox}><div><UiIcon name="shield" width={18} height={18} /><span><strong>Доступ к личной переписке</strong><small>Укажите причину. Просмотр будет записан в журнал.</small></span></div><textarea rows={2} value={chatReason} onChange={e => setChatReason(e.target.value)} placeholder="Например: проверка жалобы на нарушение договорённостей" /><button type="button" className={styles.secondaryButton} disabled={saving || chatReason.trim().length < 5} onClick={() => void onOpenChat()}>{saving ? 'Открываем…' : 'Открыть переписку'}</button></div>}
      {messages && <div className={styles.adminChat}><div className={styles.adminChatBanner}><UiIcon name="eye" width={16} height={16} />Просмотр открыт только в рамках этой жалобы и записан в журнал.</div>{messages.length ? messages.map(message => <div key={message.id} className={message.sender_role === 'author' ? styles.messageAuthor : styles.messageBusiness}><strong>{message.sender_name}</strong><p>{message.text}</p><time>{formatDate(message.created_at, true)}</time></div>) : <p>В переписке пока нет сообщений.</p>}</div>}
      <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Закрыть</button><button type="button" className={styles.primaryButton} disabled={saving} onClick={() => void onUpdate(status, note)}>{saving ? 'Сохраняем…' : 'Сохранить решение'}</button></div>
    </Modal>
  )
}

function ConfirmUserActionModal({ action, reason, setReason, saving, onClose, onConfirm }: { action: { user: UserItem; kind: 'block' | 'unblock' }; reason: string; setReason: (value: string) => void; saving: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
  const isBlock = action.kind === 'block'
  return (
    <Modal title={isBlock ? 'Заблокировать пользователя?' : 'Разблокировать пользователя?'} subtitle={action.user.email} onClose={onClose}>
      <p className={styles.modalCopy}>{isBlock ? 'Пользователь потеряет возможность входить в аккаунт. Данные и история сделок сохранятся.' : 'Пользователь снова сможет войти в аккаунт.'}</p>
      <Field label={isBlock ? 'Причина блокировки' : 'Комментарий'} full><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder={isBlock ? 'Причина обязательна и попадёт в журнал' : 'Необязательно'} /></Field>
      <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Отмена</button><button type="button" className={isBlock ? styles.dangerButton : styles.primaryButton} disabled={saving || (isBlock && reason.trim().length < 2)} onClick={() => void onConfirm()}>{saving ? 'Выполняем…' : isBlock ? 'Заблокировать' : 'Разблокировать'}</button></div>
    </Modal>
  )
}

function NotesModal({ target, notes, value, setValue, saving, onClose, onAdd }: { target: { title: string }; notes: NoteItem[]; value: string; setValue: (value: string) => void; saving: boolean; onClose: () => void; onAdd: () => Promise<void> }) {
  return (
    <Modal title="Внутренние заметки" subtitle={target.title} onClose={onClose}>
      <div className={styles.notesList}>{notes.length ? notes.map(note => <article key={note.id}><p>{note.note}</p><small>{note.created_by_email} · {formatDate(note.created_at, true)}</small></article>) : <p className={styles.muted}>Заметок пока нет.</p>}</div>
      <Field label="Новая заметка" full><textarea rows={3} value={value} onChange={e => setValue(e.target.value)} placeholder="Видна только администраторам" /></Field>
      <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={onClose}>Закрыть</button><button type="button" className={styles.primaryButton} disabled={saving || !value.trim()} onClick={() => void onAdd()}>{saving ? 'Добавляем…' : 'Добавить заметку'}</button></div>
    </Modal>
  )
}

function MfaPanel({ gate = false, onCancel, onVerified }: { gate?: boolean; onCancel: () => void | Promise<void>; onVerified: () => void | Promise<void> }) {
  const [loading, setLoading] = useState(true)
  const [factorId, setFactorId] = useState('')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    let active = true
    const prepare = async () => {
      setLoading(true)
      setError(null)
      const { data, error: listError } = await supabase.auth.mfa.listFactors()
      if (!active) return
      if (listError) {
        setError(listError.message || 'Не удалось проверить второй фактор.')
        setLoading(false)
        return
      }

      const verified = data.totp.find(item => item.status === 'verified')
      if (verified) {
        setFactorId(verified.id)
        setLoading(false)
        return
      }

      for (const item of data.totp.filter(item => item.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: item.id })
      }

      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'СВОИ UGC Admin',
      })
      if (!active) return
      if (enrollError || !enrolled) {
        setError(enrollError?.message || 'Не удалось создать второй фактор.')
        setLoading(false)
        return
      }

      setFactorId(enrolled.id)
      setQrCode(enrolled.totp.qr_code)
      setSecret(enrolled.totp.secret)
      setLoading(false)
    }
    void prepare()
    return () => { active = false }
  }, [])

  const verify = async () => {
    if (!factorId || code.trim().length < 6) return
    setVerifying(true)
    setError(null)
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setError(challengeError?.message || 'Не удалось создать проверку кода.')
      setVerifying(false)
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    })
    if (verifyError) {
      setError('Код не подошёл. Проверьте время на телефоне и попробуйте снова.')
      setVerifying(false)
      return
    }
    await supabase.auth.refreshSession()
    setVerifying(false)
    await onVerified()
  }

  const content = (
    <div className={styles.mfaContent}>
      <div className={styles.mfaIcon}><UiIcon name="shield" width={26} height={26} /></div>
      <h2>{gate ? 'Подтвердите вход' : 'Включите двухфакторную защиту'}</h2>
      <p>{qrCode
        ? 'Отсканируйте QR-код в Google Authenticator, 1Password или другом приложении, затем введите шестизначный код.'
        : 'Введите актуальный шестизначный код из приложения-аутентификатора.'}</p>
      {loading ? <div className={styles.mfaLoading}>Подготавливаем защищённый вход…</div> : (
        <>
          {qrCode && <div className={styles.qrWrap}><img src={qrCode} alt="QR-код для подключения двухфакторной защиты" />{secret && <small>Резервный ключ: <code>{secret}</code></small>}</div>}
          <label className={styles.mfaCode}><span>Код из приложения</span><input inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="000000" /></label>
          {error && <div className={styles.mfaError}>{error}</div>}
          <div className={styles.modalActions}><button type="button" className={styles.secondaryButton} onClick={() => void onCancel()}>{gate ? 'Выйти' : 'Отмена'}</button><button type="button" className={styles.primaryButton} disabled={verifying || code.trim().length < 6} onClick={() => void verify()}>{verifying ? 'Проверяем…' : 'Подтвердить'}</button></div>
        </>
      )}
    </div>
  )

  if (gate) return <div className={styles.mfaGate}>{content}</div>
  return <div className={styles.overlay} onMouseDown={() => void onCancel()}><div className={styles.modal} onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true">{content}</div></div>
}

function Modal({ title, subtitle, onClose, wide = false, children }: { title: string; subtitle?: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return <div className={styles.overlay} onMouseDown={onClose}><div className={`${styles.modal} ${wide ? styles.modalWide : ''}`} onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true"><div className={styles.modalHeader}><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Закрыть"><UiIcon name="close" width={18} height={18} /></button></div>{children}</div></div>
}

function Field({ label, full = false, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`${styles.field} ${full ? styles.fieldFull : ''}`}><span>{label}</span>{children}</label>
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className={styles.empty}><div><UiIcon name="search" width={22} height={22} /></div><h2>{title}</h2><p>{text}</p></div>
}

function SectionLoading() {
  return <div className={styles.sectionLoading}><span /><span /><span /></div>
}
