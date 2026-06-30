'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import { useToast } from '@/components/Toast'
import { useApp } from '../../../AppContext'

type Author = { id:string; name:string; city:string; instagram_url:string; telegram_url:string|null; followers_count:number; telegram_followers:number; stories_views:number; occupation:string; lifestyle:string[]; bio:string; open_to_barter:boolean; avatar_url:string|null; status:string; avg_rating:number|null; completed_deals_count:number }

export default function FavoritesPage() {
  const router = useRouter()
  const toast = useToast()
  const { userId, userEmail, businessProfile } = useApp()
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalAuthor, setModalAuthor] = useState<Author|null>(null)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sending, setSending] = useState(false)
  const [requestMap, setRequestMap] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data: favs } = await supabase.from('favorites').select('author_id').eq('business_id', userId)
      const ids = (favs || []).map(f => f.author_id)

      if (ids.length > 0) {
        const { data: a } = await supabase.from('authors').select('id, name, city, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, avatar_url, status, completed_deals_count, avg_rating, reviews_count').in('id', ids)
        setAuthors(a || [])
      }

      const { data: reqs } = await supabase.from('requests').select('id, author_id').eq('business_id', userId).in('status', ['new','viewed','accepted'])
      const map: Record<string, string> = {}
      reqs?.forEach(r => { map[r.author_id] = r.id })
      setRequestMap(map)

      setLoading(false)
    })()
  }, [userId])

  const removeFavorite = async (authorId: string) => {
    if (!userId) return
    const { error } = await supabase.from('favorites').delete().eq('business_id', userId).eq('author_id', authorId)
    if (error) { toast.error('Не удалось убрать из избранного.'); return }
    setAuthors(authors.filter(a => a.id !== authorId))
  }

  const openModal = (author: Author) => {
    if (!businessProfile?.company_name || !businessProfile?.inn) {
      toast.error('Сначала заполни профиль компании')
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
    const { data: inserted, error: err } = await supabase.from('requests').insert([{
      business_id: userId,
      business_email: userEmail,
      author_id: modalAuthor.id,
      message: message.trim(),
      budget: budget.trim() || null,
      deadline: deadline || null,
      status: 'new',
    }]).select('id').single()
    setSending(false)
    if (err || !inserted) { setError('Не получилось отправить. Попробуй ещё раз.'); return }
    router.push(`/dashboard/request/${inserted.id}`)
  }

  if (loading) return <LoadingScreen />

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'clamp(28px, 7vw, 48px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'12px', display:'flex', alignItems:'center', gap:'12px' }}>
          <Link href="/dashboard/business" style={{ fontSize:'14px', color:'#7a7570', textDecoration:'none' }}>← Кабинет</Link>
        </div>
        <div style={{ marginBottom:'32px' }}>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a' }}>Избранные авторы</h1>
        </div>

        {authors.length === 0 ? (
          <div style={{ textAlign:'center', padding:'clamp(32px, 10vw, 80px) clamp(20px, 6vw, 40px)', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>⭐️</div>
            <p style={{ color:'#7a7570', fontSize:'16px', marginBottom:'20px' }}>Пока пусто. Сохраняй авторов из каталога, чтобы собрать шортлист.</p>
            <Link href="/catalog" style={{ padding:'12px 32px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600, whiteSpace:'nowrap', display:'inline-block' }}>Открыть каталог</Link>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap:'16px' }}>
            {authors.map(a => {
              const ci = a.id.charCodeAt(0) % 5
              const GRADIENTS = ['linear-gradient(135deg, #f0e6d6 0%, #e8d5c0 100%)','linear-gradient(135deg, #d6e8f0 0%, #c0d5e8 100%)','linear-gradient(135deg, #e6f0d6 0%, #d0e0c0 100%)','linear-gradient(135deg, #f0d6e6 0%, #e8c0d5 100%)','linear-gradient(135deg, #e6d6f0 0%, #d5c0e8 100%)']
              const ABG = ['#fdf3e7','#e8f4fd','#f0fdf4','#fdf4ff','#fff0f0']
              const ATC = ['#c17f3e','#1a6fa8','#16a34a','#7c3aed','#dc2626']
              const initial = a.name?.[0]?.toUpperCase() || '?'
              const hasStats = a.followers_count > 0 || a.stories_views > 0 || a.completed_deals_count > 0
              return (
                <div key={a.id} style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', overflow:'hidden', display:'flex', flexDirection:'column' }}>
                  <div style={{ position:'relative', height:'80px', background: GRADIENTS[ci] }}>
                    <button onClick={() => removeFavorite(a.id)} style={{ position:'absolute', top:'10px', right:'10px', width:'32px', height:'32px', borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.85)', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', color:'#dc2626' }}>✕</button>
                    <Link href={`/author/${a.id}`} style={{ textDecoration:'none', position:'absolute', bottom:'-28px', left:'20px' }}>
                      <div style={{ width:'64px', height:'64px', borderRadius:'50%', overflow:'hidden', background:ABG[ci], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:700, color:ATC[ci], border:'3px solid #fff', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
                        {a.avatar_url ? <img src={a.avatar_url} alt={a.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : initial}
                      </div>
                    </Link>
                  </div>
                  <div style={{ padding:'36px 20px 0', flex:1, display:'flex', flexDirection:'column' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'4px' }}>
                      <Link href={`/author/${a.id}`} style={{ textDecoration:'none' }}><span style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a' }}>{a.name}</span></Link>
                      {a.open_to_barter && <span style={{ padding:'2px 7px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', fontSize:'10px', fontWeight:600, color:'#16a34a' }}>Бартер</span>}
                      {(a.avg_rating || a.completed_deals_count > 0) && <span style={{ padding:'2px 7px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'100px', fontSize:'10px', fontWeight:600, color:'#c17f3e' }}>{a.avg_rating ? `★ ${a.avg_rating}` : `${a.completed_deals_count} сд.`}</span>}
                    </div>
                    <div style={{ fontSize:'13px', color:'#9a9590', marginBottom:'12px' }}>📍 {a.city}{a.occupation ? ` · ${a.occupation}` : ''}</div>
                    {a.bio && <p style={{ fontSize:'13px', color:'#5a5650', lineHeight:1.5, marginBottom:'12px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>{a.bio}</p>}
                    {a.status !== 'approved' && (
                      <div style={{ padding:'8px 12px', background:'#f0ede6', borderRadius:'10px', fontSize:'12px', color:'#9a9590', marginBottom:'12px' }}>Анкета недоступна</div>
                    )}
                    <div style={{ flex:1 }} />
                    {hasStats && (
                      <div style={{ display:'flex', borderTop:'1px solid #f0ede6', margin:'0 -20px' }}>
                        {a.followers_count > 0 && <div style={{ flex:1, padding:'12px 0', textAlign:'center', borderRight:'1px solid #f0ede6' }}><div style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a' }}>{a.followers_count.toLocaleString('ru')}</div><div style={{ fontSize:'11px', color:'#9a9590' }}>подписч.</div></div>}
                        {a.stories_views > 0 && <div style={{ flex:1, padding:'12px 0', textAlign:'center', borderRight: a.completed_deals_count > 0 ? '1px solid #f0ede6' : 'none' }}><div style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a' }}>{a.stories_views.toLocaleString('ru')}</div><div style={{ fontSize:'11px', color:'#9a9590' }}>сторис</div></div>}
                        {a.completed_deals_count > 0 && <div style={{ flex:1, padding:'12px 0', textAlign:'center' }}><div style={{ fontSize:'16px', fontWeight:700, color:'#c17f3e' }}>{a.completed_deals_count}</div><div style={{ fontSize:'11px', color:'#9a9590' }}>сделок</div></div>}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:'8px', padding:'14px 0' }}>
                      <Link href={`/author/${a.id}`} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'9px', border:'1.5px solid #e0ddd8', borderRadius:'12px', textDecoration:'none', color:'#5a5650', fontSize:'13px', fontWeight:500 }}>Профиль</Link>
                      {a.status === 'approved' && (
                        requestMap[a.id] ? (
                          <Link href={`/dashboard/request/${requestMap[a.id]}`} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'9px', background:'#f0ede6', borderRadius:'12px', textDecoration:'none', color:'#1a1a1a', fontSize:'13px', fontWeight:600 }}>К заявке</Link>
                        ) : (
                          <button onClick={() => openModal(a)} style={{ flex:1, padding:'9px', background:'#C56A43', border:'none', borderRadius:'12px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Написать</button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAuthor && (
        <div onClick={() => setModalAuthor(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'32px', maxWidth:'480px', width:'100%' }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:'24px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Написать {modalAuthor.name}</h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'20px', lineHeight:1.6 }}>Расскажи коротко что предлагаешь — автор увидит сообщение в личном кабинете.</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder="Например: предлагаем сотрудничество — обзор нашего продукта за бартер..."
              style={{ width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'15px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', resize:'vertical', marginBottom:'12px' }}
            />
            <div style={{ display:'flex', gap:'12px', marginBottom:'16px' }}>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:'12px', color:'#9a9590', marginBottom:'6px', fontWeight:500 }}>Бюджет (опционально)</label>
                <input
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  placeholder="напр. 5000 ₽ или бартер"
                  style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e0ddd8', borderRadius:'10px', fontSize:'14px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
              <div style={{ flex:1 }}>
                <label style={{ display:'block', fontSize:'12px', color:'#9a9590', marginBottom:'6px', fontWeight:500 }}>Срок (опционально)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e0ddd8', borderRadius:'10px', fontSize:'14px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>
            </div>
            {error && <div style={{ padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', color:'#dc2626', fontSize:'14px', marginBottom:'16px' }}>{error}</div>}
            <div style={{ display:'flex', gap:'12px' }}>
              <button onClick={() => setModalAuthor(null)} style={{ flex:1, padding:'12px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit', color:'#1a1a1a' }}>Отмена</button>
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

