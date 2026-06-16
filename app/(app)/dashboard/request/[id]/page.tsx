'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

import { OPEN_STATUSES, CLOSED_STATUSES } from '@/lib/types'

type RequestInfo = {
  id: string
  message: string
  business_email: string
  author_id: string
  business_id: string
  status: string
  budget: string | null
  deadline: string | null
  authors: { name: string; city: string; user_id: string; status: string } | null
}
type BusinessProfile = { company_name: string; website_url: string; niche: string; description: string }

const OPEN: string[] = OPEN_STATUSES
const CLOSED: string[] = CLOSED_STATUSES

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const requestId = params.id as string

  const [userId, setUserId] = useState<string|null>(null)
  const [userRole, setUserRole] = useState<string|null>(null)
  const [userEmail, setUserEmail] = useState<string|null>(null)
  const [request, setRequest] = useState<RequestInfo|null>(null)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile|null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [reviewModal, setReviewModal] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [hasReview, setHasReview] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      const uid = userData.user.id
      setUserId(uid)
      setUserEmail(userData.user.email || null)
      const role = userData.user.user_metadata?.role
      setUserRole(role)

      const { data: req } = await supabase.from('requests').select('*, authors(name, city, user_id, status)').eq('id', requestId).single()
      if (!req) { router.push('/'); return }
      setRequest(req as unknown as RequestInfo)

      if (role === 'business' && req.status === 'completed') {
        const { data: rev } = await supabase.from('reviews').select('id').eq('request_id', requestId).maybeSingle()
        if (rev) setHasReview(true)
      }

      if (role === 'author') {
        const { data: bp } = await supabase.from('business_profiles').select('*').eq('id', (req as { business_id: string }).business_id).maybeSingle()
        if (bp) setBusinessProfile(bp as BusinessProfile)
      }
      setLoading(false)
    }
    init()
  }, [requestId, router])

  const updateStatus = async (status: 'accepted' | 'declined' | 'cancelled' | 'completed') => {
    // Завершение сделки бизнесом — показываем модалку с оценкой вместо confirm
    if (status === 'completed' && userRole === 'business') {
      setReviewModal(true)
      return
    }

    const confirmText: Record<string, string> = {
      declined: 'Сделка будет отклонена, переписка закроется (история останется). Продолжить?',
      cancelled: 'Сделка будет отменена, переписка закроется (история останется). Продолжить?',
    }
    if (confirmText[status] && !confirm(confirmText[status])) return

    setUpdatingStatus(true)
    const { error } = await supabase.from('requests').update({ status }).eq('id', requestId)
    setUpdatingStatus(false)
    if (!error) {
      setRequest(prev => prev ? { ...prev, status } : prev)
      const successText: Record<string, string> = {
        accepted: 'Предложение принято',
        declined: 'Заявка отклонена',
        cancelled: 'Сделка отменена',
      }
      if (successText[status]) toast.success(successText[status])
    } else {
      toast.error('Не удалось обновить статус сделки. Попробуй ещё раз.')
    }
  }

  const submitReview = async (skipRating = false) => {
    if (!request || !userId) return
    setSubmittingReview(true)

    const { error: statusErr } = await supabase.from('requests').update({ status: 'completed' }).eq('id', requestId)
    if (statusErr) { toast.error('Не удалось завершить сделку.'); setSubmittingReview(false); return }

    if (!skipRating && rating > 0) {
      await supabase.from('reviews').insert([{
        request_id: requestId,
        author_id: request.author_id,
        business_id: userId,
        rating,
        comment: reviewComment.trim() || null,
      }])
      setHasReview(true)
    }

    setSubmittingReview(false)
    setReviewModal(false)
    setRequest(prev => prev ? { ...prev, status: 'completed' } : prev)
    toast.success('Сделка завершена 🎉')
  }

  const startNewDeal = async () => {
    if (!request || !userId) return
    setUpdatingStatus(true)

    const { data: existing } = await supabase.from('requests').select('id')
      .eq('business_id', userId).eq('author_id', request.author_id)
      .in("status", OPEN).neq('id', requestId).maybeSingle()

    if (existing) { router.push(`/dashboard/request/${existing.id}`); return }

    const { data: inserted, error } = await supabase.from('requests').insert([{
      business_id: userId,
      business_email: userEmail,
      author_id: request.author_id,
      message: 'Хотим обсудить новое сотрудничество',
      status: 'new',
    }]).select('id').single()
    setUpdatingStatus(false)
    if (!error && inserted) {
      router.push(`/dashboard/request/${inserted.id}`)
    } else {
      toast.error('Не удалось создать новый запрос. Попробуй ещё раз.')
    }
  }

  const dashboardLink = userRole === 'author' ? '/dashboard/author' : '/dashboard/business'
  const otherName = userRole === 'author'
    ? (businessProfile?.company_name || request?.business_email)
    : (request?.authors?.name ? `${request.authors.name}${request.authors.city ? ' · ' + request.authors.city : ''}` : null)
  const hasBusinessCard = userRole === 'author' && businessProfile && (businessProfile.niche || businessProfile.description || businessProfile.website_url)

  const statusInfo = (status: string) => {
    if (status === 'accepted') return { text: '✓ Сделка принята', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
    if (status === 'declined') return { text: '✕ Сделка отклонена', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
    if (status === 'cancelled') return { text: 'Сделка отменена', color: '#7a7570', bg: '#f0ede6', border: '#e0ddd8' }
    if (status === 'completed') return { text: '✓ Сделка завершена', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
    return null
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Загрузка...</div>

  const sInfo = request ? statusInfo(request.status) : null
  const authorRejected = request?.authors?.status === 'rejected'
  const dealClosed = request ? CLOSED.includes(request.status) : false
  const showAuthorActions = userRole === 'author' && request && (request.status === 'new' || request.status === 'viewed') && !authorRejected
  const showAcceptedActions = request && request.status === 'accepted'
  const showBusinessWithdraw = userRole === 'business' && request && (request.status === 'new' || request.status === 'viewed')

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'700px', margin:'0 auto', padding:'clamp(16px, 5vw, 24px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'12px', display:'flex', alignItems:'center', gap:'12px' }}>
          <Link href={dashboardLink} style={{ fontSize:'14px', color:'#7a7570', textDecoration:'none' }}>← Назад</Link>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'24px', fontWeight:700, color:'#1a1a1a' }}>{otherName}</h1>
        </div>

        {sInfo && (
          <div style={{ padding:'10px 16px', background:sInfo.bg, border:`1px solid ${sInfo.border}`, borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:600, color:sInfo.color }}>
            {sInfo.text}
          </div>
        )}

        {hasBusinessCard && (
          <div style={{ padding:'14px 16px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'12px', marginBottom:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', flexWrap:'wrap' }}>
              {businessProfile?.niche && (
                <span style={{ padding:'4px 12px', background:'#f0ede6', borderRadius:'100px', fontSize:'12px', color:'#7a7570', fontWeight:500 }}>{businessProfile.niche}</span>
              )}
              {businessProfile?.website_url && (
                <a href={businessProfile.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:'13px', color:'#1a1a1a', textDecoration:'none', fontWeight:500 }}>
                  {businessProfile.website_url.replace(/^https?:\/\//, '')} →
                </a>
              )}
            </div>
            {businessProfile?.description && (
              <p style={{ fontSize:'13px', color:'#7a7570', lineHeight:1.6, marginTop:'10px', marginBottom:0 }}>{businessProfile.description}</p>
            )}
          </div>
        )}

        {authorRejected && !dealClosed && (
          <div style={{ padding:'10px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:600, color:'#dc2626' }}>
            {userRole === 'author'
              ? 'Твой профиль не прошёл модерацию — переписка временно недоступна. Отредактируй анкету, чтобы отправить на повторную проверку.'
              : 'Профиль этого автора временно недоступен — переписка приостановлена.'}
          </div>
        )}

        {request && (
          <div style={{ padding:'16px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'12px', marginBottom:'16px' }}>
            <div style={{ fontSize:'12px', color:'#9a9590', fontWeight:600, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Заявка</div>
            <p style={{ fontSize:'15px', color:'#1a1a1a', lineHeight:1.6, marginBottom: (request.budget || request.deadline) ? '14px' : 0 }}>{request.message}</p>
            {(request.budget || request.deadline) && (
              <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', paddingTop:'14px', borderTop:'1px solid #f0ede6' }}>
                {request.budget && (
                  <div>
                    <div style={{ fontSize:'11px', color:'#9a9590' }}>Бюджет</div>
                    <div style={{ fontSize:'15px', fontWeight:600, color:'#1a1a1a' }}>{request.budget}</div>
                  </div>
                )}
                {request.deadline && (
                  <div>
                    <div style={{ fontSize:'11px', color:'#9a9590' }}>Срок</div>
                    <div style={{ fontSize:'15px', fontWeight:600, color:'#1a1a1a' }}>{new Date(request.deadline).toLocaleDateString('ru', { day:'numeric', month:'long', year:'numeric' })}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {dealClosed && (
          <div style={{ padding:'14px 16px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'12px', marginBottom:'16px' }}>
            <div style={{ fontSize:'13px', color:'#7a7570', marginBottom: userRole === 'business' ? '12px' : 0 }}>
              Сделка закрыта — переписка доступна только для просмотра.
            </div>
            {userRole === 'business' && request?.status === 'completed' && !hasReview && (
              <button onClick={() => setReviewModal(true)} style={{ padding:'10px 20px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'100px', color:'#c17f3e', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginBottom:'8px', display:'block' }}>
                ★ Оценить сотрудничество
              </button>
            )}
            {userRole === 'business' && hasReview && (
              <div style={{ fontSize:'13px', color:'#16a34a', fontWeight:500, marginBottom:'8px' }}>✓ Отзыв оставлен</div>
            )}
            {userRole === 'business' && (
              <button onClick={startNewDeal} disabled={updatingStatus} style={{ padding:'10px 20px', background:'#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:updatingStatus?'not-allowed':'pointer', fontFamily:'inherit' }}>
                Начать новую сделку
              </button>
            )}
          </div>
        )}

        {showAuthorActions && (
          <div style={{ display:'flex', gap:'12px', marginBottom:'16px' }}>
            <button onClick={() => updateStatus('accepted')} disabled={updatingStatus} style={{ flex:1, padding:'12px', border:'none', borderRadius:'100px', background:'#16a34a', color:'#fff', cursor:updatingStatus?'not-allowed':'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit' }}>
              Принять предложение
            </button>
            <button onClick={() => updateStatus('declined')} disabled={updatingStatus} style={{ flex:1, padding:'12px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', color:'#5a5650', cursor:updatingStatus?'not-allowed':'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit' }}>
              Отклонить
            </button>
          </div>
        )}

        {showBusinessWithdraw && (
          <div style={{ marginBottom:'16px' }}>
            <button onClick={() => updateStatus('cancelled')} disabled={updatingStatus} style={{ width:'100%', padding:'12px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', color:'#5a5650', cursor:updatingStatus?'not-allowed':'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit' }}>
              Отозвать заявку
            </button>
          </div>
        )}

        {showAcceptedActions && (
          <div style={{ display:'flex', gap:'12px', marginBottom:'16px' }}>
            <button onClick={() => updateStatus('completed')} disabled={updatingStatus} style={{ flex:1, padding:'12px', border:'none', borderRadius:'100px', background:'#16a34a', color:'#fff', cursor:updatingStatus?'not-allowed':'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit' }}>
              Завершить сделку
            </button>
            <button onClick={() => updateStatus('cancelled')} disabled={updatingStatus} style={{ flex:1, padding:'12px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', color:'#5a5650', cursor:updatingStatus?'not-allowed':'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit' }}>
              Отменить сделку
            </button>
          </div>
        )}

        <Link href={`/dashboard/chat/${requestId}`} style={{ display:'block', textAlign:'center', padding:'14px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600 }}>
          Перейти в переписку →
        </Link>
      </div>

      {reviewModal && (
        <div onClick={() => setReviewModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'32px', maxWidth:'440px', width:'100%' }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Завершить сделку</h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'20px', lineHeight:1.6 }}>Оцени сотрудничество с автором — это поможет другим бизнесам выбрать лучших.</p>

            <div style={{ display:'flex', gap:'8px', marginBottom:'16px', justifyContent:'center' }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)} style={{ fontSize:'28px', background:'none', border:'none', cursor:'pointer', opacity: rating >= n ? 1 : 0.3, transition:'opacity 0.1s' }}>★</button>
              ))}
            </div>

            {rating > 0 && (
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                rows={3}
                placeholder="Комментарий (необязательно)..."
                style={{ width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'14px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', resize:'none', marginBottom:'16px' }}
              />
            )}

            <div style={{ display:'flex', gap:'10px', flexDirection:'column' }}>
              <button
                onClick={() => submitReview(false)}
                disabled={submittingReview || rating === 0}
                style={{ padding:'12px', border:'none', borderRadius:'100px', background: rating === 0 ? '#9a9590' : '#1a1a1a', color:'#fff', fontSize:'14px', fontWeight:600, cursor: rating === 0 ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}
              >
                {submittingReview ? 'Сохраняем...' : rating === 0 ? 'Выбери оценку' : `Завершить со оценкой ${rating}/5`}
              </button>
              <button
                onClick={() => submitReview(true)}
                disabled={submittingReview}
                style={{ padding:'10px', border:'none', background:'none', color:'#9a9590', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}
              >
                Завершить без оценки
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
