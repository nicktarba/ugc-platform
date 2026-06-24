'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useApp } from '../../AppContext'
import ReviewsList from '@/components/ReviewsList'

type Author = {
  id: string; name: string; city: string
  instagram_url: string; telegram_url: string | null
  followers_count: number; telegram_followers: number; stories_views: number
  occupation: string; lifestyle: string[]; hobbies: string; bio: string
  open_to_barter: boolean; avatar_url: string | null
  completed_deals_count: number; avg_rating: number | null; reviews_count: number
}

const AVATAR_BG   = ['#fdf3e7','#e8f4fd','#f0fdf4','#fdf4ff','#fff0f0']
const AVATAR_TEXT = ['#c17f3e','#1a6fa8','#16a34a','#7c3aed','#dc2626']

export default function AuthorPublicPage() {
  const params = useParams()
  const router = useRouter()
  const toast = useToast()
  const { userId, userEmail, userRole, businessProfile } = useApp()
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

  useEffect(() => {
    const init = async () => {
      const { data: a } = await supabase.from('authors').select('id, name, city, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, avatar_url, completed_deals_count, avg_rating, reviews_count').eq('id', authorId).eq('status', 'approved').single()
      if (!a) { setNotFound(true); setLoading(false); return }
      setAuthor(a as Author)
      if (userId && userRole === 'business') {
        const { data: deal } = await supabase.from('requests').select('id').eq('business_id', userId).eq('author_id', authorId).in('status', ['new','viewed','accepted']).maybeSingle()
        if (deal) setHasOpenDeal(deal.id)
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
    router.push(`/dashboard/request/${inserted.id}`)
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh', color:'#9a9590' }}>Загрузка...</div>
  if (notFound) return (
    <main style={{ background:'#fafaf9', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', maxWidth:'400px', padding:'40px 20px' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔍</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'28px', fontWeight:700, color:'#1a1a1a', marginBottom:'10px' }}>Автор не найден</h1>
        <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'24px', lineHeight:1.6 }}>Возможно, профиль был удалён или ещё не прошёл модерацию.</p>
        <Link href="/catalog" style={{ display:'inline-block', padding:'12px 28px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Перейти в каталог</Link>
      </div>
    </main>
  )
  if (!author) return null

  const ci = author.id.charCodeAt(0) % 5
  const initial = author.name?.[0]?.toUpperCase() || '?'
  const deals = author.completed_deals_count || 0

  const inp = { width:'100%', padding:'10px 14px', border:'1.5px solid #e0ddd8', borderRadius:'10px', fontSize:'14px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'720px', margin:'0 auto', padding:'clamp(20px, 4vw, 36px) clamp(16px, 5vw, 40px)' }}>

        <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', overflow:'hidden', marginBottom:'12px' }}>

          {/* Шапка */}
          <div style={{ padding:'24px', borderBottom:'1px solid #f0ede6' }}>
            <div style={{ display:'flex', gap:'16px', alignItems:'flex-start' }}>

              <div style={{ width:'72px', height:'72px', borderRadius:'50%', overflow:'hidden', flexShrink:0, background:AVATAR_BG[ci], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', fontWeight:700, color:AVATAR_TEXT[ci] }}>
                {author.avatar_url ? <img src={author.avatar_url} alt={author.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : initial}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'6px' }}>
                  <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'24px', fontWeight:700, color:'#1a1a1a', margin:0 }}>{author.name}</h1>
                  {author.open_to_barter && <span style={{ padding:'2px 8px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#16a34a' }}>Бартер</span>}
                  {author.avg_rating && <span style={{ padding:'2px 8px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#c17f3e' }}>★ {author.avg_rating} · {author.reviews_count} отз.</span>}
                  {!author.avg_rating && author.completed_deals_count > 0 && <span style={{ padding:'2px 8px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#c17f3e' }}>★ {author.completed_deals_count} {author.completed_deals_count === 1 ? 'сделка' : author.completed_deals_count < 5 ? 'сделки' : 'сделок'}</span>}
                </div>
                <div style={{ fontSize:'13px', color:'#9a9590', marginBottom:'10px' }}>
                  {author.city && <>📍 {author.city}</>}{author.occupation && <> · {author.occupation}</>}
                </div>

                {/* Соцсети */}
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {author.instagram_url && (
                    <a href={author.instagram_url} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 12px', border:'1.5px solid #e0ddd8', borderRadius:'100px', fontSize:'12px', color:'#1a1a1a', textDecoration:'none', fontWeight:500 }}>
                      <span style={{ fontSize:'14px' }}>📸</span> Instagram
                    </a>
                  )}
                  {author.telegram_url && (
                    <a href={author.telegram_url} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 12px', border:'1.5px solid #e0ddd8', borderRadius:'100px', fontSize:'12px', color:'#1a1a1a', textDecoration:'none', fontWeight:500 }}>
                      <span style={{ fontSize:'14px' }}>✈️</span> Telegram
                    </a>
                  )}
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 12px', border:'1.5px solid #e8e6e1', borderRadius:'100px', fontSize:'12px', color:'#c0bdb8', fontWeight:400 }}>
                    ВК · скоро
                  </span>
                </div>
              </div>

              <div style={{ flexShrink:0 }}>
                {userRole === 'business' && (
                  hasOpenDeal ? (
                    <Link href={`/dashboard/request/${hasOpenDeal}`} style={{ display:'block', padding:'9px 20px', background:'#f0ede6', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'13px', fontWeight:600, whiteSpace:'nowrap' }}>К заявке</Link>
                  ) : (
                    <button onClick={() => { if (!businessProfile?.company_name || !businessProfile?.inn) { toast.error('Сначала заполни профиль компании'); return }; setModalOpen(true) }} style={{ padding:'9px 20px', background:'#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>Написать</button>
                  )
                )}
                {!userId && (
                  <Link href="/register" style={{ display:'block', padding:'9px 20px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'13px', fontWeight:600, whiteSpace:'nowrap' }}>Войти</Link>
                )}
              </div>
            </div>
          </div>

          {/* Статистика */}
          {(author.followers_count > 0 || author.telegram_followers > 0 || author.stories_views > 0 || author.completed_deals_count > 0) && (
            <div style={{ padding:'0', borderBottom:'1px solid #f0ede6', display:'flex', flexWrap:'wrap' }}>
              {author.followers_count > 0 && (
                <div style={{ flex:'1 1 100px', padding:'14px 20px', borderRight:'1px solid #f0ede6' }}>
                  <div style={{ fontSize:'11px', color:'#9a9590', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>Instagram</div>
                  <div style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a' }}>{author.followers_count.toLocaleString('ru')}</div>
                  <div style={{ fontSize:'12px', color:'#9a9590' }}>подписчиков</div>
                </div>
              )}
              {author.telegram_followers > 0 && (
                <div style={{ flex:'1 1 100px', padding:'14px 20px', borderRight:'1px solid #f0ede6' }}>
                  <div style={{ fontSize:'11px', color:'#9a9590', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>Telegram</div>
                  <div style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a' }}>{author.telegram_followers.toLocaleString('ru')}</div>
                  <div style={{ fontSize:'12px', color:'#9a9590' }}>подписчиков</div>
                </div>
              )}
              {author.stories_views > 0 && (
                <div style={{ flex:'1 1 100px', padding:'14px 20px', borderRight: author.completed_deals_count > 0 ? '1px solid #f0ede6' : 'none' }}>
                  <div style={{ fontSize:'11px', color:'#9a9590', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>Сторис</div>
                  <div style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a' }}>{author.stories_views.toLocaleString('ru')}</div>
                  <div style={{ fontSize:'12px', color:'#9a9590' }}>просм. в среднем</div>
                </div>
              )}
              {author.completed_deals_count > 0 && (
                <div style={{ flex:'1 1 100px', padding:'14px 20px' }}>
                  <div style={{ fontSize:'11px', color:'#9a9590', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>Сделки</div>
                  <div style={{ fontSize:'20px', fontWeight:700, color:'#c17f3e' }}>
                    {author.avg_rating ? `★ ${author.avg_rating}` : author.completed_deals_count}
                  </div>
                  <div style={{ fontSize:'12px', color:'#9a9590' }}>
                    {author.avg_rating ? `${author.completed_deals_count} завершено` : 'завершено'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Био + теги */}
          {(author.bio || author.lifestyle?.length > 0) && (
            <div style={{ padding:'18px 24px', borderBottom: author.hobbies ? '1px solid #f0ede6' : 'none' }}>
              {author.bio && <p style={{ fontSize:'14px', color:'#5a5650', lineHeight:1.7, margin:'0 0 12px' }}>{author.bio}</p>}
              {author.lifestyle?.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  {author.lifestyle.map(tag => (
                    <span key={tag} style={{ padding:'4px 10px', background:'#f0ede6', borderRadius:'100px', fontSize:'12px', color:'#7a7570', fontWeight:500 }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Хобби */}
          {author.hobbies && (
            <div style={{ padding:'14px 24px' }}>
              <span style={{ fontSize:'13px', color:'#9a9590' }}>Хобби: </span>
              <span style={{ fontSize:'13px', color:'#5a5650' }}>{author.hobbies}</span>
            </div>
          )}
        </div>

        <div style={{ textAlign:'center', paddingTop:'4px' }}>
          <Link href="/catalog" style={{ fontSize:'13px', color:'#9a9590', textDecoration:'none' }}>← Вернуться в каталог</Link>
        </div>

        {/* Отзывы — публичные */}
        {(author.reviews_count > 0) && (
          <div style={{ marginTop: '24px' }}>
            <h2 style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', marginBottom:'16px' }}>
              Отзывы
            </h2>
            <ReviewsList
              authorId={author.id}
              avgRating={author.avg_rating}
              reviewsCount={author.reviews_count}
              currentUserId={userId}
            />
          </div>
        )}
      </div>

      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'28px', maxWidth:'480px', width:'100%' }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Написать {author.name}</h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'16px', lineHeight:1.6 }}>Расскажи что предлагаешь — автор увидит в кабинете.</p>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Предлагаем сотрудничество..." style={{ width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'14px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', resize:'vertical', marginBottom:'12px' }} />
            <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:'12px', color:'#9a9590', marginBottom:'5px', fontWeight:500 }}>Бюджет</label>
                <input value={budget} onChange={e => setBudget(e.target.value)} placeholder="напр. 5000 ₽" style={inp} />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:'12px', color:'#9a9590', marginBottom:'5px', fontWeight:500 }}>Срок</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inp} />
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setModalOpen(false)} style={{ flex:1, padding:'11px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit', color:'#1a1a1a' }}>Отмена</button>
              <button onClick={sendRequest} disabled={sending || !message.trim()} style={{ flex:1, padding:'11px', border:'none', borderRadius:'100px', background: sending || !message.trim() ? '#9a9590' : '#1a1a1a', color:'#fff', cursor: sending || !message.trim() ? 'not-allowed' : 'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit' }}>
                {sending ? 'Отправляем...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

