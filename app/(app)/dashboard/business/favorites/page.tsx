'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/LoadingScreen'
import UiIcon from '@/components/UiIcon'
import { useToast } from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { useApp } from '../../../AppContext'
import styles from '../../favorites.module.css'

type Author = {
  id: string
  name: string
  city: string
  instagram_url: string
  telegram_url: string | null
  followers_count: number
  telegram_followers: number
  stories_views: number
  occupation: string
  lifestyle: string[]
  bio: string
  open_to_barter: boolean
  avatar_url: string | null
  status: string
  avg_rating: number | null
  completed_deals_count: number
}

function formatNumber(value: number) {
  if (!value) return '0'
  return value >= 1000 ? `${Math.round(value / 100) / 10} тыс.` : value.toLocaleString('ru-RU')
}

export default function FavoritesPage() {
  const router = useRouter()
  const toast = useToast()
  const { userId, userEmail, businessProfile } = useApp()
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAuthor, setModalAuthor] = useState<Author | null>(null)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sending, setSending] = useState(false)
  const [requestMap, setRequestMap] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data: favorites } = await supabase.from('favorites').select('author_id').eq('business_id', userId)
      const ids = (favorites || []).map(item => item.author_id)

      if (ids.length > 0) {
        const { data } = await supabase
          .from('authors')
          .select('id, name, city, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, bio, open_to_barter, avatar_url, status, completed_deals_count, avg_rating')
          .in('id', ids)
        setAuthors(data || [])
      } else {
        setAuthors([])
      }

      const { data: requests } = await supabase
        .from('requests')
        .select('id, author_id')
        .eq('business_id', userId)
        .in('status', ['new', 'viewed', 'accepted'])
      const map: Record<string, string> = {}
      requests?.forEach(request => { map[request.author_id] = request.id })
      setRequestMap(map)
      setLoading(false)
    })()
  }, [userId])

  const removeFavorite = async (authorId: string) => {
    if (!userId) return
    const { error: removeError } = await supabase.from('favorites').delete().eq('business_id', userId).eq('author_id', authorId)
    if (removeError) {
      toast.error('Не удалось убрать автора из избранного.')
      return
    }
    setAuthors(previous => previous.filter(author => author.id !== authorId))
    toast.success('Автор удалён из избранного')
  }

  const openModal = (author: Author) => {
    if (!businessProfile?.company_name || !businessProfile?.inn) {
      toast.error('Сначала заполни профиль компании')
      router.push('/dashboard/business/profile')
      return
    }
    setModalAuthor(author)
    setMessage('')
    setBudget('')
    setDeadline('')
    setError('')
  }

  const sendRequest = async () => {
    if (!modalAuthor || !userId || !message.trim()) return
    setSending(true)
    setError('')
    const { data: inserted, error: requestError } = await supabase.from('requests').insert([{
      business_id: userId,
      business_email: userEmail,
      author_id: modalAuthor.id,
      message: message.trim(),
      budget: budget.trim() || null,
      deadline: deadline || null,
      status: 'new',
    }]).select('id').single()
    setSending(false)

    if (requestError || !inserted) {
      setError('Не получилось отправить предложение. Попробуй ещё раз.')
      return
    }
    router.push(`/dashboard/chat/${inserted.id}`)
  }

  if (loading) return <LoadingScreen />

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>Шортлист бизнеса</div>
            <h1 className={styles.title}>Избранные авторы</h1>
            <p className={styles.subtitle}>Собирайте подходящих авторов в одном месте, сравнивайте профили и переходите к предложению, когда будете готовы.</p>
          </div>
          <Link className={styles.catalogLink} href="/catalog"><UiIcon name="search" width={16} height={16} />Найти авторов</Link>
        </header>

        {authors.length === 0 ? (
          <section className={styles.empty}>
            <div className={styles.emptyIcon}><UiIcon name="heart" width={26} height={26} /></div>
            <h2>Шортлист пока пуст</h2>
            <p>Откройте каталог и сохраняйте авторов, которые подходят по тематике, городу и аудитории.</p>
            <Link className={styles.primary} href="/catalog" style={{ minWidth: 180, display: 'inline-flex' }}>Открыть каталог</Link>
          </section>
        ) : (
          <section className={styles.grid}>
            {authors.map(author => {
              const requestId = requestMap[author.id]
              const initial = author.name?.[0]?.toUpperCase() || '?'
              return (
                <article className={styles.card} key={author.id}>
                  <Link className={styles.media} href={`/author/${author.id}`}>
                    {author.avatar_url
                      ? <img src={author.avatar_url} alt={author.name} />
                      : <div className={styles.placeholder}>{initial}</div>}
                    <span className={styles.mediaBadge}>{author.open_to_barter ? 'Бартер возможен' : 'Оплата'}</span>
                  </Link>
                  <button className={styles.favoriteButton} type="button" aria-label="Убрать из избранного" onClick={() => removeFavorite(author.id)}>
                    <UiIcon name="heart" width={17} height={17} fill="currentColor" />
                  </button>

                  <div className={styles.body}>
                    <div className={styles.nameRow}>
                      <Link className={styles.name} href={`/author/${author.id}`}>{author.name}</Link>
                      {author.avg_rating ? <span className={styles.rating}>★ {author.avg_rating}</span> : null}
                    </div>
                    <div className={styles.meta}>{[author.city, author.occupation].filter(Boolean).join(' · ')}</div>
                    <p className={styles.bio}>{author.bio || 'Автор пока не добавил описание профиля.'}</p>
                    {author.lifestyle?.length > 0 && <div className={styles.tags}>{author.lifestyle.slice(0, 3).map(tag => <span className={styles.tag} key={tag}>{tag}</span>)}</div>}

                    <div className={styles.stats}>
                      <div className={styles.stat}><strong>{formatNumber(author.followers_count)}</strong><span>подписчиков</span></div>
                      <div className={styles.stat}><strong>{formatNumber(author.stories_views)}</strong><span>сторис</span></div>
                      <div className={styles.stat}><strong>{author.completed_deals_count || 0}</strong><span>сделок</span></div>
                    </div>

                    {author.status === 'approved' ? (
                      <div className={styles.actions}>
                        <Link className={styles.secondary} href={`/author/${author.id}`}>Профиль</Link>
                        {requestId
                          ? <Link className={styles.primary} href={`/dashboard/chat/${requestId}`}>К заявке</Link>
                          : <button className={styles.primary} type="button" onClick={() => openModal(author)}>Предложить</button>}
                      </div>
                    ) : <div className={styles.unavailable}>Профиль временно недоступен</div>}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      {modalAuthor && (
        <div className={styles.modalBackdrop} onClick={() => setModalAuthor(null)}>
          <div className={styles.modal} role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Предложение для {modalAuthor.name}</h2>
                <p className={styles.modalText}>Опишите задачу, укажите бюджет и желаемый срок. После отправки откроется чат со сделкой.</p>
              </div>
              <button className={styles.close} type="button" onClick={() => setModalAuthor(null)} aria-label="Закрыть"><UiIcon name="close" width={17} height={17} /></button>
            </div>

            <label className={styles.label}>Задача и формат сотрудничества *</label>
            <textarea className={styles.textarea} value={message} onChange={event => setMessage(event.target.value)} placeholder="Что нужно снять, для какого продукта, какой результат вы ожидаете" />

            <div className={styles.fields}>
              <div><label className={styles.label}>Бюджет</label><input className={styles.input} value={budget} onChange={event => setBudget(event.target.value)} placeholder="5000 ₽ или бартер" /></div>
              <div><label className={styles.label}>Желаемый срок</label><input className={styles.input} type="date" value={deadline} onChange={event => setDeadline(event.target.value)} /></div>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.modalActions}>
              <button className={styles.secondary} type="button" onClick={() => setModalAuthor(null)}>Отмена</button>
              <button className={styles.primary} type="button" disabled={sending || !message.trim()} onClick={sendRequest}>{sending ? 'Отправляем…' : 'Отправить предложение'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
