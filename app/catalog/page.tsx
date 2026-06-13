'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Author = { id:string; name:string; city:string; instagram_url:string; followers_count:number; stories_views:number; occupation:string; lifestyle:string[]; hobbies:string; bio:string; open_to_barter:boolean }

export default function CatalogPage() {
  const router = useRouter()
  const [authors, setAuthors] = useState<Author[]>([])
  const [filtered, setFiltered] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('')
  const [barter, setBarter] = useState<'all'|'yes'|'no'>('all')
  const [search, setSearch] = useState('')
  const [userRole, setUserRole] = useState<string|null>(null)
  const [userEmail, setUserEmail] = useState<string|null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserRole(data.user.user_metadata?.role || null)
        setUserEmail(data.user.email || null)
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const inp = { padding:'10px 16px', border:'1.5px solid #e0ddd8', borderRadius:'100px', fontSize:'14px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }

  const dashboardLink = userRole === 'author' ? '/dashboard/author' : userRole === 'business' ? '/dashboard/business' : '/login'

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 40px', borderBottom:'1px solid #e8e6e1', background:'#fafaf9', position:'sticky', top:0, zIndex:100 }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          {userEmail ? (
            <>
              <Link href={dashboardLink} style={{ fontSize:'14px', color:'#7a7570', textDecoration:'none' }}>{userEmail}</Link>
              <button onClick={handleLogout} style={{ padding:'8px 20px', border:'1px solid #d4d0c8', borderRadius:'100px', background:'none', cursor:'pointer', fontSize:'14px', fontFamily:'inherit', color:'#1a1a1a' }}>Выйти</button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ padding:'8px 16px', fontSize:'14px', color:'#1a1a1a', textDecoration:'none', fontWeight:500 }}>Войти</Link>
              <Link href="/register" style={{ padding:'8px 20px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:500 }}>Регистрация</Link>
            </>
          )}
        </div>
      </nav>

      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'48px 40px' }}>
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
                <div style={{ display:'flex', gap:'8px' }}>
                  {a.instagram_url && <a href={a.instagram_url} target="_blank" rel="noopener noreferrer" style={{ padding:'8px 16px', border:'1.5px solid #e0ddd8', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'13px', fontWeight:500 }}>Instagram →</a>}
                  {userRole === 'business' && (
                    <button style={{ padding:'8px 20px', background:'#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      Написать
                    </button>
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
    </main>
  )
}
