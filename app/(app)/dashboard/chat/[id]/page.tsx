'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useApp } from '../../../AppContext'
import { OPEN_STATUSES, CLOSED_STATUSES } from '@/lib/types'
import { truncate, parseStatusError } from '@/lib/format'
import UiIcon from '@/components/UiIcon'
import styles from './chat.module.css'

type Msg = { id: string; sender_id: string; sender_role: string; text: string; created_at: string; read: boolean }
type RequestInfo = {
  id: string
  message: string
  business_email: string
  author_id: string
  business_id: string
  status: string
  budget: string | null
  deadline: string | null
  authors: { name: string; user_id: string; status: string } | null
}

const OPEN: string[] = OPEN_STATUSES
const CLOSED: string[] = CLOSED_STATUSES

function StarRating({ value, onChange, size = 28 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  return (
    <span style={{ display: 'inline-flex', gap: '4px', cursor: 'pointer' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{ fontSize: size, color: n <= (hover || value) ? '#c17f3e' : '#e0ddd8', transition: 'color .15s', userSelect: 'none' }}
        >★</span>
      ))}
    </span>
  )
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const { bumpBadge } = useApp()
  const requestId = params.id as string

  const [userId, setUserId] = useState<string|null>(null)
  const [userRole, setUserRole] = useState<string|null>(null)
  const [userEmail, setUserEmail] = useState<string|null>(null)
  const [request, setRequest] = useState<RequestInfo|null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const PAGE_SIZE = 50
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Review state
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSending, setReviewSending] = useState(false)
  const [reviewSent, setReviewSent] = useState(false)
  const [existingReview, setExistingReview] = useState<{ rating: number; comment: string | null } | null>(null)

  const refetchRequestStatus = async () => {
    const { data } = await supabase.from('requests').select('status').eq('id', requestId).single()
    if (data) setRequest(prev => prev ? { ...prev, status: data.status } : prev)
  }

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior })
    })
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push(`/login?redirect=${encodeURIComponent(`/dashboard/chat/${requestId}`)}`); return }
      const uid = userData.user.id
      setUserId(uid)
      setUserEmail(userData.user.email || null)
      const role = userData.user.user_metadata?.role
      setUserRole(role)

      const { data: req } = await supabase.from('requests').select('*, authors(name, user_id, status)').eq('id', requestId).single()
      if (!req) { router.push('/'); return }
      setRequest(req as unknown as RequestInfo)

      if (role === 'business' && req.status === 'completed') {
        const { data: rev } = await supabase.from('reviews').select('rating, comment').eq('request_id', requestId).eq('business_id', uid).maybeSingle()
        if (rev) setExistingReview(rev)
      }

      const { data: msgs, error: msgsErr } = await supabase.from('messages').select('id, request_id, sender_id, sender_role, text, created_at, read').eq('request_id', requestId).order('created_at', { ascending: false }).limit(PAGE_SIZE)
      if (msgsErr) toast.error('Не удалось загрузить сообщения.')
      const sorted = (msgs || []).reverse()
      setMessages(sorted)
      setHasMore((msgs?.length || 0) === PAGE_SIZE)
      setLoading(false)

      const { data: unreadMsgs } = await supabase.from('messages').select('id').eq('request_id', requestId).neq('sender_id', uid).eq('read', false)
      const unreadCount = unreadMsgs?.length || 0
      await supabase.from('messages').update({ read: true }).eq('request_id', requestId).neq('sender_id', uid).eq('read', false)
      if (unreadCount > 0) bumpBadge(-unreadCount)
    }
    init()
  }, [requestId, router])

  useEffect(() => {
    if (!loading && messages.length > 0) scrollToBottom('instant')
  }, [loading])

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${requestId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` }, async (payload) => {
        const newMsg = payload.new as Msg
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        if (userId && newMsg.sender_id !== userId) {
          await supabase.from('messages').update({ read: true }).eq('id', newMsg.id)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` }, (payload) => {
        const updated = payload.new as Msg
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, read: updated.read } : m))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${requestId}` }, (payload) => {
        setRequest(prev => prev ? { ...prev, status: (payload.new as { status: string }).status } : prev)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [requestId, userId])

  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages.length])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => scrollToBottom('instant')
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [scrollToBottom])

  const loadEarlier = async () => {
    if (!messages.length || loadingMore) return
    setLoadingMore(true)
    const earliest = messages[0].created_at
    const { data: older } = await supabase.from('messages').select('id, request_id, sender_id, sender_role, text, created_at, read').eq('request_id', requestId).lt('created_at', earliest).order('created_at', { ascending: false }).limit(PAGE_SIZE)
    const sorted = (older || []).reverse()
    setMessages(prev => [...sorted, ...prev])
    setHasMore((older?.length || 0) === PAGE_SIZE)
    setLoadingMore(false)
  }

  const sendMessage = async () => {
    if (!text.trim() || !userId || !userRole) return
    setSending(true)
    const { data, error } = await supabase.from('messages').insert([{
      request_id: requestId, sender_id: userId, sender_role: userRole, text: text.trim(),
    }]).select().single()
    setSending(false)
    if (!error && data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as Msg])
      setText('')
      if (inputRef.current) inputRef.current.style.height = 'auto'
    } else {
      toast.error('Не удалось отправить сообщение.')
    }
  }

  const [confirmAction, setConfirmAction] = useState<'declined'|'cancelled'|'completed'|null>(null)
  const [complaintOpen, setComplaintOpen] = useState(false)
  const [complaintReason, setComplaintReason] = useState('')
  const [complaintComment, setComplaintComment] = useState('')
  const [complaintSending, setComplaintSending] = useState(false)

  const updateStatus = async (status: 'accepted' | 'declined' | 'cancelled' | 'completed') => {
    if (status === 'declined' || status === 'cancelled' || status === 'completed') { setConfirmAction(status); return }
    setUpdatingStatus(true)
    const { error } = await supabase.from('requests').update({ status }).eq('id', requestId)
    setUpdatingStatus(false)
    if (!error) { setRequest(prev => prev ? { ...prev, status } : prev); toast.success('Предложение принято') }
    else { toast.error(parseStatusError(error)); await refetchRequestStatus() }
  }

  const confirmStatusUpdate = async () => {
    if (!confirmAction) return
    setUpdatingStatus(true)
    const { error } = await supabase.from('requests').update({ status: confirmAction }).eq('id', requestId)
    setUpdatingStatus(false)
    setConfirmAction(null)
    if (!error) {
      setRequest(prev => prev ? { ...prev, status: confirmAction } : prev)
      const labels: Record<string, string> = { declined:'Заявка отклонена', cancelled:'Сделка отменена', completed:'Сделка завершена 🎉' }
      toast.success(labels[confirmAction])
    } else { toast.error(parseStatusError(error)); await refetchRequestStatus() }
  }

  const startNewDeal = async () => {
    if (!request || !userId) return
    setUpdatingStatus(true)
    const { data: existing } = await supabase.from('requests').select('id')
      .eq('business_id', userId).eq('author_id', request.author_id)
      .in("status", OPEN).neq('id', requestId).maybeSingle()
    if (existing) { router.push(`/dashboard/chat/${existing.id}`); return }
    const { data: inserted, error } = await supabase.from('requests').insert([{
      business_id: userId, business_email: userEmail, author_id: request.author_id,
      message: 'Хотим обсудить новое сотрудничество', status: 'new',
    }]).select('id').single()
    setUpdatingStatus(false)
    if (!error && inserted) router.push(`/dashboard/chat/${inserted.id}`)
    else toast.error('Не удалось создать новый запрос.')
  }

  const submitReview = async () => {
    if (!reviewRating || !userId || !request) return
    setReviewSending(true)
    const { error } = await supabase.from('reviews').insert([{
      business_id: userId, author_id: request.author_id, request_id: requestId,
      rating: reviewRating, comment: reviewComment.trim() || null,
    }])
    if (error) {
      setReviewSending(false)
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('Ты уже оставил отзыв по этой сделке')
        setExistingReview({ rating: reviewRating, comment: reviewComment.trim() || null })
      } else toast.error('Не удалось отправить отзыв.')
      return
    }
    const { data: allReviews } = await supabase.from('reviews').select('rating').eq('author_id', request.author_id)
    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      await supabase.from('authors').update({ avg_rating: Math.round(avg * 10) / 10, reviews_count: allReviews.length }).eq('id', request.author_id)
    }
    setReviewSending(false)
    setReviewSent(true)
    setExistingReview({ rating: reviewRating, comment: reviewComment.trim() || null })
    toast.success('Отзыв отправлен!')
  }

  const [workDoneSent, setWorkDoneSent] = useState(false)

  const sendWorkDone = async () => {
    if (!request || !userId) return
    setUpdatingStatus(true)
    // Send system message in chat
    await supabase.from('messages').insert([{
      request_id: requestId, sender_id: userId, sender_role: 'author',
      text: '✅ Работа выполнена. Жду подтверждения и завершения сделки.',
    }])
    // Send notification to business
    await supabase.from('notifications').insert([{
      user_id: request.business_id,
      type: 'work_done',
      title: 'Автор отметил работу как выполненную',
      body: `${request.authors?.name || 'Автор'} завершил работу. Проверь результат и заверши сделку.`,
      data: { request_id: requestId },
    }])
    setUpdatingStatus(false)
    setWorkDoneSent(true)
    toast.success('Бизнес получит уведомление')
  }

  const otherName = userRole === 'author' ? request?.business_email : request?.authors?.name
  const backHref = userRole === 'business' ? '/dashboard/business' : '/dashboard/author/deals'
  const profileHref = userRole === 'business' && request?.author_id
    ? `/author/${request.author_id}`
    : userRole === 'author' && request?.business_id
      ? `/business/${request.business_id}`
      : null

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Загрузка...</div>

  const authorRejected = request?.authors?.status === 'rejected'
  const dealClosed = request ? CLOSED.includes(request.status) : false
  const dealCompleted = request?.status === 'completed'
  const showAuthorActions = userRole === 'author' && request && (request.status === 'new' || request.status === 'viewed') && !authorRejected
  const showAcceptedBusiness = userRole === 'business' && request?.status === 'accepted'
  const showAcceptedAuthor = userRole === 'author' && request?.status === 'accepted' && !authorRejected
  const showAcceptedActions = showAcceptedBusiness || showAcceptedAuthor
  const showBusinessWithdraw = userRole === 'business' && request && (request.status === 'new' || request.status === 'viewed')
  const canChat = !authorRejected && !dealClosed
  const showReviewForm = userRole === 'business' && dealCompleted && !existingReview && !reviewSent

  const hasActions = showAuthorActions || showAcceptedActions || showBusinessWithdraw || dealClosed || authorRejected || showReviewForm || (userRole === 'business' && dealCompleted && (existingReview || reviewSent))

  const statusMeta: Record<string, { label: string; className: string }> = {
    new: { label: userRole === 'business' ? 'Отправлено' : 'Новое предложение', className: styles.statusNew },
    viewed: { label: 'Просмотрено', className: styles.statusViewed },
    accepted: { label: 'В работе', className: styles.statusAccepted },
    completed: { label: 'Завершено', className: styles.statusCompleted },
    declined: { label: 'Отклонено', className: styles.statusDeclined },
    cancelled: { label: 'Отменено', className: styles.statusCancelled },
  }
  const currentStatus = statusMeta[request?.status || 'new'] || statusMeta.new
  const otherInitial = otherName?.trim()?.[0]?.toUpperCase() || '?'
  const formattedDeadline = request?.deadline
    ? new Date(request.deadline).toLocaleDateString('ru', { day:'numeric', month:'long', year:'numeric' })
    : null

  const renderActionPanel = () => {
    if (!hasActions) return null
    return (
      <>
        {authorRejected && !dealClosed && (
          <div className={`${styles.notice} ${styles.noticeDanger}`}>
            <UiIcon name="shield" width={16} height={16} />
            <span>{userRole === 'author' ? 'Профиль не прошёл модерацию. Переписка временно недоступна.' : 'Профиль автора временно недоступен.'}</span>
          </div>
        )}

        {showAuthorActions && (
          <div className={styles.actionRow}>
            <button type="button" className={`${styles.actionButton} ${styles.successButton}`} onClick={() => updateStatus('accepted')} disabled={updatingStatus}>Принять</button>
            <button type="button" className={`${styles.actionButton} ${styles.outlineButton}`} onClick={() => updateStatus('declined')} disabled={updatingStatus}>Отклонить</button>
          </div>
        )}

        {showBusinessWithdraw && (
          <button type="button" className={`${styles.actionButton} ${styles.outlineButton}`} onClick={() => updateStatus('cancelled')} disabled={updatingStatus}>Отозвать предложение</button>
        )}

        {showAcceptedBusiness && (
          <div className={styles.actionStack}>
            <button type="button" className={`${styles.actionButton} ${styles.successButton}`} onClick={() => updateStatus('completed')} disabled={updatingStatus}>Подтвердить выполнение</button>
            <button type="button" className={`${styles.actionButton} ${styles.dangerButton}`} onClick={() => updateStatus('cancelled')} disabled={updatingStatus}>Отменить сделку</button>
          </div>
        )}

        {showAcceptedAuthor && !workDoneSent && (
          <div className={styles.actionStack}>
            <button type="button" className={styles.actionButton} onClick={sendWorkDone} disabled={updatingStatus}>Работа выполнена</button>
            <button type="button" className={`${styles.actionButton} ${styles.dangerButton}`} onClick={() => updateStatus('cancelled')} disabled={updatingStatus}>Отменить сделку</button>
          </div>
        )}

        {showAcceptedAuthor && workDoneSent && (
          <div className={`${styles.notice} ${styles.noticeSuccess}`}>
            <UiIcon name="check" width={16} height={16} />
            <span>Бизнес получил уведомление. Ожидаем подтверждения результата.</span>
          </div>
        )}

        {dealClosed && (
          <div className={styles.actionStack}>
            <div className={styles.notice}>
              <UiIcon name="shield" width={16} height={16} />
              <span>Сделка закрыта. История переписки сохранена.</span>
            </div>
            {userRole === 'business' && (
              <button type="button" className={styles.actionButton} onClick={startNewDeal} disabled={updatingStatus}>Предложить новое сотрудничество</button>
            )}
          </div>
        )}
      </>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href={backHref} className={styles.backButton} aria-label="Назад">
          <UiIcon name="arrowLeft" width={19} height={19} />
        </Link>
        <div className={styles.avatar}>{otherInitial}</div>
        <div className={styles.participant}>
          <strong>{otherName || 'Участник сделки'}</strong>
          <span>{userRole === 'author' ? 'Бизнес' : 'UGC-автор'} · общение по сделке</span>
        </div>
        <span className={`${styles.headerStatus} ${currentStatus.className}`}>{currentStatus.label}</span>
        <div className={styles.headerActions}>
          {profileHref && (
            <Link href={profileHref} className={styles.profileButton} aria-label="Открыть профиль">
              <UiIcon name="user" width={18} height={18} />
            </Link>
          )}
          <button type="button" className={styles.iconButton} onClick={() => setComplaintOpen(true)} aria-label="Пожаловаться">
            <UiIcon name="flag" width={18} height={18} />
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.conversation}>
          <div className={styles.messages} ref={messagesRef}>
            <div className={styles.mobileDeal}>
              <div className={styles.dealCard}>
                <span className={styles.cardEyebrow}>Сделка</span>
                <h2 className={styles.cardTitle}>{currentStatus.label}</h2>
                <p className={styles.cardCopy}>{truncate(request?.message || 'Условия сотрудничества обсуждаются в чате.', 150)}</p>
                <div className={styles.detailList}>
                  <div className={styles.detailRow}><span>Бюджет</span><strong>{request?.budget || 'Не указан'}</strong></div>
                  <div className={styles.detailRow}><span>Срок</span><strong>{formattedDeadline || 'По договорённости'}</strong></div>
                </div>
              </div>
              {hasActions && <div className={styles.actionCard}><div className={styles.actionStack}>{renderActionPanel()}</div></div>}
              {showReviewForm && (
                <div className={styles.reviewCard}>
                  <span className={styles.cardEyebrow}>После сделки</span>
                  <h2 className={styles.cardTitle}>Оцените сотрудничество</h2>
                  <div className={styles.reviewStars}><StarRating value={reviewRating} onChange={setReviewRating} size={25} /></div>
                  <textarea value={reviewComment} onChange={event => setReviewComment(event.target.value)} maxLength={2000} placeholder="Что было особенно хорошо?" />
                  <button type="button" className={styles.actionButton} onClick={submitReview} disabled={!reviewRating || reviewSending}>{reviewSending ? 'Отправляем…' : 'Отправить отзыв'}</button>
                </div>
              )}
            </div>

            {request && (
              <div className={styles.proposalCard}>
                <div className={styles.proposalTop}>
                  <div className={styles.proposalIcon}><UiIcon name="briefcase" width={17} height={17} /></div>
                  <div><strong>Исходное предложение</strong><span>С него началось сотрудничество</span></div>
                </div>
                <p className={styles.proposalText}>{request.message}</p>
                {(request.budget || formattedDeadline) && (
                  <div className={styles.proposalMeta}>
                    {request.budget && <span className={styles.metaChip}><UiIcon name="wallet" width={14} height={14} /> {request.budget}</span>}
                    {formattedDeadline && <span className={styles.metaChip}><UiIcon name="calendar" width={14} height={14} /> {formattedDeadline}</span>}
                  </div>
                )}
              </div>
            )}

            {request?.status === 'accepted' && <div className={`${styles.timelineEvent} ${styles.timelineAccepted}`}>Предложение принято, сделка открыта</div>}
            {request?.status === 'completed' && <div className={`${styles.timelineEvent} ${styles.timelineCompleted}`}>Сделка завершена</div>}
            {request?.status === 'declined' && <div className={`${styles.timelineEvent} ${styles.timelineDeclined}`}>Предложение отклонено</div>}
            {request?.status === 'cancelled' && <div className={styles.timelineEvent}>Сделка отменена</div>}

            {hasMore && <button type="button" className={styles.loadEarlier} onClick={loadEarlier} disabled={loadingMore}>{loadingMore ? 'Загружаем…' : 'Показать ранние сообщения'}</button>}

            {messages.length === 0 && <div className={styles.emptyMessages}>Сообщений пока нет. Начните обсуждение задачи.</div>}

            {messages.map(messageItem => {
              const isMine = messageItem.sender_id === userId
              const time = new Date(messageItem.created_at).toLocaleString('ru', { hour:'2-digit', minute:'2-digit', day:'numeric', month:'short' })
              return (
                <div key={messageItem.id} className={`${styles.messageRow} ${isMine ? styles.mine : styles.theirs}`}>
                  <div className={styles.bubble}>{messageItem.text}</div>
                  <div className={styles.messageMeta}>
                    <span>{time}</span>
                    {isMine && <span className={styles.readMark}>{messageItem.read ? '✓✓' : '✓'}</span>}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {canChat ? (
            <div className={styles.composer}>
              <textarea
                ref={inputRef}
                value={text}
                onChange={event => setText(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }}
                onFocus={() => setTimeout(() => scrollToBottom('instant'), 300)}
                placeholder="Напишите сообщение…"
                rows={1}
                maxLength={5000}
                onInput={event => { const target = event.target as HTMLTextAreaElement; target.style.height = 'auto'; target.style.height = Math.min(target.scrollHeight, 118) + 'px' }}
              />
              <button type="button" className={styles.sendButton} onClick={sendMessage} disabled={sending || !text.trim()} aria-label="Отправить">
                <UiIcon name="arrowRight" width={19} height={19} />
              </button>
            </div>
          ) : <div className={styles.closedComposer}>Переписка закрыта. История сделки доступна только для просмотра.</div>}
        </section>

        <aside className={styles.sidebar}>
          <div className={styles.dealCard}>
            <span className={styles.cardEyebrow}>Информация о сделке</span>
            <h2 className={styles.cardTitle}>{currentStatus.label}</h2>
            <p className={styles.cardCopy}>{truncate(request?.message || 'Условия сотрудничества обсуждаются в чате.', 180)}</p>
            <div className={styles.detailList}>
              <div className={styles.detailRow}><span>Бюджет</span><strong>{request?.budget || 'Не указан'}</strong></div>
              <div className={styles.detailRow}><span>Срок</span><strong>{formattedDeadline || 'По договорённости'}</strong></div>
              <div className={styles.detailRow}><span>Номер</span><strong>#{requestId.slice(0, 8).toUpperCase()}</strong></div>
            </div>
            {profileHref && <Link href={profileHref} className={styles.profileLink}><UiIcon name="user" width={15} height={15} /> Открыть профиль</Link>}
          </div>

          {hasActions && (
            <div className={styles.actionCard}>
              <span className={styles.cardEyebrow}>Следующее действие</span>
              <div className={styles.actionStack}>{renderActionPanel()}</div>
            </div>
          )}

          {showReviewForm && (
            <div className={styles.reviewCard}>
              <span className={styles.cardEyebrow}>После сделки</span>
              <h2 className={styles.cardTitle}>Оцените сотрудничество</h2>
              <p className={styles.cardCopy}>Ваш отзыв появится в профиле автора и поможет другим компаниям принять решение.</p>
              <div className={styles.reviewStars}><StarRating value={reviewRating} onChange={setReviewRating} size={25} /></div>
              <textarea value={reviewComment} onChange={event => setReviewComment(event.target.value)} maxLength={2000} placeholder="Расскажите о результате и коммуникации" />
              <button type="button" className={styles.actionButton} onClick={submitReview} disabled={!reviewRating || reviewSending}>{reviewSending ? 'Отправляем…' : 'Отправить отзыв'}</button>
            </div>
          )}

          {userRole === 'business' && dealCompleted && (existingReview || reviewSent) && (
            <div className={styles.reviewCard}>
              <div className={`${styles.notice} ${styles.noticeSuccess}`}><UiIcon name="check" width={16} height={16} /><span>Отзыв отправлен</span></div>
              <div className={styles.reviewStars}><StarRating value={existingReview?.rating || reviewRating} onChange={() => {}} size={20} /></div>
            </div>
          )}
        </aside>
      </div>

      {confirmAction && (
        <div className={styles.modalBackdrop} onClick={() => setConfirmAction(null)}>
          <div className={styles.modal} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true">
            <h3>{confirmAction === 'declined' ? 'Отклонить предложение?' : confirmAction === 'cancelled' ? 'Отменить сделку?' : 'Завершить сделку?'}</h3>
            <p>{confirmAction === 'completed' ? 'После завершения бизнес сможет оставить отзыв об авторе.' : 'Переписка закроется, но история сделки останется доступна.'}</p>
            <div className={styles.modalActions}>
              <button type="button" className={`${styles.actionButton} ${styles.outlineButton}`} onClick={() => setConfirmAction(null)}>Назад</button>
              <button type="button" className={`${styles.actionButton} ${confirmAction === 'completed' ? styles.successButton : styles.dangerButton}`} onClick={confirmStatusUpdate} disabled={updatingStatus}>{updatingStatus ? 'Подождите…' : confirmAction === 'completed' ? 'Завершить' : confirmAction === 'declined' ? 'Отклонить' : 'Отменить'}</button>
            </div>
          </div>
        </div>
      )}

      {complaintOpen && (
        <div className={styles.modalBackdrop} onClick={() => setComplaintOpen(false)}>
          <div className={styles.modal} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true">
            <h3>Пожаловаться</h3>
            <p>Выберите причину. Второй участник сделки не увидит вашу жалобу.</p>
            <div className={styles.reasonList}>
              {['Нарушение договорённостей', 'Спам или мошенничество', 'Неадекватное поведение', 'Другое'].map(reason => (
                <button type="button" key={reason} className={`${styles.reasonButton} ${complaintReason === reason ? styles.reasonActive : ''}`} onClick={() => setComplaintReason(reason)}>
                  {reason}{complaintReason === reason && <UiIcon name="check" width={15} height={15} />}
                </button>
              ))}
            </div>
            <textarea value={complaintComment} onChange={event => setComplaintComment(event.target.value)} placeholder="Опишите ситуацию, если нужно" rows={3} maxLength={1000} />
            <div className={styles.modalActions}>
              <button type="button" className={`${styles.actionButton} ${styles.outlineButton}`} onClick={() => setComplaintOpen(false)}>Отмена</button>
              <button type="button" className={`${styles.actionButton} ${styles.dangerButton}`} disabled={!complaintReason || complaintSending} onClick={async () => {
                setComplaintSending(true)
                const targetAuthorId = userRole === 'business' ? request?.author_id : null
                const targetBusinessId = userRole === 'author' ? request?.business_id : null
                const { error } = await supabase.from('complaints').insert([{ reporter_id: userId, target_author_id: targetAuthorId, target_business_id: targetBusinessId, request_id: requestId, reason: complaintReason, comment: complaintComment.trim() || null }])
                setComplaintSending(false)
                if (error) { toast.error('Не удалось отправить жалобу. Попробуйте ещё раз.'); return }
                setComplaintOpen(false); setComplaintReason(''); setComplaintComment(''); toast.success('Жалоба отправлена')
              }}>{complaintSending ? 'Отправляем…' : 'Отправить'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
