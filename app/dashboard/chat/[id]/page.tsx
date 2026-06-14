'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Msg = { id: string; sender_id: string; sender_role: string; text: string; created_at: string; read: boolean }
type RequestInfo = {
  id: string
  message: string
  business_email: string
  author_id: string
  business_id: string
  authors: { name: string; user_id: string } | null
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const [userId, setUserId] = useState<string|null>(null)
  const [userRole, setUserRole] = useState<string|null>(null)
  const [request, setRequest] = useState<RequestInfo|null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) { router.push('/login'); return }
      const uid = userData.user.id
      setUserId(uid)
      const role = userData.user.user_metadata?.role
      setUserRole(role)

      const { data: req } = await supabase.from('requests').select('*, authors(name, user_id)').eq('id', requestId).single()
      if (!req) { router.push('/'); return }
      setRequest(req as unknown as RequestInfo)

      const { data: msgs } = await supabase.from('messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true })
      setMessages(msgs || [])
      setLoading(false)

      // Mark incoming messages as read
      await supabase.from('messages').update({ read: true }).eq('request_id', requestId).neq('sender_id', uid).eq('read', false)
    }
    init()
  }, [requestId, router])

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${requestId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` }, async (payload) => {
        const newMsg = payload.new as Msg
        setMessages(prev => [...prev, newMsg])
        if (userId && newMsg.sender_id !== userId) {
          await supabase.from('messages').update({ read: true }).eq('id', newMsg.id)
        }
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
    const { error } = await supabase.from('messages').insert([{
      request_id: requestId,
      sender_id: userId,
      sender_role: userRole,
      text: text.trim(),
    }])
    setSending(false)
    if (!error) setText('')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const dashboardLink = userRole === 'author' ? '/dashboard/author' : '/dashboard/business'
  const otherName = userRole === 'author' ? request?.business_email : request?.authors?.name

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Загрузка...</div>

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 40px', borderBottom:'1px solid #e8e6e1', background:'#fafaf9' }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>
        <button onClick={handleLogout} style={{ padding:'8px 20px', border:'1px solid #d4d0c8', borderRadius:'100px', background:'none', cursor:'pointer', fontSize:'14px', fontFamily:'inherit', color:'#1a1a1a' }}>Выйти</button>
      </nav>

      <div style={{ maxWidth:'700px', margin:'0 auto', padding:'24px 40px', width:'100%', flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ marginBottom:'20px', display:'flex', alignItems:'center', gap:'12px' }}>
          <Link href={dashboardLink} style={{ fontSize:'14px', color:'#7a7570', textDecoration:'none' }}>← Назад</Link>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'24px', fontWeight:700, color:'#1a1a1a' }}>{otherName}</h1>
        </div>

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

        <div style={{ display:'flex', gap:'12px', paddingBottom:'24px' }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Написать сообщение..."
            style={{ flex:1, padding:'14px 20px', border:'1.5px solid #e0ddd8', borderRadius:'100px', fontSize:'15px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }}
          />
          <button onClick={sendMessage} disabled={sending || !text.trim()} style={{ padding:'14px 28px', background: sending || !text.trim() ? '#9a9590' : '#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'15px', fontWeight:600, cursor: sending || !text.trim() ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
            Отправить
          </button>
        </div>
      </div>
    </main>
  )
}
