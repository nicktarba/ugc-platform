'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Author = { id:string; name:string; city:string; instagram_url:string; followers_count:number; stories_views:number; occupation:string; lifestyle:string[]; bio:string; open_to_barter:boolean; status:string }

export default function FavoritesPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalAuthor, setModalAuthor] = useState<Author|null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)

      const { data: favs } = await supabase.from('favorites').select('author_id').eq('business_id', data.user.id)
      const ids = (favs || []).map(f => f.author_id)

      if (ids.length > 0) {
        const { data: a } = await supabase.from('authors').select('*').in('id', ids)
        setAuthors(a || [])
      }
      setLoading(false)
    })
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const removeFavorite = async (authorId: string) => {
    if (!user) return
    await supabase.from('favorites').delete().eq('business_id', user.id).eq('author_id', authorId)
    setAuthors(authors.filter(a => a.id !== authorId))
  }

  const openModal = (author: Author) => {
    setModalAuthor(author)
    setMessage('')
    setError('')
  }

  const sendRequest = async () => {
    if (!modalAuthor || !user || !message.trim()) return
    setSending(true)
    setError('')
    const { error: err } = await supabase.from('requests').insert([{
      business_id: user.id,
      business_email: user.email,
      author_id: modalAuthor.id,
      message: message.trim(),
      status: 'new',
    }])
    setSending(false)
    if (err) { setError('Не получилось отправить. Попробуй ещё раз.'); return }
    setSentTo([...sentTo, modalAuthor.id])
    setModalAuthor(null)
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#fafaf9', color:'#9a9590' }}>Загрузка...</div>

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 40px', borderBottom:'1px solid #e8e6e1', background:'#fafaf9' }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <span style={{ fontSize:'14px', color:'#7a7570' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ padding:'8px 20px', border:'1px solid #d4d0c8', borderRadius:'100px', background:'none', cursor:'pointer', fontSize:'14px', fontFamily:'inherit', color:'#1a1a1a' }}>Выйти</button>
        </div>
      </nav>

      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'48px 40px' }}>
        <div style={{ marginBottom:'12px', display:'flex', alignItems:'center', gap:'12px' }}>
          <Link href="/dashboard/business" style={{ fontSize:'14px', color:'#7a7570', textDecoration:'none' }}>← Кабинет</Link>
        </div>
        <div style={{ marginBottom:'32px' }}>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a' }}>Избранные авторы</h1>
        </div>

        {authors.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>⭐️</div>
            <p style={{ color:'#7a7570', fontSize:'16px', marginBottom:'20px' }}>Пока пусто. Сохраняй авторов из каталога, чтобы собрать шортлист.</p>
            <Link href="/catalog" style={{ padding:'12px 32px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600 }}>Открыть каталог</Link>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'16px' }}>
            {authors.map(a => (
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

                {a.status !== 'approved' && (
                  <div style={{ padding:'8px 12px', background:'#f0ede6', borderRadius:'10px', fontSize:'12px', color:'#9a9590', marginBottom:'12px' }}>
                    Анкета этого автора сейчас недоступна
                  </div>
                )}

                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {a.instagram_url && <a href={a.instagram_url} target="_blank" rel="noopener noreferrer" style={{ padding:'8px 16px', border:'1.5px solid #e0ddd8', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'13px', fontWeight:500 }}>Instagram →</a>}
                  {a.status === 'approved' && (
                    sentTo.includes(a.id) ? (
                      <span style={{ padding:'8px 20px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', color:'#16a34a', fontSize:'13px', fontWeight:600 }}>Отправлено ✓</span>
                    ) : (
                      <button onClick={() => openModal(a)} style={{ padding:'8px 20px', background:'#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                        Написать
                      </button>
                    )
                  )}
                  <button onClick={() => removeFavorite(a.id)} style={{ padding:'8px 16px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', color:'#9a9590', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>
                    Убрать
                  </button>
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
              style={{ width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'15px', background:'#fafaf9', color:'#1a1a1a', outline:'none', fontFamily:'inherit', resize:'vertical', marginBottom:'16px' }}
            />
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
