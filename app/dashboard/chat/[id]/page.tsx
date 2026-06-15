'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import AppHeader from '@/components/AppHeader'
import { OPEN_STATUSES, CLOSED_STATUSES } from '@/lib/types'

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
type BusinessProfile = { company_name: string; website_url: string; niche: string; description: string }

const OPEN: string[] = OPEN_STATUSES
const CLOSED: string[] = CLOSED_STATUSES

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const requestId = params.id as string

  const [userId, setUserId] = useState<string|null>(null)
  const [userRole, setUserRole] = useState<string|null>(null)
  const [userEmail, setUserEmail] = useState<string|null>(null)
  const [request, setRequest] = useState<RequestInfo|null>(null)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile|null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      const uid = userData.user.id
      setUserId(uid)
      setUserEmail(userData.user.email || null)
      const role = userData.user.user_metadata?.role
      setUserRole(role)

      const { data: req } = await supabase.from('requests').select('*, authors(name, user_id, status)').eq('id', requestId).single()
      if (!req) { router.push('/'); return }
      setRequest(req as unknown as RequestInfo)

      if (role === 'author') {
        const { data: bp } = await supabase.from('business_profiles').select('*').eq('id', (req as { business_id: string }).business_id).maybeSingle()
        if (bp) setBusinessProfile(bp as BusinessProfile)
      }

      const { data: msgs } = await supabase.from('messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
      setMessages(msgs || [])
      setLoading(false)

      await supabase.from('messages').update({ read: true }).eq('request_id', requestId).neq('sender_id', uid).eq('read', false)
    }
    init()
  }, [requestId, router])

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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${requestId}` }, (payload) => {
        setRequest(prev => prev ? { ...prev, status: (payload.new as { status: string }).status } : prev)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [requestId, userId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!text.trim() || !userId || !userRole) return
    setSending(true)
    const { data, error } = await supabase.from('messages').insert([{
      request_id: requestId,
      sender_id: userId,
      sender_role: userRole,
      text: text.trim(),
    }]).select().single()
    setSending(false)
    if (!error && data) {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as Msg])
      setText('')
    } else {
      toast.error('Не удалось отправить сообщение. Попробуй ещё раз.')
    }
  }

  const updateStatus = async (status: 'accepted' | 'declined' | 'cancelled' | 'completed') => {
    const confirmText: Record<string, string> = {
      declined: 'Сделка будет отклонена, переписка закроется (история останется). Продолжить?',
      cancelled: 'Сделка будет отменена, переписка закроется (история останется). Продолжить?',
      completed: 'Отметить сделку как завершённую? Переписка закроется (история останется).',
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
        completed: 'Сделка завершена 🎉',
      }
      if (successText[status]) toast.success(successText[status])
    } else {
      toast.error('Не удалось обновить статус сделки. Попробуй ещё раз.')
    }
  }

  const startNewDeal = async () => {
    if (!request || !userId) return
    setUpdatingStatus(true)

    // Если уже есть другая открытая сделка с этим автором — переходим в неё
    const { data: existing } = await supabase.from('requests').select('id')
      .eq('business_id', userId).eq('author_id', request.author_id)
      .in("status", OPEN).neq('id', requestId).maybeSingle()

    if (existing) { router.push(`/dashboard/chat/${existing.id}`); return }

    const { data: inserted, error } = await supabase.from('requests').insert([{
      business_id: userId,
      business_email: userEmail,
      author_id: request.author_id,
      message: 'Хотим обсудить новое сотрудничество',
      status: 'new',
    }]).select('id').single()
    setUpdatingStatus(false)
    if (!error && inserted) {
      router.push(`/dashboard/chat/${inserted.id}`)
    } else {
      toast.error('Не удалось создать новый запрос. Попробуй ещё раз.')
    }
  }

  const dashboardLink = userRole === 'author' ? '/dashboard/author' : '/dashboard/business'
  const otherName = userRole === 'author'
    ? (businessProfile?.company_name || request?.business_email)
    : request?.authors?.name
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
  const canChat = !authorRejected && !dealClosed

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <AppHeader />

      <div style={{ maxWidth:'700px', margin:'0 auto', padding:'clamp(16px, 5vw, 24px) clamp(16px, 5vw, 40px)', width:'100%', flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ marginBottom:'12px', display:'flex', alignItems:'center', gap:'12px' }}>
          <Link href={dashboardLink} style={{ fontSize:'14px', color:'#7a7570', textDecoration:'none' }}>← Назад</Link>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'24px', fontWeight:700, color:'#1a1a1a' }}>{otherName}</h1>
        </div>

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

        {(request?.budget || request?.deadline) && (
          <div style={{ padding:'14px 16px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'12px', marginBottom:'16px' }}>
            <div style={{ fontSize:'12px', color:'#9a9590', fontWeight:600, marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Условия сделки</div>
            <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
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
          </div>
        )}

        {sInfo && (
          <div style={{ padding:'10px 16px', background:sInfo.bg, border:`1px solid ${sInfo.border}`, borderRadius:'12px', marginBottom:'16px', fontSize:'13px', fontWeight:600, color:sInfo.color }}>
            {sInfo.text}
          </div>
        )}

        {dealClosed && (
          <div style={{ padding:'14px 16px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'12px', marginBottom:'16px' }}>
            <div style={{ fontSize:'13px', color:'#7a7570', marginBottom: userRole === 'business' ? '12px' : 0 }}>
              Сделка закрыта — переписка доступна только для просмотра.
            </div>
            {userRole === 'business' && (
              <button onClick={startNewDeal} disabled={updatingStatus} style={{ padding:'10px 20px', background:'#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:updatingStatus?'not-allowed':'pointer', fontFamily:'inherit' }}>
                Начать новую сделку
              </button>
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

        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'12px', marginBottom:'20px', minHeight:'300px' }}>
          {request && (
            <div style={{ alignSelf:'flex-start', maxWidth:'80%', padding:'14px 18px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'18px 18px 18px 4px' }}>
              <p style={{ fontSize:'14px', color:'#5a5650', lineHeight:1.6 }}>{request.message}</p>
              <span style={{ fontSize:'11px', color:'#9a9590' }}>Исходный запрос</span>
            </div>
          )}

          {messages.map(m => {
            const isMine = m.sender_id === userId
            return (
              <div key={m.id} style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                padding: '14px 18px',
                background: isMine ? '#1a1a1a' : '#fff',
                color: isMine ? '#fff' : '#1a1a1a',
                border: isMine ? 'none' : '1px solid #e8e6e1',
                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              }}>
                <p style={{ fontSize:'14px', lineHeight:1.6 }}>{m.text}</p>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {canChat && (
          <div style={{ display:'flex', gap:'12px', paddingBottom:'calc(24px + env(safe-area-inset-bottom))' }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Написать сообщение..."
              style={{ flex:1, minWidth:0, padding:'14px 20px', border:'1.5px solid #e0ddd8', borderRadius:'100px', fontSize:'15px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }}
            />
            <button onClick={sendMessage} disabled={sending || !text.trim()} style={{ padding:'14px 28px', background: sending || !text.trim() ? '#9a9590' : '#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'15px', fontWeight:600, cursor: sending || !text.trim() ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
              Отправить
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
