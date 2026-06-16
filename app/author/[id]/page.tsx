'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import { useToast } from '@/components/Toast'

type Author = {
  id: string
  name: string
  city: string
  instagram_url: string
  followers_count: number
  stories_views: number
  occupation: string
  lifestyle: string[]
  hobbies: string
  bio: string
  open_to_barter: boolean
  avatar_url: string | null
  status: string
}

export default function AuthorPublicPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const authorId = params.id as string

  const [author, setAuthor] = useState<Author|null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string|null>(null)
  const [userRole, setUserRole] = useState<string|null>(null)
  const [userEmail, setUserEmail] = useState<string|null>(null)
  const [hasOpenDeal, setHasOpenDeal] = useState<string|null>(null)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: a } = await supabase.from('authors').select('*').eq('id', authorId).eq('status', 'approved').single()
      if (!a) { router.push('/catalog'); return }
      setAuthor(a as Author)

      const { data: u } = await supabase.auth.getUser()
      if (u.user) {
        setUserId(u.user.id)
        setUserEmail(u.user.email || null)
        setUserRole(u.user.user_metadata?.role || null)
        if (u.user.user_metadata?.role === 'business') {
          const { data: deal } = await supabase.from('requests').select('id').eq('business_id', u.user.id).eq('author_id', authorId).in('status', ['new','viewed','accepted']).maybeSingle()
          if (deal) setHasOpenDeal(deal.id)
        }
      }
      setLoading(false)
    }
    init()
  }, [authorId, router])

  const sendRequest = async () => {
    if (!userId || !userEmail || !message.trim()) return
    setSending(true)
    const { data: inserted, error } = await supabase.from('requests').insert([{
      business_id: userId,
      business_email: userEmail,
      author_id: authorId,
      message: message.trim(),
      budget: budget.trim() || null,
      deadline: deadline || null,
      status: 'new',
    }]).select('id').single()
    setSending(false)
    if (error || !inserted) { toast.error('Не удалось отправить. Попробуй ещё раз.'); return }
    router.push(`/dashboard/request/${inserted.id}`)
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Загрузка...</div>
  if (!author) return null

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <AppHeader />

      <div style={{ maxWidth:'680px', margin:'0 auto', padding:'clamp(24px, 6vw, 48px) clamp(16px, 5vw, 40px)' }}>

        {/* Шапка профиля */}
        <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px', marginBottom:'16px' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:'20px', marginBottom:'20px' }}>
            {/* Аватар */}
            <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'#f0ede6', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px' }}>
              {author.avatar_url
                ? <img src={author.avatar_url} alt={author.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : '👤'
              }
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', marginBottom:'6px' }}>
                <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'28px', fontWeight:700, color:'#1a1a1a' }}>{author.name}</h1>
                {author.open_to_barter && <span style={{ padding:'4px 10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', fontSize:'12px', fontWeight:600, color:'#16a34a' }}>Бартер</span>}
              </div>
              <div style={{ fontSize:'14px', color:'#9a9590' }}>📍 {author.city}</div>
              {author.occupation && <div style={{ fontSize:'14px', color:'#5a5650', marginTop:'4px', fontWeight:500 }}>💼 {author.occupation}</div>}
            </div>
          </div>

          {/* Статистика */}
          {(author.followers_count > 0 || author.stories_views > 0) && (
            <div style={{ display:'flex', gap:'24px', padding:'16px 0', borderTop:'1px solid #f0ede6', borderBottom:'1px solid #f0ede6', marginBottom:'20px' }}>
              {author.followers_count > 0 && (
                <div>
                  <div style={{ fontSize:'22px', fontWeight:700, color:'#1a1a1a' }}>{author.followers_count.toLocaleString('ru')}</div>
                  <div style={{ fontSize:'12px', color:'#9a9590' }}>подписчиков</div>
                </div>
              )}
              {author.stories_views > 0 && (
                <div>
                  <div style={{ fontSize:'22px', fontWeight:700, color:'#1a1a1a' }}>{author.stories_views.toLocaleString('ru')}</div>
                  <div style={{ fontSize:'12px', color:'#9a9590' }}>просм. сторис</div>
                </div>
              )}
            </div>
          )}

          {/* Биография */}
          {author.bio && <p style={{ fontSize:'15px', color:'#5a5650', lineHeight:1.7, marginBottom:'16px' }}>{author.bio}</p>}

          {/* Теги стиля жизни */}
          {author.lifestyle?.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'16px' }}>
              {author.lifestyle.map(tag => (
                <span key={tag} style={{ padding:'5px 12px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', fontWeight:500 }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Хобби */}
          {author.hobbies && (
            <div style={{ fontSize:'14px', color:'#7a7570', marginBottom:'16px' }}>
              <span style={{ fontWeight:600, color:'#5a5650' }}>Хобби: </span>{author.hobbies}
            </div>
          )}

          {/* Кнопки */}
          <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
            {author.instagram_url && (
              <a href={author.instagram_url} target="_blank" rel="noopener noreferrer" style={{ padding:'10px 20px', border:'1.5px solid #e0ddd8', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'14px', fontWeight:500 }}>
                Instagram →
              </a>
            )}
            {userRole === 'business' && (
              hasOpenDeal ? (
                <Link href={`/dashboard/request/${hasOpenDeal}`} style={{ padding:'10px 20px', background:'#f0ede6', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'14px', fontWeight:600 }}>
                  Перейти к заявке
                </Link>
              ) : (
                <button onClick={() => setModalOpen(true)} style={{ padding:'10px 24px', background:'#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  Написать
                </button>
              )
            )}
            {!userId && (
              <Link href="/register" style={{ padding:'10px 20px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>
                Войти чтобы написать
              </Link>
            )}
          </div>
        </div>

        <div style={{ textAlign:'center' }}>
          <Link href="/catalog" style={{ fontSize:'14px', color:'#9a9590', textDecoration:'none' }}>← Вернуться в каталог</Link>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'32px', maxWidth:'480px', width:'100%' }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:'24px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Написать {author.name}</h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'20px', lineHeight:1.6 }}>Расскажи коротко что предлагаешь — автор увидит сообщение в личном кабинете.</p>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Например: предлагаем сотрудничество — обзор нашего продукта за бартер..." style={{ width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'15px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', resize:'vertical', marginBottom:'12px' }} />
            <div style={{ display:'flex', gap:'12px', marginBottom:'16px' }}>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:'12px', color:'#9a9590', marginBottom:'6px', fontWeight:500 }}>Бюджет (опционально)</label>
                <input value={budget} onChange={e => setBudget(e.target.value)} placeholder="напр. 5000 ₽ или бартер" style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e0ddd8', borderRadius:'10px', fontSize:'14px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:'12px', color:'#9a9590', marginBottom:'6px', fontWeight:500 }}>Срок (опционально)</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e0ddd8', borderRadius:'10px', fontSize:'14px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:'12px' }}>
              <button onClick={() => setModalOpen(false)} style={{ flex:1, padding:'12px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit', color:'#1a1a1a' }}>Отмена</button>
              <button onClick={sendRequest} disabled={sending || !message.trim()} style={{ flex:1, padding:'12px', border:'none', borderRadius:'100px', background: sending || !message.trim() ? '#9a9590' : '#1a1a1a', color:'#fff', cursor: sending || !message.trim() ? 'not-allowed' : 'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit' }}>
                {sending ? 'Отправляем...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
