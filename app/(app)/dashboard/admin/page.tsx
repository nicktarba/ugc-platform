'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import LoadingScreen from '@/components/LoadingScreen'
import UiIcon from '@/components/UiIcon'
import styles from './admin.module.css'

type Author = {
  id: string
  user_id: string | null
  name: string
  city: string
  instagram_url: string | null
  telegram_url: string | null
  followers_count: number
  stories_views: number
  occupation: string | null
  lifestyle: string[] | null
  hobbies: string | null
  bio: string | null
  open_to_barter: boolean
  status: string
  rejection_reason: string | null
  avatar_url: string | null
  created_at: string
}

type UserProfile = { id: string; email: string; role: string; created_at: string }

type Complaint = {
  id: string
  reporter_id: string
  target_author_id: string | null
  target_business_id: string | null
  reason: string
  comment: string | null
  status: string
  created_at: string
}

type Tab = 'pending' | 'authors' | 'users' | 'complaints'

const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU', {
  day: 'numeric', month: 'short', year: 'numeric',
})

const shortNumber = (value: number) => new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)

export default function AdminDashboard() {
  const router = useRouter()
  const toast = useToast()
  const [authors, setAuthors] = useState<Author[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [tab, setTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadData = useCallback(async () => {
    const [authorsResult, usersResult, complaintsResult] = await Promise.all([
      supabase.from('authors').select('id, user_id, name, city, instagram_url, telegram_url, followers_count, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, status, rejection_reason, avatar_url, created_at').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, email, role, created_at').order('created_at', { ascending: false }),
      supabase.from('complaints').select('id, reporter_id, target_author_id, target_business_id, reason, comment, status, created_at').order('created_at', { ascending: false }),
    ])

    if (authorsResult.error) throw authorsResult.error
    if (usersResult.error) throw usersResult.error

    setAuthors((authorsResult.data as Author[]) || [])
    setUsers((usersResult.data as UserProfile[]) || [])
    setComplaints(complaintsResult.error ? [] : ((complaintsResult.data as Complaint[]) || []))
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace('/login?redirect=%2Fdashboard%2Fadmin')
        return
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      if (profile?.role !== 'admin') {
        setDenied(true)
        setLoading(false)
        return
      }

      try {
        await loadData()
      } catch {
        toast.error('Не удалось загрузить данные админки.')
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [loadData, router, toast])

  const refresh = async () => {
    setRefreshing(true)
    try {
      await loadData()
      toast.success('Данные обновлены')
    } catch {
      toast.error('Не удалось обновить данные.')
    } finally {
      setRefreshing(false)
    }
  }

  const updateAuthorStatus = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
    const update: { status: string; rejection_reason: string | null } = {
      status,
      rejection_reason: status === 'rejected' ? (reason || null) : null,
    }
    const { error } = await supabase.from('authors').update(update).eq('id', id)
    if (error) {
      toast.error('Не удалось изменить статус анкеты.')
      return
    }
    setAuthors(current => current.map(author => author.id === id ? { ...author, ...update } : author))
    toast.success(status === 'approved' ? 'Анкета опубликована' : 'Анкета отправлена на исправление')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/')
  }

  const updateComplaintStatus = async (id: string, status: 'reviewed' | 'dismissed') => {
    const { error } = await supabase.from('complaints').update({ status }).eq('id', id)
    if (error) {
      toast.error('Не удалось изменить статус жалобы.')
      return
    }
    setComplaints(current => current.map(item => item.id === id ? { ...item, status } : item))
    toast.success(status === 'reviewed' ? 'Жалоба отмечена как рассмотренная' : 'Жалоба отклонена')
  }

  const emailById = useMemo(() => Object.fromEntries(users.map(user => [user.id, user.email])), [users])
  const authorById = useMemo(() => Object.fromEntries(authors.map(author => [author.id, author])), [authors])
  const pending = useMemo(() => authors.filter(author => author.status === 'pending'), [authors])
  const newComplaints = useMemo(() => complaints.filter(item => item.status === 'new'), [complaints])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredAuthors = useMemo(() => authors.filter(author => {
    if (!normalizedSearch) return true
    return [author.name, author.city, author.instagram_url, author.occupation, author.bio]
      .some(value => value?.toLowerCase().includes(normalizedSearch))
  }), [authors, normalizedSearch])
  const filteredUsers = useMemo(() => users.filter(user => !normalizedSearch || `${user.email} ${user.role}`.toLowerCase().includes(normalizedSearch)), [users, normalizedSearch])
  const filteredComplaints = useMemo(() => complaints.filter(item => !normalizedSearch || `${item.reason} ${item.comment || ''} ${emailById[item.reporter_id] || ''}`.toLowerCase().includes(normalizedSearch)), [complaints, emailById, normalizedSearch])

  if (loading) return <LoadingScreen />

  if (denied) {
    return (
      <main className={styles.page}>
        <div className={styles.denied}>
          <div className={styles.deniedCard}>
            <div className={styles.deniedIcon}><UiIcon name="shield" width={24} height={24} /></div>
            <h1 className={styles.deniedTitle}>Доступ закрыт</h1>
            <p className={styles.deniedText}>Эта страница доступна только аккаунту администратора.</p>
            <Link href="/" className={styles.primaryButton}>Вернуться на главную</Link>
          </div>
        </div>
      </main>
    )
  }

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: 'pending', label: 'На модерации', count: pending.length },
    { value: 'authors', label: 'Все авторы', count: authors.length },
    { value: 'users', label: 'Пользователи', count: users.length },
    { value: 'complaints', label: 'Жалобы', count: newComplaints.length },
  ]

  const currentAuthors = tab === 'pending'
    ? filteredAuthors.filter(author => author.status === 'pending')
    : filteredAuthors

  return (
    <main className={styles.page}>
      <div className={styles.mobileBar}>
        <Link href="/dashboard/admin" className={styles.mobileBrand}>СВОИ <span>UGC</span></Link>
        <div className={styles.mobileActions}>
          <Link href="/catalog" className={styles.mobileAction} aria-label="Каталог авторов"><UiIcon name="search" width={18} height={18} /></Link>
          <button type="button" className={styles.mobileAction} onClick={handleLogout} aria-label="Выйти"><UiIcon name="logout" width={18} height={18} /></button>
        </div>
      </div>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Администрирование</div>
            <h1 className={styles.title}>Управление платформой</h1>
            <p className={styles.subtitle}>Проверяйте анкеты авторов, пользователей и обращения. Все действия применяются сразу.</p>
          </div>
          <button type="button" className={styles.refreshButton} onClick={refresh} disabled={refreshing}>
            <UiIcon name="sliders" width={16} height={16} />
            {refreshing ? 'Обновляем…' : 'Обновить данные'}
          </button>
        </header>

        <section className={styles.metrics} aria-label="Статистика платформы">
          <div className={styles.metric}>
            <div className={styles.metricIcon}><UiIcon name="users" width={17} height={17} /></div>
            <div className={styles.metricValue}>{authors.length}</div>
            <div className={styles.metricLabel}>анкет авторов</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricIcon}><UiIcon name="shield" width={17} height={17} /></div>
            <div className={styles.metricValue}>{pending.length}</div>
            <div className={styles.metricLabel}>ожидают модерации</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricIcon}><UiIcon name="building" width={17} height={17} /></div>
            <div className={styles.metricValue}>{users.filter(user => user.role === 'business').length}</div>
            <div className={styles.metricLabel}>аккаунтов бизнеса</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricIcon}><UiIcon name="flag" width={17} height={17} /></div>
            <div className={styles.metricValue}>{newComplaints.length}</div>
            <div className={styles.metricLabel}>новых жалоб</div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div className={styles.tabs} role="tablist" aria-label="Разделы админки">
              {tabs.map(item => (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.value}
                  className={`${styles.tab} ${tab === item.value ? styles.tabActive : ''}`}
                  onClick={() => setTab(item.value)}
                >
                  {item.label}<span className={styles.tabCount}>{item.count}</span>
                </button>
              ))}
            </div>
            <div className={styles.searchWrap}>
              <UiIcon name="search" width={16} height={16} className={styles.searchIcon} />
              <input
                className={styles.search}
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={tab === 'users' ? 'Поиск по email или роли' : tab === 'complaints' ? 'Поиск по жалобам' : 'Имя, город, тематика'}
              />
            </div>
          </div>

          <div className={styles.content}>
            {(tab === 'pending' || tab === 'authors') && (
              currentAuthors.length ? (
                <div className={styles.list}>
                  {currentAuthors.map(author => {
                    const initials = (author.name || 'А').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <article className={styles.authorCard} key={author.id}>
                        <div className={styles.authorAvatar}>
                          {author.avatar_url ? <img src={author.avatar_url} alt="" /> : initials}
                        </div>
                        <div className={styles.authorMain}>
                          <div className={styles.authorHead}>
                            <h2 className={styles.authorName}>{author.name || 'Автор без имени'}</h2>
                            <span className={`${styles.status} ${author.status === 'approved' ? styles.statusApproved : author.status === 'rejected' ? styles.statusRejected : styles.statusPending}`}>
                              {author.status === 'approved' ? 'Опубликован' : author.status === 'rejected' ? 'Нужны исправления' : 'На модерации'}
                            </span>
                          </div>
                          <div className={styles.authorMeta}>
                            <span><UiIcon name="pin" width={12} height={12} />{author.city || 'Город не указан'}</span>
                            <span><UiIcon name="user" width={12} height={12} />{emailById[author.user_id || ''] || 'Email не найден'}</span>
                            <span><UiIcon name="calendar" width={12} height={12} />{formatDate(author.created_at)}</span>
                          </div>
                          {author.bio && <p className={styles.authorBio}>{author.bio}</p>}
                          <div className={styles.authorFacts}>
                            <span className={styles.authorFact}><strong>{shortNumber(author.followers_count)}</strong> подписчиков</span>
                            <span className={styles.authorFact}><strong>{shortNumber(author.stories_views)}</strong> просмотров</span>
                            <span className={styles.authorFact}><strong>{author.open_to_barter ? 'Да' : 'Нет'}</strong> бартер</span>
                            {author.occupation && <span className={styles.authorFact}><strong>{author.occupation}</strong></span>}
                          </div>
                          {!!author.lifestyle?.length && (
                            <div className={styles.tags}>
                              {author.lifestyle.slice(0, 6).map(tag => <span className={styles.tag} key={tag}>{tag}</span>)}
                              {author.lifestyle.length > 6 && <span className={styles.tag}>+{author.lifestyle.length - 6}</span>}
                            </div>
                          )}
                        </div>
                        <div className={styles.authorActions}>
                          <Link className={styles.secondaryButton} href={`/author/${author.id}`} target="_blank">Профиль</Link>
                          {author.status !== 'approved' && (
                            <button type="button" className={styles.primaryButton} onClick={() => updateAuthorStatus(author.id, 'approved')}>Одобрить</button>
                          )}
                          {author.status !== 'rejected' && (
                            <button type="button" className={styles.dangerButton} onClick={() => { setRejectModal(author.id); setRejectReason('') }}>Отклонить</button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <EmptyState icon="shield" title={tab === 'pending' ? 'Новых анкет нет' : 'Авторы не найдены'} text={tab === 'pending' ? 'Все поступившие анкеты уже рассмотрены.' : 'Попробуйте изменить поисковый запрос.'} />
              )
            )}

            {tab === 'users' && (
              filteredUsers.length ? (
                <div className={styles.list}>
                  {filteredUsers.map(user => {
                    const author = authors.find(item => item.user_id === user.id)
                    return (
                      <article className={styles.userCard} key={user.id}>
                        <div className={styles.userIdentity}>
                          <div className={styles.userAvatar}>{user.email?.[0]?.toUpperCase() || '?'}</div>
                          <div>
                            <div className={styles.userEmail}>{user.email}</div>
                            <div className={styles.userDate}>Регистрация: {formatDate(user.created_at)}</div>
                          </div>
                        </div>
                        <div className={styles.userBadges}>
                          <span className={styles.roleBadge}>{user.role === 'business' ? 'Бизнес' : user.role === 'admin' ? 'Администратор' : 'Автор'}</span>
                          {author && <span className={`${styles.status} ${author.status === 'approved' ? styles.statusApproved : author.status === 'rejected' ? styles.statusRejected : styles.statusPending}`}>{author.status === 'approved' ? 'Профиль опубликован' : author.status === 'rejected' ? 'Нужны исправления' : 'На модерации'}</span>}
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : <EmptyState icon="users" title="Пользователи не найдены" text="Попробуйте изменить поисковый запрос." />
            )}

            {tab === 'complaints' && (
              filteredComplaints.length ? (
                <div className={styles.list}>
                  {filteredComplaints.map(item => {
                    const targetAuthor = item.target_author_id ? authorById[item.target_author_id] : null
                    return (
                      <article className={styles.complaintCard} key={item.id}>
                        <div className={styles.complaintMain}>
                          <div className={styles.complaintTop}>
                            <div className={styles.complaintReason}>{item.reason}</div>
                            <span className={`${styles.status} ${item.status === 'new' ? styles.statusPending : item.status === 'dismissed' ? styles.statusRejected : styles.statusApproved}`}>
                              {item.status === 'new' ? 'Новая' : item.status === 'dismissed' ? 'Отклонена' : 'Рассмотрена'}
                            </span>
                          </div>
                          {item.comment && <p className={styles.complaintComment}>{item.comment}</p>}
                          <div className={styles.complaintMeta}>
                            <span>От: {emailById[item.reporter_id] || item.reporter_id.slice(0, 8)}</span>
                            <span>На: {targetAuthor?.name || (item.target_business_id ? 'бизнес' : 'не указано')}</span>
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                        </div>
                        {item.status === 'new' && (
                          <div className={styles.complaintActions}>
                            <button type="button" className={styles.primaryButton} onClick={() => updateComplaintStatus(item.id, 'reviewed')}>Рассмотрено</button>
                            <button type="button" className={styles.secondaryButton} onClick={() => updateComplaintStatus(item.id, 'dismissed')}>Отклонить</button>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              ) : <EmptyState icon="flag" title="Жалоб нет" text="Новые обращения пользователей появятся в этом разделе." />
            )}
          </div>
        </section>
      </div>

      {rejectModal && (
        <div className={styles.overlay} onMouseDown={() => setRejectModal(null)}>
          <div className={styles.modal} onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="reject-title">
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle} id="reject-title">Что нужно исправить?</h2>
                <p className={styles.modalText}>Автор увидит комментарий в кабинете и сможет обновить профиль.</p>
              </div>
              <button type="button" className={styles.iconButton} onClick={() => setRejectModal(null)} aria-label="Закрыть"><UiIcon name="close" width={18} height={18} /></button>
            </div>
            <textarea className={styles.textarea} value={rejectReason} onChange={event => setRejectReason(event.target.value)} placeholder="Например: добавьте корректную ссылку на Instagram и заполните описание профиля" />
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setRejectModal(null)}>Отмена</button>
              <button type="button" className={styles.dangerButton} onClick={() => { void updateAuthorStatus(rejectModal, 'rejected', rejectReason.trim()); setRejectModal(null) }}>Отправить на исправление</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function EmptyState({ icon, title, text }: { icon: Parameters<typeof UiIcon>[0]['name']; title: string; text: string }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}><UiIcon name={icon} width={22} height={22} /></div>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyText}>{text}</p>
    </div>
  )
}
