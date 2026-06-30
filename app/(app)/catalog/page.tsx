'use client'
import { useEffect, useState, useRef } from 'react'
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
  const [sort, setSort] = useState(searchParams.get('sort') || 'relevance')
  const [lifestyleFilter, setLifestyleFilter] = useState<string[]>(() => {
    const lf = searchParams.get('lifestyle')
    return lf ? lf.split(',') : []
  })
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [visibleCount, setVisibleCount] = useState(12)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [aiSearching, setAiSearching] = useState(false)
  const [aiResults, setAiResults] = useState<{id:string; score:number; match_type?:string; reason:string}[] | null>(null)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [modalAuthor, setModalAuthor] = useState<Author|null>(null)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sending, setSending] = useState(false)
  const [requestMap, setRequestMap] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const PLACEHOLDERS = ['кофейня, обзор заведения', 'фитнес-блогер с аудиторией', 'детский центр, мама-блогер', 'девушка, мода, стиль', 'автосервис, мужская аудитория', 'фуд-блогер для ресторана', 'салон красоты, бьюти', 'мама с детьми, бартер', 'барбершоп, мужской стиль', 'тревел-блогер, Азия']

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000)
    return () => clearInterval(t)
  }, [])

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
    supabase.from('authors').select('id, name, city, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, avatar_url, completed_deals_count, avg_rating, reviews_count').eq('status', 'approved').order('created_at', { ascending: false }).then(({ data, error: err }) => {
      if (err) { toast.error('Не удалось загрузить авторов. Проверь соединение.') }
      setAuthors((data as Author[]) || [])
      setLoading(false)
    })
  }, [userId, userRole])

  const CONCEPT_MAP: Record<string, string[]> = {
    // Спорт и фитнес
    'спорт': ['фитнес','тренер','тренировк','спорт','кроссфит','бег','йога','активный спорт','зож','здоров','зал','качалк','штанг','гантел','пилатес','танц'],
    'фитнес': ['фитнес','тренер','тренировк','спорт','кроссфит','йога','активный спорт','зож','зал'],
    'тренажерн': ['фитнес','тренер','тренировк','спорт','кроссфит','активный спорт','зож','зал'],
    'зал': ['фитнес','тренер','тренировк','спорт','кроссфит','активный спорт','зож'],
    'йога': ['йога','медитац','осознанн','зож','фитнес','спорт','активный спорт','растяжк','пилатес'],
    'пилатес': ['пилатес','йога','фитнес','спорт','тренер','реформер','растяжк','активный спорт'],
    // Еда и рестораны
    'кофейн': ['кофе','кафе','бариста','латте','капучино','обжарк','кофе и кафе','рестораны','еда','фуд','заведен'],
    'кафе': ['кофе','кафе','ресторан','еда','фуд','кофе и кафе','рестораны','заведен','меню','кухн'],
    'ресторан': ['ресторан','кафе','еда','фуд','кухн','шеф','меню','рестораны','кофе и кафе','заведен','бар'],
    'еда': ['еда','фуд','рецепт','кухн','готовк','ресторан','кафе','рестораны','кофе и кафе','питан'],
    'фуд': ['фуд','еда','рецепт','ресторан','кафе','food','рестораны','кофе и кафе','кухн'],
    // Красота
    'салон': ['красот','маникюр','стилист','визаж','уход','бьюти','косметик','красота и уход','мода и стиль','ногт','волос','причёск'],
    'красот': ['красот','маникюр','стилист','визаж','уход','бьюти','косметик','красота и уход','мода и стиль'],
    'бьюти': ['красот','маникюр','стилист','визаж','уход','бьюти','косметик','красота и уход'],
    'маникюр': ['маникюр','ногт','красот','уход','дизайн','салон','красота и уход'],
    'косметик': ['косметик','уход','красот','бьюти','крем','сыворотк','красота и уход'],
    // Мода
    'мода': ['мода','стиль','одежд','образ','гардероб','шопинг','мода и стиль','бренд','аутфит'],
    'стиль': ['стиль','мода','одежд','образ','гардероб','мода и стиль','имидж'],
    'одежд': ['мода','стиль','одежд','бренд','шопинг','мода и стиль'],
    // Семья и дети
    'мама': ['мама','дети','ребёнок','семья','воспитан','детск','семья и дети','родител','малыш','материнств'],
    'дети': ['дети','мама','семья','ребёнок','детск','воспитан','семья и дети','родител','развива'],
    'семь': ['семья','дети','мама','ребёнок','семья и дети','родител'],
    // Авто
    'авто': ['авто','машин','тачк','тюнинг','дрифт','автомобил','автосервис','авто'],
    'машин': ['авто','машин','тачк','тюнинг','автомобил','автосервис','авто'],
    'автосервис': ['авто','машин','ремонт','сервис','автосервис','автомобил','авто'],
    // Путешествия
    'путешеств': ['путешеств','тревел','туризм','отель','гид','поездк','путешествия','страна','город'],
    'туризм': ['путешеств','тревел','туризм','отель','путешествия','турист'],
    // Технологии
    'технолог': ['технолог','IT','гаджет','программ','разработ','технологии','AI','софт'],
    'айти': ['технолог','IT','программ','разработ','технологии','стартап'],
    // Бизнес
    'бизнес': ['бизнес','предприниматель','стартап','компания','бизнес','управлен','инвестиц'],
    'предпринимат': ['бизнес','предприниматель','стартап','бизнес'],
    // Интерьер и ремонт
    'интерьер': ['интерьер','дизайн','ремонт','декор','мебель','квартир','дом','искусство'],
    'ремонт': ['ремонт','интерьер','стройк','декор','квартир','дом'],
    // Музыка и культура
    'музык': ['музык','гитар','песн','концерт','группа','музыка','кавер'],
    'фото': ['фото','съёмк','фотограф','камер','портрет','искусство'],
    'видео': ['видео','съёмк','монтаж','ролик','рилс','продакшн','дрон'],
    // Цветы и декор
    'цвет': ['цвет','букет','флорист','декор','оформлен','искусство'],
    'свадьб': ['свадьб','декор','оформлен','букет','невест','торжеств','флорист'],
  }

  const expandSearch = (words: string[]): string[] => {
    const expanded = new Set(words)
    for (const w of words) {
      for (const [trigger, related] of Object.entries(CONCEPT_MAP)) {
        if (w.startsWith(trigger) || trigger.startsWith(w.slice(0, 4))) {
          related.forEach(r => expanded.add(r))
        }
      }
    }
    return Array.from(expanded)
  }

  useEffect(() => {
    if (aiResults) return
    let f = authors
    const searchWords = search.toLowerCase().split(/\s+/).filter(w => w.length > 1)
    const hasBarter = searchWords.some(w => ['бартер', 'бартера', 'бартеру'].includes(w))

    if (searchWords.length > 0) {
      const allWords = expandSearch(searchWords)
      const scored = f.map(a => {
        let score = 0
        let hits = 0
        const fieldText = [a.name, a.city, a.occupation, a.bio, a.hobbies, ...(a.lifestyle || [])].filter(Boolean).join(' ').toLowerCase()
        const fieldWords = fieldText.split(/[\s,;.!?·—–\-]+/).filter(w => w.length > 2)
        // Direct keyword matches (higher weight)
        for (const w of searchWords) {
          if (['бартер','бартера','бартеру'].includes(w)) { if (a.open_to_barter) { score += 8; hits++ }; continue }
          if (fieldText.includes(w)) { score += 6; hits++; continue }
          const root = w.slice(0, Math.max(4, Math.floor(w.length * 0.6)))
          if (fieldWords.some(fw => fw.startsWith(root) || w.startsWith(fw.slice(0, Math.max(4, Math.floor(fw.length * 0.6)))))) { score += 5; hits++; continue }
        }
        // Semantic matches (lower weight)
        for (const w of allWords) {
          if (searchWords.includes(w)) continue
          if (fieldText.includes(w)) { score += 3; hits++ }
        }
        if (hits > 0) {
          if (a.avg_rating) score += a.avg_rating
          if (a.completed_deals_count > 0) score += Math.min(a.completed_deals_count, 3)
        }
        return { author: a, score, hits }
      })
      f = scored.filter(s => s.hits > 0).sort((a, b) => b.score - a.score).map(s => s.author)
    }

    if (hasBarter) f = f.filter(a => a.open_to_barter)
    if (city) { const c = city.toLowerCase(); f = f.filter(a => a.city?.toLowerCase().includes(c)) }
    if (barter === 'yes') f = f.filter(a => a.open_to_barter)
    if (barter === 'no') f = f.filter(a => !a.open_to_barter)
    if (lifestyleFilter.length > 0) f = f.filter(a => lifestyleFilter.some(tag => a.lifestyle?.includes(tag)))
    if (sort === 'followers') f = [...f].sort((a, b) => b.followers_count - a.followers_count)
    else if (sort === 'rating') f = [...f].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
    setFiltered(f)
    setVisibleCount(12)
  }, [authors, search, city, barter, lifestyleFilter, sort, aiResults])

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (city) params.set('city', city)
      if (barter !== 'all') params.set('barter', barter)
      if (sort !== 'relevance') params.set('sort', sort)
      if (lifestyleFilter.length > 0) params.set('lifestyle', lifestyleFilter.join(','))
      const qs = params.toString()
      router.replace(qs ? `/catalog?${qs}` : '/catalog', { scroll: false })
    }, 400)
    return () => clearTimeout(timer)
  }, [search, city, barter, sort, lifestyleFilter, router])

  // Debounced AI search - triggers 1.5s after typing stops
  useEffect(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    if (!search.trim() || search.trim().length < 3 || authors.length === 0) {
      setAiResults(null)
      setAiSearching(false)
      return
    }
    aiTimerRef.current = setTimeout(async () => {
      setAiSearching(true)
      try {
        const authorsData = authors.map(a => ({
          id: a.id, name: a.name, city: a.city, occupation: a.occupation,
          bio: a.bio, lifestyle: a.lifestyle, open_to_barter: a.open_to_barter
        }))
        const resp = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: search.trim(), authors: authorsData })
        })
        const data = await resp.json()
        if (data.results?.length > 0) {
          setAiResults(data.results)
          const ids = data.results.map((r: {id:string}) => r.id)
          const sorted = ids.map((id: string) => authors.find(a => a.id === id)).filter(Boolean) as Author[]
          setFiltered(sorted)
        } else {
          setAiResults(null)
        }
      } catch {
        setAiResults(null)
      }
      setAiSearching(false)
    }, 1500)
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current) }
  }, [search, authors])

  const clearAiSearch = () => {
    setAiResults(null)
    setSearch('')
  }

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

  const CATEGORIES = [
    { label: '🍽 Еда', tags: ['Кофе и кафе', 'Рестораны', 'ЗОЖ и питание'] },
    { label: '💪 Спорт', tags: ['Активный спорт'] },
    { label: '✈️ Путешествия', tags: ['Путешествия'] },
    { label: '👗 Стиль', tags: ['Мода и стиль', 'Красота и уход'] },
    { label: '🚗 Авто', tags: ['Авто'] },
    { label: '💻 Тех и бизнес', tags: ['Технологии', 'Бизнес'] },
    { label: '🎵 Культура', tags: ['Музыка', 'Кино и сериалы', 'Книги', 'Искусство'] },
    { label: '👨‍👩‍👧 Семья', tags: ['Семья и дети'] },
  ]

  const toggleCategory = (tags: string[]) => {
    const allActive = tags.every(t => lifestyleFilter.includes(t))
    if (allActive) setLifestyleFilter(prev => prev.filter(t => !tags.includes(t)))
    else setLifestyleFilter(prev => [...prev.filter(t => !tags.includes(t)), ...tags])
  }

  const activeFiltersCount = (city ? 1 : 0) + (barter !== 'all' ? 1 : 0) + lifestyleFilter.length + (sort !== 'relevance' ? 1 : 0)

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'clamp(28px, 7vw, 48px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'32px' }}>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'40px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Каталог авторов</h1>
          <p style={{ fontSize:'15px', color:'#7a7570' }}>{filtered.length} {filtered.length===1?'автор':filtered.length<5?'автора':'авторов'}</p>
        </div>

        {/* Search */}
        <div style={{ marginBottom:'16px' }}>
          <div style={{ position:'relative' }}>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); if (aiResults) setAiResults(null) }}
              placeholder={PLACEHOLDERS[placeholderIdx]}
              style={{ width:'100%', padding:'16px 52px 16px 48px', border:'1.5px solid #e0ddd8', borderRadius:'16px', fontSize:'16px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
            />
            <span style={{ position:'absolute', left:'18px', top:'50%', transform:'translateY(-50%)', fontSize:'20px', opacity:0.4 }}>🔍</span>
            {aiSearching && (
              <span style={{ position:'absolute', right:'18px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'#C56A43', fontWeight:500 }}>ищем...</span>
            )}
            {search && !aiSearching && (
              <button onClick={() => { setSearch(''); setAiResults(null) }} style={{ position:'absolute', right:'18px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#9a9590', padding:'4px' }}>✕</button>
            )}
          </div>
          <p style={{ fontSize:'12px', color:'#9a9590', marginTop:'6px', paddingLeft:'4px', lineHeight:1.5 }}>💡 Можно описать бизнес: «кофейня, нужен обзор» — или портрет блогера: «девушка, фитнес, ЗОЖ»</p>
        </div>

        {/* AI results banner */}
        {aiResults && (
          <div style={{ padding:'14px 20px', background:'linear-gradient(135deg, #fdf3e7, #fff)', border:'1px solid #f5dcb8', borderRadius:'14px', marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px' }}>
            <span style={{ fontSize:'14px', color:'#b45309' }}>✨ Подобрали {aiResults.length} {aiResults.length === 1 ? 'автора' : aiResults.length < 5 ? 'автора' : 'авторов'} по вашему запросу</span>
            <button onClick={clearAiSearch} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'13px', color:'#9a9590', fontFamily:'inherit', textDecoration:'underline' }}>Показать всех</button>
          </div>
        )}

        {/* Advanced toggle */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px', alignItems:'center' }}>
          <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ padding:'8px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:500, border:'1px solid #e0ddd8', cursor:'pointer', fontFamily:'inherit', background: showAdvanced ? '#f0ede6' : '#fff', color:'#5a5650' }}>
            ⚙️ Расширенный поиск{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </button>
          {activeFiltersCount > 0 && (
            <button onClick={() => { setCity(''); setBarter('all'); setLifestyleFilter([]); setSort('relevance') }} style={{ padding:'8px 12px', background:'none', border:'none', cursor:'pointer', fontSize:'13px', color:'#dc2626', fontFamily:'inherit' }}>Сбросить всё</button>
          )}
        </div>

        {/* Advanced panel */}
        {showAdvanced && (
          <div style={{ padding:'20px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'16px', marginBottom:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              <div style={{ flex:'1', minWidth:'160px' }}>
                <label style={{ fontSize:'12px', fontWeight:600, color:'#7a7570', marginBottom:'6px', display:'block' }}>Город</label>
                <input value={city} onChange={e=>setCity(e.target.value)} placeholder="Владивосток" style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e0ddd8', borderRadius:'10px', fontSize:'14px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
              </div>
              <div style={{ minWidth:'140px' }}>
                <label style={{ fontSize:'12px', fontWeight:600, color:'#7a7570', marginBottom:'6px', display:'block' }}>Сортировка</label>
                <select value={sort} onChange={e => setSort(e.target.value)} style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e0ddd8', borderRadius:'10px', fontSize:'14px', background:'#fff', color:'#1a1a1a', cursor:'pointer', fontFamily:'inherit' }}>
                  <option value="relevance">По релевантности</option>
                  <option value="new">Новые</option>
                  <option value="followers">По подписчикам</option>
                  <option value="rating">По рейтингу</option>
                </select>
              </div>
              <div style={{ minWidth:'140px' }}>
                <label style={{ fontSize:'12px', fontWeight:600, color:'#7a7570', marginBottom:'6px', display:'block' }}>Бартер</label>
                <div style={{ display:'flex', gap:'4px' }}>
                  {[{val:'all' as const,label:'Все'},{val:'yes' as const,label:'Да'},{val:'no' as const,label:'Нет'}].map(opt => (
                    <button key={opt.val} onClick={()=>setBarter(opt.val)} style={{ flex:1, padding:'9px 0', borderRadius:'8px', fontSize:'13px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', borderColor: barter===opt.val?'#1a1a1a':'#e0ddd8', background: barter===opt.val?'#1a1a1a':'#fff', color: barter===opt.val?'#fff':'#5a5650' }}>{opt.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'#7a7570', marginBottom:'8px', display:'block' }}>Категории</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                {CATEGORIES.map(cat => {
                  const active = cat.tags.some(t => lifestyleFilter.includes(t))
                  return (
                    <button key={cat.label} onClick={() => toggleCategory(cat.tags)} style={{ padding:'8px 14px', borderRadius:'10px', fontSize:'13px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', borderColor: active ? '#C56A43' : '#e0ddd8', background: active ? '#fdf3e7' : '#fff', color: active ? '#C56A43' : '#5a5650' }}>{cat.label}</button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <CatalogSkeleton />
        ) : filtered.length===0 ? (
          <div style={{ textAlign:'center', padding:'80px' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>🔍</div>
            <p style={{ color:'#7a7570', fontSize:'16px' }}>Авторов с такими параметрами пока нет</p>
          </div>
        ) : (
          <>
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

                    {/* AI reason */}
                    {aiResults && (() => {
                      const r = aiResults.find(r => r.id === a.id)
                      if (!r) return null
                      const MATCH_LABELS: Record<string, {icon:string; label:string}> = {
                        direct: {icon:'🎯', label:'Прямое попадание'},
                        scenario: {icon:'🎬', label:'Подходит по сценарию'},
                        audience: {icon:'👥', label:'Совпадение аудитории'},
                        content: {icon:'📸', label:'Подходит для контента'},
                        geo: {icon:'📍', label:'Совпадение по городу'},
                      }
                      const match = r.match_type ? MATCH_LABELS[r.match_type] : null
                      return (
                        <div style={{ padding:'8px 12px', background:'#fdf3e7', borderRadius:'10px', fontSize:'12px', color:'#b45309', marginBottom:'10px' }}>
                          {match && <span style={{ fontWeight:600 }}>{match.icon} {match.label} · </span>}
                          {r.reason}
                        </div>
                      )
                    })()}

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
          </>
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

