'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useApp } from '../../../AppContext'
import { OPEN_STATUSES, CLOSED_STATUSES } from '@/lib/types'
import { truncate, parseStatusError } from '@/lib/format'

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
    const channel = supabase
      .channel(`messages-${requestId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` }, async (payload) => {
        const newMsg = payload.new as Msg
        setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg])
        if (userId && newMsg.sender_id !== userId) {
          await supabase.from('messages').update({ read: true }).eq('id', newMsg.id)
          // не декрементируем — сообщение пришло пока открыт чат, бейдж не рос
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

  const [confirmAction, setConfirmAction] = useState<'declined'|'cancelled'|'completed'|null>(null)

  const updateStatus = async (status: 'accepted' | 'declined' | 'cancelled' | 'completed') => {
    if (status === 'declined' || status === 'cancelled' || status === 'completed') {
      setConfirmAction(status); return
    }
    setUpdatingStatus(true)
    const { error } = await supabase.from('requests').update({ status }).eq('id', requestId)
    setUpdatingStatus(false)
    if (!error) {
      setRequest(prev => prev ? { ...prev, status } : prev)
      toast.success('Предложение принято')
    } else {
      toast.error(parseStatusError(error))
    }
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
    } else {
      toast.error(parseStatusError(error))
    }
  }

  const startNewDeal = async () => {
    if (!request || !userId) return
    setUpdatingStatus(true)

    // Если уже есть другая открытая сделка с этим автором — переходим в неё
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

  const otherName = userRole === 'author' ? request?.business_email : request?.authors?.name

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
      <div style={{ maxWidth:'700px', margin:'0 auto', padding:'clamp(16px, 5vw, 24px) clamp(16px, 5vw, 40px)', width:'100%', flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ marginBottom:'12px', display:'flex', alignItems:'center', gap:'12px' }}>
          <Link href={`/dashboard/request/${requestId}`} style={{ fontSize:'14px', color:'#7a7570', textDecoration:'none' }}>← Назад</Link>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'24px', fontWeight:700, color:'#1a1a1a' }}>{otherName}</h1>
        </div>

        {request && (
          <div style={{ padding:'14px 16px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'12px', marginBottom:'16px' }}>
            <p style={{ fontSize:'14px', color:'#1a1a1a', fontWeight:600, lineHeight:1.5, marginBottom: (request.budget || request.deadline) ? '10px' : 0 }}>{truncate(request.message, 140)}</p>
            {(request.budget || request.deadline) && (
              <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', paddingTop:'10px', borderTop:'1px solid #f0ede6' }}>
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
          {hasMore && (
            <div style={{ textAlign:'center', padding:'8px 0' }}>
              <button onClick={loadEarlier} disabled={loadingMore} style={{ padding:'6px 16px', background:'#fff', border:'1px solid #e0ddd8', borderRadius:'100px', fontSize:'12px', fontWeight:500, color:'#7a7570', cursor:'pointer', fontFamily:'inherit' }}>
                {loadingMore ? 'Загружаем...' : '↑ Ранние сообщения'}
              </button>
            </div>
          )}
          {messages.length === 0 && (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <p style={{ fontSize:'14px', color:'#9a9590', textAlign:'center', lineHeight:1.6 }}>Сообщений пока нет. Напиши первым, чтобы начать диалог.</p>
            </div>
          )}
          {messages.map(m => {
            const isMine = m.sender_id === userId
            const time = new Date(m.created_at).toLocaleString('ru', { hour:'2-digit', minute:'2-digit', day:'numeric', month:'short' })
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
                <p style={{ fontSize:'11px', color: isMine ? 'rgba(255,255,255,0.5)' : '#9a9590', marginTop:'6px', textAlign:'right' }}>{time}</p>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {canChat && (
          <div style={{ display:'flex', gap:'12px', alignItems:'flex-end', paddingBottom:'calc(24px + env(safe-area-inset-bottom))' }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Написать сообщение..."
              rows={1}
              maxLength={5000}
              style={{ flex:1, minWidth:0, padding:'14px 20px', border:'1.5px solid #e0ddd8', borderRadius:'18px', fontSize:'15px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit', resize:'none', maxHeight:'120px', lineHeight:'1.4' }}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px' }}
            />
            <button onClick={sendMessage} disabled={sending || !text.trim()} style={{ padding:'14px 28px', background: sending || !text.trim() ? '#9a9590' : '#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'15px', fontWeight:600, cursor: sending || !text.trim() ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
              Отправить
            </button>
          </div>
        )}
      </div>

      {confirmAction && (
        <div onClick={() => setConfirmAction(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'28px', maxWidth:'380px', width:'100%' }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'10px' }}>
              {confirmAction === 'declined' ? 'Отклонить заявку?' : confirmAction === 'cancelled' ? 'Отменить сделку?' : 'Завершить сделку?'}
            </h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'20px', lineHeight:1.6 }}>
              {confirmAction === 'completed' ? 'Сделка будет отмечена как завершённая. Переписка закроется.' : 'Переписка закроется. История сообщений останется доступна.'}
            </p>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setConfirmAction(null)} style={{ flex:1, padding:'11px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit', color:'#1a1a1a' }}>Назад</button>
              <button onClick={confirmStatusUpdate} disabled={updatingStatus} style={{ flex:1, padding:'11px', border:'none', borderRadius:'100px', background: confirmAction === 'completed' ? '#16a34a' : '#dc2626', color:'#fff', cursor:updatingStatus?'not-allowed':'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit' }}>
                {updatingStatus ? '...' : confirmAction === 'declined' ? 'Отклонить' : confirmAction === 'cancelled' ? 'Отменить' : 'Завершить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

