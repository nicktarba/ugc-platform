'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useApp } from '../../AppContext'
import { ProfileSkeleton } from '@/components/Skeleton'
import ReviewsList from '@/components/ReviewsList'
import UiIcon from '@/components/UiIcon'
import styles from './author.module.css'

type Author = {
  id: string; name: string; city: string
  instagram_url: string; telegram_url: string | null
  followers_count: number; telegram_followers: number; stories_views: number
  occupation: string; lifestyle: string[]; hobbies: string; bio: string
  open_to_barter: boolean; avatar_url: string | null
  completed_deals_count: number; avg_rating: number | null; reviews_count: number
}

type SimilarAuthor = {
  id: string; name: string; city: string; occupation: string
  lifestyle: string[]; avatar_url: string | null; avg_rating: number | null
  followers_count: number; stories_views: number; completed_deals_count: number; open_to_barter: boolean
}

const AVATAR_BG   = ['#fdf3e7','#e8f4fd','#f0fdf4','#fdf4ff','#fff0f0']
const AVATAR_TEXT = ['#c17f3e','#1a6fa8','#16a34a','#7c3aed','#dc2626']
const HEADER_GRADIENTS = [
  'linear-gradient(135deg, #f0e6d6 0%, #e8d5c0 100%)',
  'linear-gradient(135deg, #d6e8f0 0%, #c0d5e8 100%)',
  'linear-gradient(135deg, #e6f0d6 0%, #d0e0c0 100%)',
  'linear-gradient(135deg, #f0d6e6 0%, #e8c0d5 100%)',
  'linear-gradient(135deg, #e6d6f0 0%, #d5c0e8 100%)',
]

const TAG_COLORS: Record<string, { bg:string; color:string; border:string }> = {
  'Активный спорт': { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  'ЗОЖ и питание': { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  'Кофе и кафе': { bg:'#fdf3e7', color:'#b45309', border:'#f5dcb8' },
  'Рестораны': { bg:'#fdf3e7', color:'#b45309', border:'#f5dcb8' },
  'Путешествия': { bg:'#e8f4fd', color:'#1a6fa8', border:'#b5d4f4' },
  'Авто': { bg:'#e8f4fd', color:'#1a6fa8', border:'#b5d4f4' },
  'Мода и стиль': { bg:'#fdf4ff', color:'#7c3aed', border:'#e9d5ff' },
  'Красота и уход': { bg:'#fdf4ff', color:'#7c3aed', border:'#e9d5ff' },
  'Семья и дети': { bg:'#fff0f0', color:'#dc2626', border:'#fecaca' },
  'Технологии': { bg:'#f0f4ff', color:'#3b5bdb', border:'#c3d4f7' },
  'Музыка': { bg:'#fef3cd', color:'#92400e', border:'#fde68a' },
  'Кино и сериалы': { bg:'#fef3cd', color:'#92400e', border:'#fde68a' },
  'Книги': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Искусство': { bg:'#fdf4ff', color:'#7c3aed', border:'#e9d5ff' },
  'Бизнес': { bg:'#f0f4ff', color:'#3b5bdb', border:'#c3d4f7' },
}
const defaultTag = { bg:'#f0ede6', color:'#7a7570', border:'#d4d0c8' }

export default function AuthorPublicPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const { userId, userEmail, userRole, businessProfile, authorProfile } = useApp()
  const authorId = params.id as string

  const [author, setAuthor] = useState<Author | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasOpenDeal, setHasOpenDeal] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sending, setSending] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [similarAuthors, setSimilarAuthors] = useState<SimilarAuthor[]>([])
  const [visibleSimilarCount, setVisibleSimilarCount] = useState(6)
  const [complaintOpen, setComplaintOpen] = useState(false)
  const [complaintReason, setComplaintReason] = useState('')
  const [complaintComment, setComplaintComment] = useState('')
  const [complaintSending, setComplaintSending] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: a } = await supabase.from('authors').select('id, user_id, name, city, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, avatar_url, completed_deals_count, avg_rating, reviews_count').eq('id', authorId).eq('status', 'approved').single()
      if (!a) { setNotFound(true); setLoading(false); return }
      setAuthor(a as Author)
      if (userId && userRole === 'business') {
        const { data: deal } = await supabase.from('requests').select('id').eq('business_id', userId).eq('author_id', authorId).in('status', ['new','viewed','accepted']).maybeSingle()
        if (deal) setHasOpenDeal(deal.id)
      }

      // Похожие авторы: пересечение тегов lifestyle + бонус за тот же город, топ-4
      const { data: pool } = await supabase.from('authors').select('id, name, city, occupation, lifestyle, avatar_url, avg_rating, followers_count, stories_views, completed_deals_count, open_to_barter').eq('status', 'approved').neq('id', authorId).limit(200)
      if (pool && pool.length > 0) {
        const currentTags = new Set((a.lifestyle || []) as string[])
        const scored = (pool as SimilarAuthor[]).map(p => {
          const sharedTags = (p.lifestyle || []).filter(t => currentTags.has(t)).length
          const sameCity = p.city === a.city ? 1 : 0
          return { author: p, score: sharedTags * 2 + sameCity }
        })
        const similar = scored.filter(s => s.score > 0).sort((x, y) => y.score - x.score).slice(0, 8).map(s => s.author)
        setSimilarAuthors(similar)
      }

      // Учитываем один просмотр профиля за сессию вкладки.
      // Собственный просмотр автора в статистику не попадает.
      const ownerUserId = (a as { user_id?: string }).user_id
      const viewStorageKey = `svoi-profile-view:${authorId}`
      const shouldTrackView =
        ownerUserId !== userId &&
        !sessionStorage.getItem(viewStorageKey)

      if (shouldTrackView) {
        sessionStorage.setItem(viewStorageKey, '1')

        void supabase
          .from('profile_views')
          .insert([{
            author_id: authorId,
            viewer_id: userId || null,
          }])
          .then(({ error }) => {
            if (error) {
              sessionStorage.removeItem(viewStorageKey)
              console.error('Не удалось записать просмотр профиля:', error)
            }
          })
      }

      setLoading(false)
    }
    init()
  }, [authorId, router, userId, userRole])

  const sendRequest = async () => {
    if (!userId || !userEmail || !message.trim()) return
    setSending(true)
    const { data: inserted, error } = await supabase.from('requests').insert([{
      business_id: userId, business_email: userEmail, author_id: authorId,
      message: message.trim(), budget: budget.trim() || null, deadline: deadline || null, status: 'new',
    }]).select('id').single()
    setSending(false)
    if (error || !inserted) { toast.error('Не удалось отправить. Попробуй ещё раз.'); return }
    router.push(`/dashboard/chat/${inserted.id}`)
  }

  if (loading) return <ProfileSkeleton />
  if (notFound) return (
    <main className={styles.notFoundPage}>
      <div className={styles.notFoundCard}>
        <div><UiIcon name="search" width={30} height={30} /></div>
        <h1>Автор не найден</h1>
        <p>Возможно, профиль удалён или ещё не прошёл модерацию.</p>
        <Link href="/catalog">Вернуться в каталог</Link>
      </div>
    </main>
  )
  if (!author) return null

  const ci = author.id.charCodeAt(0) % 5
  const initial = author.name?.[0]?.toUpperCase() || '?'
  const isOwnAuthorProfile = userRole === 'author' && authorProfile?.id === authorId
  const primaryAction = userRole === 'business'
    ? hasOpenDeal
      ? <Link href={`/dashboard/chat/${hasOpenDeal}`} className={styles.primaryAction}>Открыть текущую сделку</Link>
      : <button type="button" className={styles.primaryAction} onClick={() => { if (!businessProfile?.company_name || !businessProfile?.inn) { toast.error('Сначала заполни профиль компании'); return }; setModalOpen(true) }}>Предложить сотрудничество</button>
    : !userId
      ? <Link href={`/register?redirect=${encodeURIComponent(`/author/${authorId}`)}`} className={styles.primaryAction}>Связаться с автором</Link>
      : null

  return (
    <main className={styles.page}>
      <div className={styles.mobileTopbar}>
        <Link href="/" className={styles.mobileBrand}>СВОИ <span>UGC</span></Link>
        <Link href="/catalog" className={styles.mobileCatalog}><UiIcon name="search" width={17} height={17} /> Каталог</Link>
      </div>

      <div className={styles.container}>
        <Link href="/catalog" className={styles.backLink}><UiIcon name="arrowLeft" width={17} height={17} /> Вернуться в каталог</Link>

        <section className={styles.profileHero}>
          <div className={styles.profileMedia}>
            {author.avatar_url ? <img src={author.avatar_url} alt={author.name} /> : (
              <div className={styles.profileFallback} style={{ background: HEADER_GRADIENTS[ci] }}>{initial}</div>
            )}
            <div className={styles.mediaShade} />
            <span className={styles.verifiedBadge}><UiIcon name="check" width={14} height={14} /> Профиль прошёл модерацию</span>
          </div>

          <div className={styles.profileIntro}>
            <div className={styles.introTop}>
              <div>
                <span className={styles.eyebrow}>UGC-автор</span>
                <h1>{author.name}</h1>
                <p className={styles.location}><UiIcon name="pin" width={16} height={16} /> {author.city}{author.occupation ? ` · ${author.occupation}` : ''}</p>
              </div>
              <div className={styles.quickActions}>
                <button type="button" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Ссылка скопирована') }} aria-label="Поделиться профилем"><UiIcon name="share" width={18} height={18} /></button>
                {userId && !isOwnAuthorProfile && <button type="button" onClick={() => setComplaintOpen(true)} aria-label="Пожаловаться"><UiIcon name="flag" width={18} height={18} /></button>}
              </div>
            </div>

            <div className={styles.statusRow}>
              {author.open_to_barter && <span className={styles.barterBadge}><UiIcon name="check" width={13} height={13} /> Рассматривает бартер</span>}
              {author.avg_rating && <span className={styles.ratingBadge}><UiIcon name="star" width={13} height={13} /> {author.avg_rating} · {author.reviews_count} {author.reviews_count === 1 ? 'отзыв' : 'отзывов'}</span>}
              {!author.avg_rating && author.completed_deals_count > 0 && <span className={styles.dealsBadge}>{author.completed_deals_count} {author.completed_deals_count === 1 ? 'сделка' : 'сделок'}</span>}
            </div>

            {author.bio && <p className={styles.lead}>{author.bio}</p>}

            {author.lifestyle?.length > 0 && (
              <div className={styles.heroTags}>
                {author.lifestyle.slice(0, 7).map(tag => {
                  const colors = TAG_COLORS[tag] || defaultTag
                  return <span key={tag} style={{ background: colors.bg, color: colors.color, borderColor: colors.border }}>{tag}</span>
                })}
                {author.lifestyle.length > 7 && <span className={styles.moreTag}>+{author.lifestyle.length - 7}</span>}
              </div>
            )}

            <div className={styles.statsGrid}>
              <div><UiIcon name="users" width={18} height={18} /><span><strong>{author.followers_count > 0 ? author.followers_count.toLocaleString('ru') : 'Не указано'}</strong><small>подписчиков Instagram</small></span></div>
              <div><UiIcon name="eye" width={18} height={18} /><span><strong>{author.stories_views > 0 ? author.stories_views.toLocaleString('ru') : 'Не указано'}</strong><small>просмотров stories</small></span></div>
              <div><UiIcon name="briefcase" width={18} height={18} /><span><strong>{author.completed_deals_count || 'Пока нет'}</strong><small>завершённых сделок</small></span></div>
            </div>

            <div className={styles.heroFooter}>
              <div className={styles.socialLinks}>
                {author.instagram_url && <a href={author.instagram_url} target="_blank" rel="noopener noreferrer"><UiIcon name="instagram" width={18} height={18} /> Instagram <UiIcon name="external" width={13} height={13} /></a>}
                {author.telegram_url && <a href={author.telegram_url} target="_blank" rel="noopener noreferrer"><UiIcon name="telegram" width={18} height={18} /> Telegram <UiIcon name="external" width={13} height={13} /></a>}
              </div>
              {primaryAction}
            </div>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            {(author.bio || author.hobbies) && (
              <section className={styles.contentCard}>
                <span className={styles.sectionEyebrow}>Знакомство с автором</span>
                <h2>О профиле</h2>
                {author.bio && <p className={styles.bodyText}>{author.bio}</p>}
                {author.hobbies && <div className={styles.hobbies}><strong>Интересы и хобби</strong><p>{author.hobbies}</p></div>}
              </section>
            )}

            {author.lifestyle?.length > 0 && (
              <section className={styles.contentCard}>
                <span className={styles.sectionEyebrow}>Тематики</span>
                <h2>Контент и стиль жизни</h2>
                <div className={styles.allTags}>
                  {author.lifestyle.map(tag => {
                    const colors = TAG_COLORS[tag] || defaultTag
                    return <span key={tag} style={{ background: colors.bg, color: colors.color, borderColor: colors.border }}>{tag}</span>
                  })}
                </div>
              </section>
            )}

            {author.reviews_count > 0 ? (
              <section className={styles.contentCard}>
                <div className={styles.sectionHeadingRow}>
                  <div><span className={styles.sectionEyebrow}>Опыт сотрудничества</span><h2>Отзывы бизнеса</h2></div>
                  {author.avg_rating && <span className={styles.bigRating}><UiIcon name="star" width={17} height={17} /> {author.avg_rating}</span>}
                </div>
                <ReviewsList authorId={author.id} avgRating={author.avg_rating} reviewsCount={author.reviews_count} currentUserId={userId} />
              </section>
            ) : (
              <section className={`${styles.contentCard} ${styles.noReviews}`}>
                <div><UiIcon name="star" width={22} height={22} /></div>
                <span><strong>Отзывов пока нет</strong><small>Они появятся после завершённых сделок на платформе.</small></span>
              </section>
            )}
          </div>

          <aside className={styles.sideColumn}>
            {(userRole !== 'author' || isOwnAuthorProfile) && (
              <div className={`${styles.actionCard} ${isOwnAuthorProfile ? styles.ownActionCard : ''}`}>
                {isOwnAuthorProfile ? (
                  <>
                    <span className={styles.sectionEyebrow}>Ваш публичный профиль</span>
                    <h2>Профиль опубликован</h2>
                    <p>Так эту страницу видит бизнес. Поддерживайте фото, описание и статистику актуальными, чтобы получать более подходящие предложения.</p>
                    <div className={styles.ownProfileActions}>
                      <Link href="/dashboard/author/profile" className={styles.primaryAction}>Редактировать профиль</Link>
                      <button type="button" className={styles.secondaryAction} onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Ссылка скопирована') }}>Скопировать ссылку</button>
                    </div>
                    <ul>
                      <li><UiIcon name="check" width={15} height={15} /> Профиль виден бизнесу в каталоге</li>
                      <li><UiIcon name="check" width={15} height={15} /> Новые предложения появятся в разделе «Сделки»</li>
                      <li><UiIcon name="check" width={15} height={15} /> Завершённые сделки и отзывы повышают рейтинг</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <span className={styles.sectionEyebrow}>Начать сотрудничество</span>
                    <h2>Обсудите задачу напрямую</h2>
                    <p>Отправьте предложение, укажите бюджет и срок. Дальше общение и статусы сделки будут доступны в чате.</p>
                    {primaryAction}
                    <ul>
                      <li><UiIcon name="check" width={15} height={15} /> Контакты и история сделки в одном месте</li>
                      <li><UiIcon name="check" width={15} height={15} /> Можно договориться об оплате или бартере</li>
                      <li><UiIcon name="check" width={15} height={15} /> Отзыв после завершения сотрудничества</li>
                    </ul>
                  </>
                )}
              </div>
            )}

            {author.telegram_followers > 0 && (
              <div className={styles.telegramCard}>
                <UiIcon name="telegram" width={23} height={23} />
                <div><span>Telegram-аудитория</span><strong>{author.telegram_followers.toLocaleString('ru')}</strong><small>подписчиков</small></div>
              </div>
            )}
          </aside>
        </div>

        {similarAuthors.length > 0 && (
          <section className={styles.similarSection}>
            <div className={styles.similarHeading}>
              <div><span className={styles.sectionEyebrow}>Другие варианты</span><h2>Похожие авторы</h2></div>
              <Link href="/catalog">Весь каталог <UiIcon name="arrowRight" width={16} height={16} /></Link>
            </div>
            <div className={styles.similarGrid}>
              {similarAuthors.slice(0, visibleSimilarCount).map(similar => {
                const similarIndex = similar.id.charCodeAt(0) % HEADER_GRADIENTS.length
                return (
                  <Link key={similar.id} href={`/author/${similar.id}`} className={styles.similarCard}>
                    <div className={styles.similarMedia}>
                      {similar.avatar_url ? <img src={similar.avatar_url} alt={similar.name} /> : <div style={{ background: HEADER_GRADIENTS[similarIndex] }}>{similar.name?.[0]?.toUpperCase() || '?'}</div>}
                      {similar.open_to_barter && <span>Бартер</span>}
                    </div>
                    <div className={styles.similarBody}>
                      <strong>{similar.name}</strong>
                      <p><UiIcon name="pin" width={13} height={13} /> {similar.city}{similar.occupation ? ` · ${similar.occupation}` : ''}</p>
                      <div><span>{similar.followers_count > 0 ? `${similar.followers_count.toLocaleString('ru')} подписчиков` : 'Аудитория не указана'}</span>{similar.avg_rating && <span><UiIcon name="star" width={12} height={12} /> {similar.avg_rating}</span>}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
            {visibleSimilarCount < similarAuthors.length && <button type="button" className={styles.showMoreSimilar} onClick={() => setVisibleSimilarCount(current => current + 6)}>Показать ещё</button>}
          </section>
        )}
      </div>

      {primaryAction && <div className={styles.mobileStickyAction}>{primaryAction}</div>}

      {modalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="author-request-title">
            <button type="button" className={styles.modalClose} onClick={() => setModalOpen(false)} aria-label="Закрыть"><UiIcon name="close" width={20} height={20} /></button>
            <span className={styles.modalEyebrow}>Новое предложение</span>
            <h2 id="author-request-title">Написать {author.name}</h2>
            <p>Расскажите о бизнесе и задаче. После отправки вы перейдёте в чат с автором.</p>
            <label className={styles.modalField}><span>Сообщение</span><textarea value={message} onChange={event => setMessage(event.target.value)} rows={5} maxLength={3000} placeholder="Что нужно снять, какой формат и результат ожидаете?" /></label>
            <div className={styles.modalGrid}>
              <label className={styles.modalField}><span>Бюджет</span><input value={budget} onChange={event => setBudget(event.target.value)} placeholder="Например, 5 000 ₽" /></label>
              <label className={styles.modalField}><span>Желаемый срок</span><input type="date" value={deadline} onChange={event => setDeadline(event.target.value)} /></label>
            </div>
            <div className={styles.modalActions}><button type="button" onClick={() => setModalOpen(false)}>Отмена</button><button type="button" className={styles.modalPrimary} onClick={sendRequest} disabled={sending || !message.trim()}>{sending ? 'Отправляем…' : 'Отправить предложение'}</button></div>
          </div>
        </div>
      )}

      {complaintOpen && (
        <div className={styles.modalBackdrop} onClick={() => setComplaintOpen(false)}>
          <div className={`${styles.modal} ${styles.complaintModal}`} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="complaint-title">
            <button type="button" className={styles.modalClose} onClick={() => setComplaintOpen(false)} aria-label="Закрыть"><UiIcon name="close" width={20} height={20} /></button>
            <span className={styles.modalEyebrow}>Обратная связь</span>
            <h2 id="complaint-title">Пожаловаться на профиль</h2>
            <p>Выберите причину. Жалоба не будет показана автору.</p>
            <div className={styles.reasonList}>
              {['Спам или мошенничество', 'Неадекватное поведение', 'Фейковый профиль', 'Другое'].map(reason => (
                <button key={reason} type="button" className={complaintReason === reason ? styles.reasonActive : ''} onClick={() => setComplaintReason(reason)}>{reason}{complaintReason === reason && <UiIcon name="check" width={15} height={15} />}</button>
              ))}
            </div>
            <label className={styles.modalField}><span>Комментарий, если нужен</span><textarea value={complaintComment} onChange={event => setComplaintComment(event.target.value)} rows={3} maxLength={1000} placeholder="Опишите ситуацию" /></label>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setComplaintOpen(false)}>Отмена</button>
              <button type="button" className={styles.dangerButton} disabled={!complaintReason || complaintSending} onClick={async () => {
                setComplaintSending(true)
                try {
                  const { data: sessionData } = await supabase.auth.getSession()
                  const token = sessionData.session?.access_token
                  if (!token) {
                    toast.error('Чтобы отправить жалобу, войди в аккаунт.')
                    return
                  }

                  const response = await fetch('/api/complaints', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      kind: 'profile',
                      authorId,
                      reason: complaintReason,
                      comment: complaintComment.trim() || null,
                    }),
                  })
                  const result = await response.json()
                  if (!response.ok) {
                    toast.error(result?.error || 'Не удалось отправить жалобу. Попробуйте ещё раз.')
                    return
                  }

                  setComplaintOpen(false)
                  setComplaintReason('')
                  setComplaintComment('')
                  toast.success('Жалоба отправлена, мы рассмотрим её')
                } catch {
                  toast.error('Не удалось отправить жалобу. Попробуйте ещё раз.')
                } finally {
                  setComplaintSending(false)
                }
              }}>{complaintSending ? 'Отправляем…' : 'Отправить жалобу'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
