'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useApp } from '../AppContext'
import { CatalogSkeleton } from '@/components/Skeleton'

type Author = { id:string; name:string; city:string; instagram_url:string; telegram_url:string|null; telegram_followers:number; followers_count:number; stories_views:number; occupation:string; lifestyle:string[]; hobbies:string; bio:string; open_to_barter:boolean; avatar_url:string|null; completed_deals_count:number; avg_rating:number|null; reviews_count:number }

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

const HEADER_GRADIENTS = [
  'linear-gradient(135deg, #f0e6d6 0%, #e8d5c0 100%)',
  'linear-gradient(135deg, #d6e8f0 0%, #c0d5e8 100%)',
  'linear-gradient(135deg, #e6f0d6 0%, #d0e0c0 100%)',
  'linear-gradient(135deg, #f0d6e6 0%, #e8c0d5 100%)',
  'linear-gradient(135deg, #e6d6f0 0%, #d5c0e8 100%)',
]

export default function CatalogPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { userId, userEmail, userRole, businessProfile } = useApp()
  const [authors, setAuthors] = useState<Author[]>([])
  const [filtered, setFiltered] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [barter, setBarter] = useState<'all'|'yes'|'no'>((searchParams.get('barter') as 'all'|'yes'|'no') || 'all')
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [visibleCount, setVisibleCount] = useState(12)

  const [modalAuthor, setModalAuthor] = useState<Author|null>(null)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sending, setSending] = useState(false)
  const [requestMap, setRequestMap] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (userId && userRole === 'business') {
      supabase.from('favorites').select('author_id').eq('business_id', userId).then(({ data: favs }) => {
        setFavoriteIds((favs || []).map(f => f.author_id))
      })
      supabase.from('requests').select('id, author_id').eq('business_id', userId).in('status', ['new','viewed','accepted']).then(({ data: reqs }) => {
        const map: Record<string, string> = {}
        reqs?.forEach(r => { map[r.author_id] = r.id })
        setRequestMap(map)
      })
    }
    supabase.from('authors').select('id, name, city, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, avatar_url, completed_deals_count, avg_rating, reviews_count').eq('status', 'approved').order('created_at', { ascending: false }).then(({ data }) => {
      setAuthors((data as Author[]) || [])
      setLoading(false)
    })
  }, [userId, userRole])

  useEffect(() => {
    let f = authors
    if (search) { const s = search.toLowerCase(); f = f.filter(a => [a.name,a.city,a.occupation,a.hobbies,...(a.lifestyle||[])].some(v => v?.toLowerCase().includes(s))) }
    if (city) { const c = city.toLowerCase(); f = f.filter(a => a.city?.toLowerCase().includes(c)) }
    if (barter === 'yes') f = f.filter(a => a.open_to_barter)
    if (barter === 'no') f = f.filter(a => !a.open_to_barter)
    setFiltered(f)
    setVisibleCount(12)
  }, [authors, search, city, barter])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (city) params.set('city', city)
    if (barter !== 'all') params.set('barter', barter)
    const qs = params.toString()
    router.replace(qs ? `/catalog?${qs}` : '/catalog', { scroll: false })
  }, [search, city, barter, router])

  const openModal = (author: Author) => {
    if (userRole === 'business' && (!businessProfile?.company_name || !businessProfile?.inn)) {
      toast.error('Сначала заполни профиль компании')
      return
    }
    setModalAuthor(author)
    setMessage(''); setBudget(''); setDeadline(''); setError('')
  }

  const sendRequest = async () => {
    if (!modalAuthor || !userId || !message.trim()) return
    setSending(true)
    const { data: inserted, error: err } = await supabase.from('requests').insert([{
      business_id: userId, business_email: userEmail, author_id: modalAuthor.id,
      message: message.trim(), budget: budget.trim() || null, deadline: deadline || null, status: 'new',
    }]).select('id').single()
    setSending(false)
    if (err || !inserted) { setError('Не удалось отправить. Попробуй ещё раз.'); return }
    setRequestMap({ ...requestMap, [modalAuthor.id]: inserted.id })
    setModalAuthor(null)
    toast.success('Заявка отправлена')
    router.push(`/dashboard/request/${inserted.id}`)
  }

  const toggleFavorite = async (authorId: string) => {
    if (!userId) return
    const isFav = favoriteIds.includes(authorId)
    if (isFav) {
      const { error } = await supabase.from('favorites').delete().eq('business_id', userId).eq('author_id', authorId)
      if (error) { toast.error('Не удалось убрать из избранного.'); return }
      setFavoriteIds(favoriteIds.filter(id => id !== authorId))
    } else {
      const { error } = await supabase.from('favorites').insert([{ business_id: userId, author_id: authorId }])
      if (error) { toast.error('Не удалось добавить в избранное.'); return }
      setFavoriteIds([...favoriteIds, authorId])
    }
  }

  const inp = { padding:'10px 16px', border:'1.5px solid #e0ddd8', borderRadius:'100px', fontSize:'14px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'clamp(28px, 7vw, 48px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'40px' }}>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'40px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Каталог авторов</h1>
          <p style={{ fontSize:'15px', color:'#7a7570' }}>{filtered.length} {filtered.length===1?'автор':filtered.length<5?'автора':'авторов'}</p>
        </div>

        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'32px', padding:'20px', background:'#fff', borderRadius:'16px', border:'1px solid #e8e6e1' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по имени, хобби, профессии..." style={{ ...inp, minWidth:'240px', flex:1 }} />
          <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Город" style={{ ...inp, width:'160px' }} />
          <div style={{ display:'flex', gap:'8px' }}>
            {[{val:'all',label:'Все'},{val:'yes',label:'Бартер ✓'},{val:'no',label:'Без бартера'}].map(opt => (
              <button key={opt.val} onClick={()=>setBarter(opt.val as 'all'|'yes'|'no')} style={{ padding:'10px 16px', borderRadius:'100px', fontSize:'13px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', borderColor: barter===opt.val?'#1a1a1a':'#e0ddd8', background: barter===opt.val?'#1a1a1a':'#fff', color: barter===opt.val?'#fff':'#5a5650' }}>{opt.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <CatalogSkeleton />
        ) : filtered.length===0 ? (
          <div style={{ textAlign:'center', padding:'80px' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>🔍</div>
            <p style={{ color:'#7a7570', fontSize:'16px' }}>Авторов с такими параметрами пока нет</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap:'16px' }}>
            {filtered.slice(0, visibleCount).map(a => {
              const isFav = favoriteIds.includes(a.id)
              const initial = a.name?.[0]?.toUpperCase() || '?'
              const ci = a.id.charCodeAt(0) % 5
              const AVATAR_COLORS = ['#fdf3e7','#e8f4fd','#f0fdf4','#fdf4ff','#fff0f0']
              const AVATAR_TEXT = ['#c17f3e','#1a6fa8','#16a34a','#7c3aed','#dc2626']
              const hasStats = a.followers_count > 0 || a.telegram_followers > 0 || a.stories_views > 0 || a.completed_deals_count > 0
              return (
                <div key={a.id} style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', overflow:'hidden', display:'flex', flexDirection:'column' }}>

                  {/* Header gradient + avatar */}
                  <div style={{ position:'relative', height:'80px', background: HEADER_GRADIENTS[ci] }}>
                    {/* Favorite button */}
                    {userRole === 'business' && (
                      <button onClick={() => toggleFavorite(a.id)} style={{ position:'absolute', top:'10px', right:'10px', width:'32px', height:'32px', borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.85)', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', color: isFav ? '#c17f3e' : '#9a9590' }}>
                        {isFav ? '★' : '☆'}
                      </button>
                    )}
                    {/* Avatar */}
                    <Link href={`/author/${a.id}`} style={{ textDecoration:'none', position:'absolute', bottom:'-28px', left:'20px' }}>
                      <div style={{ width:'64px', height:'64px', borderRadius:'50%', overflow:'hidden', background:AVATAR_COLORS[ci], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:700, color:AVATAR_TEXT[ci], border:'3px solid #fff', boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
                        {a.avatar_url
                          ? <img src={a.avatar_url} alt={a.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : initial}
                      </div>
                    </Link>
                  </div>

                  {/* Content */}
                  <div style={{ padding:'36px 20px 0', flex:1, display:'flex', flexDirection:'column' }}>

                    {/* Name + badges */}
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'4px' }}>
                      <Link href={`/author/${a.id}`} style={{ textDecoration:'none' }}>
                        <span style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a' }}>{a.name}</span>
                      </Link>
                      {a.open_to_barter && <span style={{ padding:'2px 7px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', fontSize:'10px', fontWeight:600, color:'#16a34a' }}>Бартер</span>}
                      {(a.avg_rating || a.completed_deals_count > 0) && (
                        <span style={{ padding:'2px 7px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'100px', fontSize:'10px', fontWeight:600, color:'#c17f3e' }}>
                          {a.avg_rating ? `★ ${a.avg_rating}` : `★ ${a.completed_deals_count} сд.`}
                        </span>
                      )}
                    </div>

                    {/* City + occupation */}
                    <div style={{ fontSize:'13px', color:'#9a9590', marginBottom:'12px' }}>
                      📍 {a.city}{a.occupation ? ` · ${a.occupation}` : ''}
                    </div>

                    {/* Bio preview */}
                    {a.bio && (
                      <p style={{ fontSize:'13px', color:'#5a5650', lineHeight:1.5, marginBottom:'12px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const }}>{a.bio}</p>
                    )}

                    {/* Colored tags */}
                    {a.lifestyle?.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginBottom:'14px' }}>
                        {a.lifestyle.slice(0, 4).map(tag => {
                          const tc = TAG_COLORS[tag] || defaultTag
                          return <span key={tag} style={{ padding:'3px 9px', background:tc.bg, border:`1px solid ${tc.border}`, borderRadius:'100px', fontSize:'11px', color:tc.color, fontWeight:600 }}>{tag}</span>
                        })}
                        {a.lifestyle.length > 4 && <span style={{ fontSize:'11px', color:'#9a9590', padding:'3px 6px' }}>+{a.lifestyle.length - 4}</span>}
                      </div>
                    )}

                    <div style={{ flex:1 }} />

                    {/* Stats bar */}
                    {hasStats && (
                      <div style={{ display:'flex', borderTop:'1px solid #f0ede6', margin:'0 -20px', padding:'0' }}>
                        {a.followers_count > 0 && (
                          <div style={{ flex:1, padding:'12px 0', textAlign:'center', borderRight:'1px solid #f0ede6' }}>
                            <div style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a' }}>{a.followers_count.toLocaleString('ru')}</div>
                            <div style={{ fontSize:'11px', color:'#9a9590' }}>подписч.</div>
                          </div>
                        )}
                        {a.stories_views > 0 && (
                          <div style={{ flex:1, padding:'12px 0', textAlign:'center', borderRight: (a.completed_deals_count > 0) ? '1px solid #f0ede6' : 'none' }}>
                            <div style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a' }}>{a.stories_views.toLocaleString('ru')}</div>
                            <div style={{ fontSize:'11px', color:'#9a9590' }}>сторис</div>
                          </div>
                        )}
                        {a.completed_deals_count > 0 && (
                          <div style={{ flex:1, padding:'12px 0', textAlign:'center' }}>
                            <div style={{ fontSize:'16px', fontWeight:700, color:'#c17f3e' }}>{a.avg_rating ? `★ ${a.avg_rating}` : a.completed_deals_count}</div>
                            <div style={{ fontSize:'11px', color:'#9a9590' }}>{a.avg_rating ? `${a.completed_deals_count} сд.` : 'сделок'}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action bar */}
                    <div style={{ display:'flex', gap:'8px', padding:'14px 0', margin:'0' }}>
                      <Link href={`/author/${a.id}`} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'9px', border:'1.5px solid #e0ddd8', borderRadius:'12px', textDecoration:'none', color:'#5a5650', fontSize:'13px', fontWeight:500 }}>Профиль</Link>
                      {userRole === 'business' && (
                        requestMap[a.id] ? (
                          <Link href={`/dashboard/request/${requestMap[a.id]}`} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'9px', background:'#f0ede6', borderRadius:'12px', textDecoration:'none', color:'#1a1a1a', fontSize:'13px', fontWeight:600 }}>К заявке</Link>
                        ) : (
                          <button onClick={() => openModal(a)} style={{ flex:1, padding:'9px', background:'#C56A43', border:'none', borderRadius:'12px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Написать</button>
                        )
                      )}
                      {!userEmail && <Link href="/register" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'9px', background:'#C56A43', borderRadius:'12px', textDecoration:'none', color:'#fff', fontSize:'13px', fontWeight:600 }}>Войти</Link>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {visibleCount < filtered.length && (
            <div style={{ textAlign:'center', paddingTop:'24px' }}>
              <button onClick={() => setVisibleCount(prev => prev + 12)} style={{ padding:'12px 32px', background:'#fff', border:'1.5px solid #e0ddd8', borderRadius:'100px', fontSize:'14px', fontWeight:600, color:'#1a1a1a', cursor:'pointer', fontFamily:'inherit' }}>
                Показать ещё ({filtered.length - visibleCount})
              </button>
            </div>
          )}
        )}
      </div>

      {/* Modal */}
      {modalAuthor && (
        <div onClick={() => setModalAuthor(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px', padding:'32px', maxWidth:'480px', width:'100%' }}>
            <h3 style={{ fontFamily:'Fraunces, serif', fontSize:'24px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Написать {modalAuthor.name}</h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'20px', lineHeight:1.6 }}>Расскажи коротко что предлагаешь — автор увидит сообщение в личном кабинете.</p>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} maxLength={3000} placeholder="Например: предлагаем сотрудничество — обзор нашего продукта за бартер..." style={{ width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'15px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', resize:'vertical', marginBottom:'12px' }} />
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
            {error && <div style={{ padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', color:'#dc2626', fontSize:'14px', marginBottom:'16px' }}>{error}</div>}
            <div style={{ display:'flex', gap:'12px' }}>
              <button onClick={() => setModalAuthor(null)} style={{ flex:1, padding:'12px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit', color:'#1a1a1a' }}>Отмена</button>
              <button onClick={sendRequest} disabled={sending || !message.trim()} style={{ flex:1, padding:'12px', border:'none', borderRadius:'100px', background: sending || !message.trim() ? '#9a9590' : '#C56A43', color:'#fff', cursor: sending || !message.trim() ? 'not-allowed' : 'pointer', fontSize:'14px', fontWeight:600, fontFamily:'inherit' }}>
                {sending ? 'Отправляем...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

