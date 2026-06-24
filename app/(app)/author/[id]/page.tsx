'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useApp } from '../../AppContext'
import { ProfileSkeleton } from '@/components/Skeleton'
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

  if (loading) return <ProfileSkeleton />
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
  const inp = { width:'100%', padding:'10px 14px', border:'1.5px solid #e0ddd8', borderRadius:'10px', fontSize:'14px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .author-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth:'920px', margin:'0 auto', padding:'clamp(20px, 4vw, 36px) clamp(16px, 5vw, 40px)' }}>

        {/* Назад */}
        <div style={{ marginBottom:'16px' }}>
          <Link href="/catalog" style={{ fontSize:'13px', color:'#9a9590', textDecoration:'none' }}>← Каталог</Link>
        </div>

        {/* Two-column grid */}
        <div className="author-grid" style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'16px', alignItems:'start' }}>

          {/* ═══ LEFT COLUMN ═══ */}
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', overflow:'hidden', position:'sticky', top:'20px' }}>

            {/* Gradient header + avatar */}
            <div style={{ height:'100px', background: HEADER_GRADIENTS[ci], position:'relative' }}>
              <div style={{ position:'absolute', bottom:'-36px', left:'50%', transform:'translateX(-50%)' }}>
                <div style={{ width:'80px', height:'80px', borderRadius:'50%', overflow:'hidden', background:AVATAR_BG[ci], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:700, color:AVATAR_TEXT[ci], border:'4px solid #fff', boxShadow:'0 2px 12px rgba(0,0,0,0.1)' }}>
                  {author.avatar_url ? <img src={author.avatar_url} alt={author.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : initial}
                </div>
              </div>
            </div>

            {/* Info */}
            <div style={{ padding:'44px 20px 20px', textAlign:'center' }}>
              <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', margin:'0 0 4px' }}>{author.name}</h1>
              <div style={{ fontSize:'13px', color:'#9a9590', marginBottom:'12px' }}>
                📍 {author.city}{author.occupation ? ` · ${author.occupation}` : ''}
              </div>

              {/* Badges */}
              <div style={{ display:'flex', justifyContent:'center', gap:'6px', flexWrap:'wrap', marginBottom:'16px' }}>
                {author.open_to_barter && <span style={{ padding:'3px 10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#16a34a' }}>✓ Бартер</span>}
                {author.avg_rating && <span style={{ padding:'3px 10px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#c17f3e' }}>★ {author.avg_rating} · {author.reviews_count} отз.</span>}
                {!author.avg_rating && author.completed_deals_count > 0 && <span style={{ padding:'3px 10px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#c17f3e' }}>{author.completed_deals_count} {author.completed_deals_count === 1 ? 'сделка' : 'сделок'}</span>}
              </div>

              {/* Stats mini */}
              <div style={{ display:'flex', justifyContent:'center', gap:'0', borderTop:'1px solid #f0ede6', borderBottom:'1px solid #f0ede6', margin:'0 -20px', padding:'0' }}>
                {author.followers_count > 0 && (
                  <div style={{ flex:1, padding:'10px 6px', textAlign:'center', borderRight:'1px solid #f0ede6' }}>
                    <div style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a' }}>{author.followers_count.toLocaleString('ru')}</div>
                    <div style={{ fontSize:'10px', color:'#9a9590' }}>подписч.</div>
                  </div>
                )}
                {author.stories_views > 0 && (
                  <div style={{ flex:1, padding:'10px 6px', textAlign:'center', borderRight: author.completed_deals_count > 0 ? '1px solid #f0ede6' : 'none' }}>
                    <div style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a' }}>{author.stories_views.toLocaleString('ru')}</div>
                    <div style={{ fontSize:'10px', color:'#9a9590' }}>сторис</div>
                  </div>
                )}
                {author.completed_deals_count > 0 && (
                  <div style={{ flex:1, padding:'10px 6px', textAlign:'center' }}>
                    <div style={{ fontSize:'16px', fontWeight:700, color:'#c17f3e' }}>{author.completed_deals_count}</div>
                    <div style={{ fontSize:'10px', color:'#9a9590' }}>сделок</div>
                  </div>
                )}
              </div>

              {/* Social links */}
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', padding:'14px 0 0' }}>
                {author.instagram_url && (
                  <a href={author.instagram_url} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'8px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'13px', color:'#1a1a1a', textDecoration:'none', fontWeight:500 }}>📸 Instagram</a>
                )}
                {author.telegram_url && (
                  <a href={author.telegram_url} target="_blank" rel="noopener noreferrer" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', padding:'8px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'13px', color:'#1a1a1a', textDecoration:'none', fontWeight:500 }}>✈️ Telegram</a>
                )}
              </div>

              {/* CTA */}
              <div style={{ padding:'14px 0 0' }}>
                {userRole === 'business' && (
                  hasOpenDeal ? (
                    <Link href={`/dashboard/request/${hasOpenDeal}`} style={{ display:'block', padding:'12px', background:'#f0ede6', borderRadius:'12px', textDecoration:'none', color:'#1a1a1a', fontSize:'14px', fontWeight:600, textAlign:'center' }}>К заявке →</Link>
                  ) : (
                    <button onClick={() => { if (!businessProfile?.company_name || !businessProfile?.inn) { toast.error('Сначала заполни профиль компании'); return }; setModalOpen(true) }} style={{ width:'100%', padding:'12px', background:'#C56A43', border:'none', borderRadius:'12px', color:'#fff', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Написать</button>
                  )
                )}
                {!userId && (
                  <Link href="/register" style={{ display:'block', padding:'12px', background:'#C56A43', borderRadius:'12px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600, textAlign:'center' }}>Войти чтобы написать</Link>
                )}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            {/* О себе */}
            {author.bio && (
              <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'24px' }}>
                <h2 style={{ fontFamily:'Fraunces, serif', fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'12px' }}>О себе</h2>
                <p style={{ fontSize:'14px', color:'#5a5650', lineHeight:1.7, margin:0, whiteSpace:'pre-line' }}>{author.bio}</p>
              </div>
            )}

            {/* Стиль жизни */}
            {author.lifestyle?.length > 0 && (
              <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'24px' }}>
                <h2 style={{ fontFamily:'Fraunces, serif', fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'12px' }}>Стиль жизни</h2>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {author.lifestyle.map(tag => {
                    const tc = TAG_COLORS[tag] || defaultTag
                    return <span key={tag} style={{ padding:'5px 14px', background:tc.bg, border:`1px solid ${tc.border}`, borderRadius:'100px', fontSize:'13px', color:tc.color, fontWeight:600 }}>{tag}</span>
                  })}
                </div>
              </div>
            )}

            {/* Хобби */}
            {author.hobbies && (
              <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'24px' }}>
                <h2 style={{ fontFamily:'Fraunces, serif', fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'12px' }}>Хобби</h2>
                <p style={{ fontSize:'14px', color:'#5a5650', margin:0 }}>{author.hobbies}</p>
              </div>
            )}

            {/* Telegram stats */}
            {author.telegram_followers > 0 && (
              <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'24px', display:'flex', alignItems:'center', gap:'16px' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'#9a9590', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>Telegram-канал</div>
                  <div style={{ fontSize:'24px', fontWeight:700, color:'#1a1a1a' }}>{author.telegram_followers.toLocaleString('ru')} <span style={{ fontSize:'14px', fontWeight:500, color:'#9a9590' }}>подписчиков</span></div>
                </div>
              </div>
            )}

            {/* Отзывы */}
            {author.reviews_count > 0 && (
              <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'24px' }}>
                <h2 style={{ fontFamily:'Fraunces, serif', fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'16px' }}>
                  Отзывы
                  {author.avg_rating && <span style={{ fontSize:'15px', fontWeight:500, color:'#c17f3e', marginLeft:'8px' }}>★ {author.avg_rating}</span>}
                </h2>
                <ReviewsList authorId={author.id} avgRating={author.avg_rating} reviewsCount={author.reviews_count} currentUserId={userId} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div onClick={() => setModalOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'28px', maxWidth:'480px', width:'100%' }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Написать {author.name}</h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'16px', lineHeight:1.6 }}>Расскажи что предлагаешь — автор увидит в кабинете.</p>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={3000} placeholder="Предлагаем сотрудничество..." style={{ width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'14px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', resize:'vertical', marginBottom:'12px' }} />
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
              <button onClick={sendRequest} disabled={sending || !message.trim()} style={{ flex:1, padding:'11px', border:'none', borderRadius:'100px', background: sending || !message.trim() ? '#9a9590' : '#C56A43', color:'#fff', cursor: sending || !message.trim() ? 'not-allowed' : 'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit' }}>
                {sending ? 'Отправляем...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

