#!/bin/bash
set -e
echo "== Реструктуризация (app) route group =="

mkdir -p "app/(app)/catalog"
mkdir -p "app/(app)/dashboard/business/favorites"
mkdir -p "app/(app)/dashboard/author/profile"

# Убираем старые файлы (переезжают в (app) с новым содержимым)
git rm -rf app/catalog app/dashboard/business/page.tsx "app/dashboard/business/favorites" app/dashboard/author/page.tsx "app/dashboard/author/profile" 2>/dev/null || rm -rf app/catalog app/dashboard/business/page.tsx "app/dashboard/business/favorites" app/dashboard/author/page.tsx "app/dashboard/author/profile"
rmdir app/dashboard/business app/dashboard/author 2>/dev/null || true

echo "-> app/(app)/AppContext.tsx"
mkdir -p "$(dirname "app/(app)/AppContext.tsx")"
cat > "app/(app)/AppContext.tsx" << 'CLAUDE_EOF_MARKER'
'use client'
import { createContext, useContext } from 'react'

export type AuthorProfile = {
  id: string
  name: string
  city: string
  instagram_url: string
  followers_count: number
  stories_views?: number
  occupation?: string
  hobbies?: string
  bio?: string
  lifestyle: string[]
  open_to_barter: boolean
  status: string
}

export type AppContextValue = {
  userId: string | null
  userEmail: string | null
  userRole: 'business' | 'author' | 'admin' | null
  authorProfile: AuthorProfile | null
  badgeCount: number
  bumpBadge: (delta: number) => void
}

export const AppContext = createContext<AppContextValue>({
  userId: null,
  userEmail: null,
  userRole: null,
  authorProfile: null,
  badgeCount: 0,
  bumpBadge: () => {},
})

export const useApp = () => useContext(AppContext)
CLAUDE_EOF_MARKER

echo "-> app/(app)/layout.tsx"
mkdir -p "$(dirname "app/(app)/layout.tsx")"
cat > "app/(app)/layout.tsx" << 'CLAUDE_EOF_MARKER'
'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import LoadingScreen from '@/components/LoadingScreen'
import { getBusinessBadgeCount, getAuthorBadgeCount } from '@/lib/badges'
import { AppContext, AuthorProfile } from './AppContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'business' | 'author' | 'admin' | null>(null)
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null)
  const [badgeCount, setBadgeCount] = useState(0)

  // Один раз при входе в группу: кто авторизован, какая роль, анкета автора, бейдж
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user
      if (!u) { setReady(true); return }

      setUserId(u.id)
      setUserEmail(u.email || null)
      const role = (u.user_metadata?.role as 'business' | 'author' | 'admin' | undefined) || null
      setUserRole(role)

      if (role === 'author') {
        const { data: p } = await supabase.from('authors').select('*').eq('user_id', u.id).single()
        setAuthorProfile((p as AuthorProfile) || null)
        if (p) setBadgeCount(await getAuthorBadgeCount(p.id))
      } else if (role === 'business') {
        setBadgeCount(await getBusinessBadgeCount(u.id))
      }

      setReady(true)
    })
  }, [])

  // Гостя на закрытые страницы — на /login. Каталог доступен без авторизации.
  useEffect(() => {
    if (ready && !userId && pathname !== '/catalog') {
      router.replace('/login')
    }
  }, [ready, userId, pathname, router])

  const bumpBadge = (delta: number) => setBadgeCount(prev => Math.max(0, prev + delta))

  if (!ready) return <LoadingScreen />
  if (!userId && pathname !== '/catalog') return <LoadingScreen />

  const navRole: 'business' | 'author' | null =
    pathname.startsWith('/dashboard/author') ? 'author'
    : pathname.startsWith('/dashboard/business') ? 'business'
    : pathname === '/catalog'
      ? (userRole === 'author' ? 'author' : userRole === 'business' ? 'business' : null)
      : null

  const active =
    pathname.startsWith('/dashboard/business/favorites') ? 'favorites'
    : pathname.startsWith('/dashboard/author/profile') ? 'profile'
    : pathname === '/catalog' ? 'catalog'
    : 'requests'

  return (
    <AppContext.Provider value={{ userId, userEmail, userRole, authorProfile, badgeCount, bumpBadge }}>
      <AppHeader />
      {children}
      {navRole && <BottomNav role={navRole} active={active} unread={badgeCount} />}
    </AppContext.Provider>
  )
}
CLAUDE_EOF_MARKER

echo "-> app/(app)/catalog/page.tsx"
mkdir -p "$(dirname "app/(app)/catalog/page.tsx")"
cat > "app/(app)/catalog/page.tsx" << 'CLAUDE_EOF_MARKER'
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useApp } from '../AppContext'

type Author = { id:string; name:string; city:string; instagram_url:string; followers_count:number; stories_views:number; occupation:string; lifestyle:string[]; hobbies:string; bio:string; open_to_barter:boolean }

export default function CatalogPage() {
  const router = useRouter()
  const { userId, userEmail, userRole } = useApp()
  const [authors, setAuthors] = useState<Author[]>([])
  const [filtered, setFiltered] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('')
  const [barter, setBarter] = useState<'all'|'yes'|'no'>('all')
  const [search, setSearch] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  // Modal state
  const [modalAuthor, setModalAuthor] = useState<Author|null>(null)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sending, setSending] = useState(false)
  const [requestMap, setRequestMap] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (userRole === 'business' && userId) {
      supabase.from('favorites').select('author_id').eq('business_id', userId).then(({ data: favs }) => {
        setFavoriteIds((favs || []).map(f => f.author_id))
      })
      supabase.from('requests').select('id, author_id').eq('business_id', userId).in('status', ['new','viewed','accepted']).then(({ data: reqs }) => {
        const map: Record<string, string> = {}
        reqs?.forEach(r => { map[r.author_id] = r.id })
        setRequestMap(map)
      })
    }
  }, [userRole, userId])

  useEffect(() => {
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
    </main>
  )
}
CLAUDE_EOF_MARKER

echo "-> app/(app)/dashboard/business/page.tsx"
mkdir -p "$(dirname "app/(app)/dashboard/business/page.tsx")"
cat > "app/(app)/dashboard/business/page.tsx" << 'CLAUDE_EOF_MARKER'
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import { truncate, formatRelative, formatDate } from '@/lib/format'
import { businessStatusLabel } from '@/lib/status'
import { OPEN_STATUSES, type BusinessRequest as Req } from '@/lib/types'
import { useApp } from '../../AppContext'

export default function BusinessDashboard() {
  const { userId, bumpBadge } = useApp()
  const [requests, setRequests] = useState<Req[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (!userId) return
    ;(async () => {
      const { data: r } = await supabase.from('requests').select('*, authors(name, city)').eq('business_id', userId).order('created_at', { ascending: false })
      setRequests((r as unknown as Req[]) || [])

      const { count } = await supabase.from('favorites').select('id', { count: 'exact', head: true }).eq('business_id', userId)
      setFavoritesCount(count || 0)

      if (r && r.length > 0) {
        const ids = r.map(req => req.id)
        const { data: unread } = await supabase.from('messages').select('request_id').in('request_id', ids).eq('sender_role', 'author').eq('read', false)
        const counts: Record<string, number> = {}
        unread?.forEach(m => { counts[m.request_id] = (counts[m.request_id] || 0) + 1 })
        setUnreadCounts(counts)
      }
      setLoading(false)
    })()
  }, [userId])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`business-requests-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `business_id=eq.${userId}` }, (payload) => {
        const updated = payload.new as { id: string; status: string }
        setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, status: updated.status } : r))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { request_id: string; sender_role: string }
        if (msg.sender_role === 'author') {
          setUnreadCounts(prev => ({ ...prev, [msg.request_id]: (prev[msg.request_id] || 0) + 1 }))
          bumpBadge(1)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, bumpBadge])

  const OPEN: string[] = OPEN_STATUSES
  const activeRequests = requests.filter(r => OPEN.includes(r.status))
  const historyRequests = requests.filter(r => !OPEN.includes(r.status))

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  if (loading) return <LoadingScreen />

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'40px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'16px', fontWeight:500 }}>Кабинет бизнеса</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a' }}>Добро пожаловать</h1>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'16px', marginBottom:'16px' }}>
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>🔍</div>
            <h3 style={{ fontSize:'17px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Найти авторов</h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'20px', lineHeight:1.6 }}>Каталог микро-авторов с фильтрами по городу, хобби и стилю жизни.</p>
            <Link href="/catalog" style={{ display:'inline-block', padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Открыть каталог</Link>
          </div>

          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>⭐️</div>
            <h3 style={{ fontSize:'17px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Избранные {favoritesCount > 0 && `(${favoritesCount})`}</h3>
            <p style={{ fontSize:'14px', color:'#7a7570', marginBottom:'20px', lineHeight:1.6 }}>Авторы которых ты сохранил. Удобно собирать шортлист.</p>
            <Link href="/dashboard/business/favorites" style={{ display:'inline-block', padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Открыть</Link>
          </div>
        </div>

        <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
          <h3 style={{ fontSize:'16px', fontWeight:700, color:'#1a1a1a', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
            Мои запросы {requests.length > 0 && `(${requests.length})`}
            {totalUnread > 0 && <span style={{ padding:'2px 10px', background:'#c17f3e', borderRadius:'100px', fontSize:'12px', fontWeight:700, color:'#fff' }}>{totalUnread} новых</span>}
          </h3>
          {requests.length === 0 ? (
            <p style={{ fontSize:'14px', color:'#9a9590' }}>Запросы которые ты отправил авторам появятся здесь.</p>
          ) : (
            <>
              {activeRequests.length === 0 ? (
                <p style={{ fontSize:'13px', color:'#9a9590', marginBottom: historyRequests.length > 0 ? '16px' : 0 }}>Нет активных запросов</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom: historyRequests.length > 0 ? '16px' : 0 }}>
                  {activeRequests.map(r => {
                    const s = businessStatusLabel(r.status)
                    const unread = unreadCounts[r.id] || 0
                    return (
                      <Link key={r.id} href={`/dashboard/chat/${r.id}`} style={{ display:'block', textDecoration:'none', padding:'16px', background: unread > 0 ? '#fdf3e7' : '#fafaf9', border:'1px solid #e8e6e1', borderRadius:'14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'6px' }}>
                          <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{r.authors?.name} · {r.authors?.city}</span>
                          <div style={{ display:'flex', gap:'6px', alignItems:'center', flexShrink:0 }}>
                            {unread > 0 && <span style={{ padding:'2px 8px', background:'#c17f3e', borderRadius:'100px', fontSize:'11px', fontWeight:700, color:'#fff' }}>{unread}</span>}
                            <span style={{ padding:'2px 10px', background:s.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:s.color, whiteSpace:'nowrap' }}>{s.text}</span>
                          </div>
                        </div>
                        <p style={{ fontSize:'13px', color:'#7a7570', lineHeight:1.5, marginBottom:'8px' }}>{truncate(r.message)}</p>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px', color:'#9a9590', flexWrap:'wrap', gap:'8px' }}>
                          <div style={{ display:'flex', gap:'12px' }}>
                            {r.budget && <span>💰 {r.budget}</span>}
                            {r.deadline && <span>📅 {formatDate(r.deadline)}</span>}
                          </div>
                          <span>{formatRelative(r.created_at)}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {historyRequests.length > 0 && (
                <>
                  <button onClick={() => setShowHistory(!showHistory)} style={{ width:'100%', padding:'10px', border:'1px dashed #e0ddd8', borderRadius:'12px', background:'none', cursor:'pointer', fontSize:'13px', fontWeight:500, color:'#9a9590', fontFamily:'inherit' }}>
                    {showHistory ? 'Скрыть историю' : `Показать историю (${historyRequests.length})`}
                  </button>
                  {showHistory && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'12px' }}>
                      {historyRequests.map(r => {
                        const s = businessStatusLabel(r.status)
                        return (
                          <Link key={r.id} href={`/dashboard/chat/${r.id}`} style={{ display:'block', textDecoration:'none', padding:'16px', background:'#fafaf9', border:'1px solid #e8e6e1', borderRadius:'14px', opacity:0.75 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'6px' }}>
                              <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{r.authors?.name} · {r.authors?.city}</span>
                              <span style={{ padding:'2px 10px', background:s.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:s.color, whiteSpace:'nowrap' }}>{s.text}</span>
                            </div>
                            <p style={{ fontSize:'13px', color:'#7a7570', lineHeight:1.5, marginBottom:'8px' }}>{truncate(r.message)}</p>
                            <div style={{ display:'flex', justifyContent:'flex-end', fontSize:'12px', color:'#9a9590' }}>
                              <span>{formatRelative(r.created_at)}</span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
CLAUDE_EOF_MARKER

echo "-> app/(app)/dashboard/business/favorites/page.tsx"
mkdir -p "$(dirname "app/(app)/dashboard/business/favorites/page.tsx")"
cat > "app/(app)/dashboard/business/favorites/page.tsx" << 'CLAUDE_EOF_MARKER'
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import { useApp } from '../../../AppContext'

type Author = { id:string; name:string; city:string; instagram_url:string; followers_count:number; stories_views:number; occupation:string; lifestyle:string[]; bio:string; open_to_barter:boolean; status:string }

export default function FavoritesPage() {
  const router = useRouter()
  const { userId, userEmail } = useApp()
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
        const { data: a } = await supabase.from('authors').select('*').in('id', ids)
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
    await supabase.from('favorites').delete().eq('business_id', userId).eq('author_id', authorId)
    setAuthors(authors.filter(a => a.id !== authorId))
  }

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
    router.push(`/dashboard/chat/${inserted.id}`)
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
CLAUDE_EOF_MARKER

echo "-> app/(app)/dashboard/author/page.tsx"
mkdir -p "$(dirname "app/(app)/dashboard/author/page.tsx")"
cat > "app/(app)/dashboard/author/page.tsx" << 'CLAUDE_EOF_MARKER'
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import { truncate, formatRelative, formatDate } from '@/lib/format'
import { authorStatusBadge } from '@/lib/status'
import { OPEN_STATUSES, type AuthorRequest as Req } from '@/lib/types'
import { useApp } from '../../AppContext'

export default function AuthorRequestsPage() {
  const { authorProfile: profile, bumpBadge } = useApp()
  const [requests, setRequests] = useState<Req[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (!profile) { setLoading(false); return }
    ;(async () => {
      const { data: r } = await supabase.from('requests').select('*').eq('author_id', profile.id).order('created_at', { ascending: false })
      setRequests(r || [])

      if (r && r.length > 0) {
        const ids = r.map(req => req.id)
        const { data: unread } = await supabase.from('messages').select('request_id').in('request_id', ids).eq('sender_role', 'business').eq('read', false)
        const counts: Record<string, number> = {}
        unread?.forEach(m => { counts[m.request_id] = (counts[m.request_id] || 0) + 1 })
        setUnreadCounts(counts)
      }
      setLoading(false)
    })()
  }, [profile])

  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`author-requests-${profile.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `author_id=eq.${profile.id}` }, (payload) => {
        const updated = payload.new as { id: string; status: string }
        setRequests(prev => prev.map(r => r.id === updated.id ? { ...r, status: updated.status } : r))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'requests', filter: `author_id=eq.${profile.id}` }, (payload) => {
        const newReq = payload.new as Req
        setRequests(prev => [newReq, ...prev])
        bumpBadge(1)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { request_id: string; sender_role: string }
        if (msg.sender_role === 'business') {
          setUnreadCounts(prev => ({ ...prev, [msg.request_id]: (prev[msg.request_id] || 0) + 1 }))
          bumpBadge(1)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile, bumpBadge])

  const markViewed = async (id: string, status: string) => {
    if (status === 'new') {
      await supabase.from('requests').update({ status: 'viewed' }).eq('id', id)
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'viewed' } : r))
    }
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)
  const newRequestsCount = requests.filter(r => r.status === 'new').length
  const badgeCount = totalUnread + newRequestsCount

  const OPEN: string[] = OPEN_STATUSES
  const activeRequests = requests.filter(r => OPEN.includes(r.status))
  const historyRequests = requests.filter(r => !OPEN.includes(r.status))

  if (loading) return <LoadingScreen />

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'16px', fontWeight:500 }}>Кабинет автора</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a', display:'flex', alignItems:'center', gap:'10px' }}>
            Входящие запросы
            {badgeCount > 0 && <span style={{ padding:'2px 12px', background:'#c17f3e', borderRadius:'100px', fontSize:'14px', fontWeight:700, color:'#fff' }}>{badgeCount} новых</span>}
          </h1>
        </div>

        {profile?.status === 'pending' && (
          <div style={{ padding:'12px 20px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'14px', marginBottom:'24px', fontSize:'14px', color:'#c17f3e', fontWeight:500 }}>
            ⏳ Анкета на модерации — скоро появится в каталоге
          </div>
        )}

        {profile?.status === 'rejected' && (
          <div style={{ padding:'12px 20px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', marginBottom:'24px', fontSize:'14px', color:'#dc2626', fontWeight:500 }}>
            Анкета не прошла модерацию. Проверь данные на вкладке «Профиль».
          </div>
        )}

        {!profile ? (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'clamp(20px, 6vw, 40px)', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>✍️</div>
            <h3 style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Заполни анкету</h3>
            <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'24px', lineHeight:1.6 }}>Чтобы бизнесы могли найти тебя в каталоге — нужно заполнить профиль.</p>
            <Link href="/become-author" style={{ padding:'12px 32px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600 }}>Заполнить анкету</Link>
          </div>
        ) : (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
            {requests.length === 0 ? (
              <p style={{ fontSize:'14px', color:'#9a9590' }}>Пока запросов нет — появятся здесь когда бизнес напишет тебе.</p>
            ) : (
              <>
                {activeRequests.length === 0 ? (
                  <p style={{ fontSize:'13px', color:'#9a9590', marginBottom: historyRequests.length > 0 ? '16px' : 0 }}>Нет активных запросов</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom: historyRequests.length > 0 ? '16px' : 0 }}>
                    {activeRequests.map(r => {
                      const unread = unreadCounts[r.id] || 0
                      const isNew = r.status === 'new' || unread > 0
                      const sBadge = authorStatusBadge(r.status)
                      return (
                        <Link key={r.id} href={`/dashboard/chat/${r.id}`} onClick={() => markViewed(r.id, r.status)} style={{ display:'block', textDecoration:'none', padding:'16px', background: isNew ? '#fdf3e7' : '#fafaf9', border:'1px solid #e8e6e1', borderRadius:'14px' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'6px' }}>
                            <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{r.business_email}</span>
                            <div style={{ display:'flex', gap:'6px', alignItems:'center', flexShrink:0 }}>
                              {unread > 0 && <span style={{ padding:'2px 8px', background:'#c17f3e', borderRadius:'100px', fontSize:'11px', fontWeight:700, color:'#fff' }}>{unread}</span>}
                              {r.status === 'new' && unread === 0 && <span style={{ padding:'2px 10px', background:'#c17f3e', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#fff', whiteSpace:'nowrap' }}>Новое</span>}
                              {sBadge && <span style={{ padding:'2px 10px', background:sBadge.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:sBadge.color, whiteSpace:'nowrap' }}>{sBadge.text}</span>}
                            </div>
                          </div>
                          <p style={{ fontSize:'13px', color:'#7a7570', lineHeight:1.5, marginBottom:'8px' }}>{truncate(r.message)}</p>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px', color:'#9a9590', flexWrap:'wrap', gap:'8px' }}>
                            <div style={{ display:'flex', gap:'12px' }}>
                              {r.budget && <span>💰 {r.budget}</span>}
                              {r.deadline && <span>📅 {formatDate(r.deadline)}</span>}
                            </div>
                            <span>{formatRelative(r.created_at)}</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}

                {historyRequests.length > 0 && (
                  <>
                    <button onClick={() => setShowHistory(!showHistory)} style={{ width:'100%', padding:'10px', border:'1px dashed #e0ddd8', borderRadius:'12px', background:'none', cursor:'pointer', fontSize:'13px', fontWeight:500, color:'#9a9590', fontFamily:'inherit' }}>
                      {showHistory ? 'Скрыть историю' : `Показать историю (${historyRequests.length})`}
                    </button>
                    {showHistory && (
                      <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginTop:'12px' }}>
                        {historyRequests.map(r => {
                          const sBadge = authorStatusBadge(r.status)
                          return (
                            <Link key={r.id} href={`/dashboard/chat/${r.id}`} style={{ display:'block', textDecoration:'none', padding:'16px', background:'#fafaf9', border:'1px solid #e8e6e1', borderRadius:'14px', opacity:0.75 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', marginBottom:'6px' }}>
                                <span style={{ fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>{r.business_email}</span>
                                {sBadge && <span style={{ padding:'2px 10px', background:sBadge.bg, borderRadius:'100px', fontSize:'11px', fontWeight:600, color:sBadge.color, whiteSpace:'nowrap' }}>{sBadge.text}</span>}
                              </div>
                              <p style={{ fontSize:'13px', color:'#7a7570', lineHeight:1.5, marginBottom:'8px' }}>{truncate(r.message)}</p>
                              <div style={{ display:'flex', justifyContent:'flex-end', fontSize:'12px', color:'#9a9590' }}>
                                <span>{formatRelative(r.created_at)}</span>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
CLAUDE_EOF_MARKER

echo "-> app/(app)/dashboard/author/profile/page.tsx"
mkdir -p "$(dirname "app/(app)/dashboard/author/profile/page.tsx")"
cat > "app/(app)/dashboard/author/profile/page.tsx" << 'CLAUDE_EOF_MARKER'
'use client'
import Link from 'next/link'
import { useApp } from '../../../AppContext'

export default function AuthorProfilePage() {
  const { authorProfile: profile } = useApp()

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'16px', fontWeight:500 }}>Кабинет автора</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a' }}>
            {profile ? `Привет, ${profile.name}` : 'Профиль'}
          </h1>
        </div>

        {profile?.status === 'pending' && (
          <div style={{ padding:'12px 20px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'14px', marginBottom:'24px', fontSize:'14px', color:'#c17f3e', fontWeight:500 }}>
            ⏳ Анкета на модерации — скоро появится в каталоге
          </div>
        )}

        {profile?.status === 'rejected' && (
          <div style={{ padding:'12px 20px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', marginBottom:'24px', fontSize:'14px', color:'#dc2626', fontWeight:500 }}>
            Анкета не прошла модерацию. Проверь данные и отредактируй профиль.
          </div>
        )}

        {profile ? (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
              <div>
                <h3 style={{ fontSize:'18px', fontWeight:700, color:'#1a1a1a', marginBottom:'4px' }}>{profile.name}</h3>
                <span style={{ fontSize:'14px', color:'#9a9590' }}>📍 {profile.city}</span>
              </div>
              {profile.open_to_barter && <span style={{ padding:'4px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', fontSize:'12px', fontWeight:600, color:'#16a34a' }}>Бартер</span>}
            </div>
            {profile.followers_count > 0 && (
              <div style={{ marginBottom:'16px' }}>
                <div style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a' }}>{profile.followers_count.toLocaleString('ru')}</div>
                <div style={{ fontSize:'12px', color:'#9a9590' }}>подписчиков</div>
              </div>
            )}
            {profile.lifestyle?.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'20px' }}>
                {profile.lifestyle.map(tag => <span key={tag} style={{ padding:'3px 10px', background:'#f0ede6', borderRadius:'100px', fontSize:'12px', color:'#7a7570', fontWeight:500 }}>{tag}</span>)}
              </div>
            )}
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              <Link href="/become-author" style={{ padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Редактировать</Link>
              {profile.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" style={{ padding:'10px 24px', border:'1.5px solid #e0ddd8', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'14px', fontWeight:500 }}>Instagram →</a>}
            </div>
          </div>
        ) : (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'clamp(20px, 6vw, 40px)', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>✍️</div>
            <h3 style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Заполни анкету</h3>
            <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'24px', lineHeight:1.6 }}>Чтобы бизнесы могли найти тебя в каталоге — нужно заполнить профиль.</p>
            <Link href="/become-author" style={{ padding:'12px 32px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600 }}>Заполнить анкету</Link>
          </div>
        )}
      </div>
    </main>
  )
}
CLAUDE_EOF_MARKER

echo "-> lib/badges.ts"
mkdir -p "$(dirname "lib/badges.ts")"
cat > "lib/badges.ts" << 'CLAUDE_EOF_MARKER'
import { supabase } from './supabase'

// Бизнес: бейдж = непрочитанные сообщения от авторов
export async function getBusinessBadgeCount(businessId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_business_badge_count', { p_business_id: businessId })
  if (error) return 0
  return data ?? 0
}

// Автор: бейдж = непрочитанные сообщения от бизнеса + новые входящие заявки (status='new')
export async function getAuthorBadgeCount(authorId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_author_badge_count', { p_author_id: authorId })
  if (error) return 0
  return data ?? 0
}
CLAUDE_EOF_MARKER

echo "-> supabase-badge-rpc.sql"
mkdir -p "$(dirname "supabase-badge-rpc.sql")"
cat > "supabase-badge-rpc.sql" << 'CLAUDE_EOF_MARKER'
-- Бейдж бизнеса: непрочитанные сообщения от авторов (1 запрос вместо 2)
create or replace function get_business_badge_count(p_business_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from messages m
  join requests r on r.id = m.request_id
  where r.business_id = p_business_id
    and m.sender_role = 'author'
    and m.read = false
$$;

-- Бейдж автора: новые заявки (status='new') + непрочитанные сообщения от бизнеса (1 запрос вместо 2)
create or replace function get_author_badge_count(p_author_id uuid)
returns int
language sql
stable
as $$
  select
    (select count(*) from requests where author_id = p_author_id and status = 'new')::int
    +
    (select count(*)
       from messages m
       join requests r on r.id = m.request_id
       where r.author_id = p_author_id
         and m.sender_role = 'business'
         and m.read = false)::int
$$;
CLAUDE_EOF_MARKER

echo "== Готово. Проверь: git status =="
