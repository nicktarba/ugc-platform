'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import AppHeader from '@/components/AppHeader'

type Author = { id:string; name:string; city:string; instagram_url:string; followers_count:number; stories_views:number; occupation:string; lifestyle:string[]; hobbies:string; bio:string; open_to_barter:boolean }

export default function CatalogPage() {
  const router = useRouter()
  const [authors, setAuthors] = useState<Author[]>([])
  const [filtered, setFiltered] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('')
  const [barter, setBarter] = useState<'all'|'yes'|'no'>('all')
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState<string|null>(null)
  const [userRole, setUserRole] = useState<string|null>(null)
  const [userEmail, setUserEmail] = useState<string|null>(null)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Modal state
  const [modalAuthor, setModalAuthor] = useState<Author|null>(null)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sending, setSending] = useState(false)
  const [requestMap, setRequestMap] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        setUserRole(data.user.user_metadata?.role || null)
        setUserEmail(data.user.email || null)
        if (data.user.user_metadata?.role === 'business') {
          supabase.from('favorites').select('author_id').eq('business_id', data.user.id).then(({ data: favs }) => {
            setFavoriteIds((favs || []).map(f => f.author_id))
          })
          supabase.from('requests').select('id, author_id').eq('business_id', data.user.id).in('status', ['new','viewed','accepted']).then(({ data: reqs }) => {
            const map: Record<string, string> = {}
            reqs?.forEach(r => { map[r.author_id] = r.id })
            setRequestMap(map)
          })
          supabase.from('requests').select('id').eq('business_id', data.user.id).then(async ({ data: allReqs }) => {
            if (allReqs && allReqs.length > 0) {
              const ids = allReqs.map(r => r.id)
              const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).in('request_id', ids).eq('sender_role', 'author').eq('read', false)
              setUnreadCount(count || 0)
            }
          })
        }
      }
    })
    supabase.from('authors').select('*').eq('status', 'approved').order('created_at', { ascending: false }).then(({ data }) => {
      setAuthors(data || [])
      setFiltered(data || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    let r = [...authors]
    if (city) r = r.filter(a => a.city.toLowerCase().includes(city.toLowerCase()))
    if (barter === 'yes') r = r.filter(a => a.open_to_barter)
    if (barter === 'no') r = r.filter(a => !a.open_to_barter)
    if (search) { const q = search.toLowerCase(); r = r.filter(a => a.name?.toLowerCase().includes(q) || a.occupation?.toLowerCase().includes(q) || a.hobbies?.toLowerCase().includes(q) || a.bio?.toLowerCase().includes(q) || a.lifestyle?.some(l => l.toLowerCase().includes(q))) }
    setFiltered(r)
  }, [city, barter, search, authors])

  const openModal = (author: Author) => {
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
    setRequestMap({ ...requestMap, [modalAuthor.id]: inserted.id })
    setModalAuthor(null)
    router.push(`/dashboard/chat/${inserted.id}`)
  }

  const toggleFavorite = async (authorId: string) => {
    if (!userId) return
    if (favoriteIds.includes(authorId)) {
      await supabase.from('favorites').delete().eq('business_id', userId).eq('author_id', authorId)
      setFavoriteIds(favoriteIds.filter(id => id !== authorId))
    } else {
      await supabase.from('favorites').insert([{ business_id: userId, author_id: authorId }])
      setFavoriteIds([...favoriteIds, authorId])
    }
  }

  const inp = { padding:'10px 16px', border:'1.5px solid #e0ddd8', borderRadius:'100px', fontSize:'14px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <AppHeader />

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
          <div style={{ textAlign:'center', padding:'80px', color:'#9a9590' }}>Загружаем авторов...</div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:'center', padding:'80px' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>🔍</div>
            <p style={{ color:'#7a7570', fontSize:'16px' }}>Авторов с такими параметрами пока нет</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'16px' }}>
            {filtered.map(a => (
              <div key={a.id} style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                  <div>
                    <h3 style={{ fontSize:'17px', fontWeight:700, color:'#1a1a1a', marginBottom:'4px' }}>{a.name}</h3>
                    <span style={{ fontSize:'13px', color:'#9a9590' }}>📍 {a.city}</span>
                  </div>
                  {a.open_to_barter && <span style={{ padding:'4px 10px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#16a34a' }}>Бартер</span>}
                </div>
                <div style={{ display:'flex', gap:'16px', marginBottom:'14px' }}>
                  {a.followers_count>0 && <div><div style={{ fontSize:'16px', fontWeight:700 }}>{a.followers_count.toLocaleString('ru')}</div><div style={{ fontSize:'11px', color:'#9a9590' }}>подписчиков</div></div>}
                  {a.stories_views>0 && <div><div style={{ fontSize:'16px', fontWeight:700 }}>{a.stories_views.toLocaleString('ru')}</div><div style={{ fontSize:'11px', color:'#9a9590' }}>просм. сторис</div></div>}
                </div>
                {a.occupation && <div style={{ fontSize:'13px', color:'#5a5650', marginBottom:'10px', fontWeight:500 }}>💼 {a.occupation}</div>}
                {a.bio && <p style={{ fontSize:'13px', color:'#7a7570', marginBottom:'14px', lineHeight:1.6 }}>{a.bio.length>100?a.bio.slice(0,100)+'...':a.bio}</p>}
                {a.lifestyle?.length>0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'16px' }}>
                    {a.lifestyle.slice(0,4).map(tag => <span key={tag} style={{ padding:'3px 10px', background:'#f0ede6', borderRadius:'100px', fontSize:'11px', color:'#7a7570', fontWeight:500 }}>{tag}</span>)}
                    {a.lifestyle.length>4 && <span style={{ fontSize:'11px', color:'#9a9590', padding:'3px 6px' }}>+{a.lifestyle.length-4}</span>}
                  </div>
                )}
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {a.instagram_url && <a href={a.instagram_url} target="_blank" rel="noopener noreferrer" style={{ padding:'8px 16px', border:'1.5px solid #e0ddd8', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'13px', fontWeight:500 }}>Instagram →</a>}
                  {userRole === 'business' && (
                    <button onClick={() => toggleFavorite(a.id)} style={{
                      padding:'8px 16px', borderRadius:'100px', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                      border: favoriteIds.includes(a.id) ? '1.5px solid #f5dcb8' : '1.5px solid #e0ddd8',
                      background: favoriteIds.includes(a.id) ? '#fdf3e7' : '#fff',
                      color: favoriteIds.includes(a.id) ? '#c17f3e' : '#1a1a1a',
                    }}>
                      {favoriteIds.includes(a.id) ? '★ В избранном' : '☆ В избранное'}
                    </button>
                  )}
                  {userRole === 'business' && (
                    requestMap[a.id] ? (
                      <Link href={`/dashboard/chat/${requestMap[a.id]}`} style={{ padding:'8px 20px', background:'#f0ede6', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'13px', fontWeight:600 }}>
                        Перейти в чат
                      </Link>
                    ) : (
                      <button onClick={() => openModal(a)} style={{ padding:'8px 20px', background:'#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                        Написать
                      </button>
                    )
                  )}
                  {!userEmail && (
                    <Link href="/register" style={{ padding:'8px 20px', background:'#f0ede6', borderRadius:'100px', textDecoration:'none', color:'#7a7570', fontSize:'13px', fontWeight:500 }}>Войти чтобы написать</Link>
                  )}
                </div>
              </div>
            ))}
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
      {userRole === 'business' && <BottomNav role="business" active="catalog" unread={unreadCount} />}
    </main>
  )
}
