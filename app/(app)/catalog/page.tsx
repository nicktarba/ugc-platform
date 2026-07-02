'use client'
import { useEffect, useState, type CSSProperties } from 'react'
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

type SearchMode = 'ai' | 'regular'

// Города для автодополнения — фокус на ДВФО (основной рынок агентства), плюс крупные города РФ
const CITY_LIST = [
  'Владивосток', 'Хабаровск', 'Находка', 'Уссурийск', 'Артём', 'Благовещенск',
  'Южно-Сахалинск', 'Петропавловск-Камчатский', 'Комсомольск-на-Амуре', 'Биробиджан',
  'Магадан', 'Чита', 'Улан-Удэ', 'Якутск',
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург',
]

function CityPicker({ value, onChange, placeholder, width, inputStyle }: { value: string; onChange: (v: string) => void; placeholder: string; width: string; inputStyle?: CSSProperties }) {
  const [open, setOpen] = useState(false)
  const filtered = value ? CITY_LIST.filter(c => c.toLowerCase().startsWith(value.toLowerCase())).slice(0, 8) : CITY_LIST.slice(0, 8)
  return (
    <div style={{ position:'relative', width }}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #e0ddd8', borderRadius:'10px', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box', ...inputStyle }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'#fff', border:'1px solid #e0ddd8', borderRadius:'10px', boxShadow:'0 4px 16px rgba(0,0,0,0.08)', zIndex:20, overflow:'hidden', maxHeight:'220px', overflowY:'auto' }}>
          {filtered.map(c => (
            <div
              key={c}
              onMouseDown={() => { onChange(c); setOpen(false) }}
              style={{ padding:'8px 12px', fontSize:'13px', cursor:'pointer', color:'#1a1a1a' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0ede6')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >{c}</div>
          ))}
        </div>
      )}
    </div>
  )
}

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
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [showAllTags, setShowAllTags] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>((searchParams.get('mode') as SearchMode) || 'regular')
  const [aiSearching, setAiSearching] = useState(false)
  const [aiResults, setAiResults] = useState<{id:string; score:number; match_type?:string; reason:string}[] | null>(null)
  const [aiFilteredOutCount, setAiFilteredOutCount] = useState(0)
  const FOLLOWERS_MAX_CAP = 20000
  const [minFollowers, setMinFollowers] = useState(0)
  const [maxFollowers, setMaxFollowers] = useState(FOLLOWERS_MAX_CAP)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)

  const [modalAuthor, setModalAuthor] = useState<Author|null>(null)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sending, setSending] = useState(false)
  const [requestMap, setRequestMap] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const AI_PLACEHOLDERS = ['кофейня, нужен обзор заведения', 'девушка, фитнес, ЗОЖ', 'детский центр, мама-блогер', 'автосервис, мужская аудитория', 'салон красоты, бьюти-сфера', 'ресторан, семейная аудитория']
  const REGULAR_PLACEHOLDERS = ['кофейня Владивосток', 'мама блогер бартер', 'фитнес тренер', 'авто ремонт', 'путешествия Азия']
  const PLACEHOLDERS = searchMode === 'ai' ? AI_PLACEHOLDERS : REGULAR_PLACEHOLDERS

  useEffect(() => {
    setPlaceholderIdx(0)
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000)
    return () => clearInterval(t)
  }, [searchMode])

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

  // Слова, которые есть в описании почти любого автора независимо от ниши —
  // не несут сигнала о релевантности, только шумят при постфильтрации.
  const GENERIC_WORDS = ['обзор', 'обзоры', 'обзора', 'обзором', 'обзорам', 'делюсь', 'контент', 'блог', 'блогер', 'снимаю', 'показываю', 'рассказываю']

  // Пост-фильтр результатов ИИ-поиска: YandexGPT Lite иногда придумывает связь без опоры
  // в данных автора. Отсекаем авторов без смыслового пересечения с запросом по CONCEPT_MAP —
  // НО только для типов связи, где буквальное пересечение слов вообще имеет смысл проверять
  // (direct/content/scenario/geo). Тип audience — это связь через демографию подписчиков
  // автора (доход, стадия жизни семьи), а не через его собственную нишу: у мамы-блогера
  // в bio не будет слова "мультиварка", и не должно быть. Для audience keyword-проверка
  // структурно не работает — доверяем оценке модели целиком.
  // Если модель сама написала в reason явное отрицание ("не подходит", "нет связи"),
  // результат выкидывается независимо от score и match_type. Score и текстовое обоснование —
  // два независимых поля одного ответа модели, и они иногда расходятся: модель честно
  // признаёт в тексте, что связи нет, но всё равно включает автора в массив с проходным
  // баллом. Текстовое самопротиворечие — более надёжный сигнал, чем число, которое модель
  // могла проставить не глядя.
  const NEGATION_PATTERNS = ['не подходит', 'не связан', 'нет связи', 'не является', 'не относится', 'не подойдёт', 'не рекомендую']
  const hasNegation = (reason: string) => {
    const r = reason.toLowerCase()
    return NEGATION_PATTERNS.some(p => r.includes(p))
  }

  const filterAiResultsByRelevance = (
    results: { id:string; score:number; match_type?:string; reason:string }[],
    authorsList: Author[],
    query: string
  ) => {
    const withoutSelfContradicting = results.filter(r => !hasNegation(r.reason))

    const meaningfulWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !GENERIC_WORDS.includes(w))
    if (meaningfulWords.length === 0) return withoutSelfContradicting

    const hasKnownCategory = meaningfulWords.some(w =>
      Object.keys(CONCEPT_MAP).some(trigger => w.startsWith(trigger) || trigger.startsWith(w.slice(0, 4)))
    )
    if (!hasKnownCategory) return withoutSelfContradicting // вне таксономии — фильтровать нечем, доверяем ИИ

    const allWords = expandSearch(meaningfulWords)
    return withoutSelfContradicting.filter(r => {
      if (r.match_type === 'audience') return true // проверяется моделью, не keyword-совпадением
      const author = authorsList.find(a => a.id === r.id)
      if (!author) return false
      const fieldText = [author.name, author.city, author.occupation, author.bio, author.hobbies, ...(author.lifestyle || [])].filter(Boolean).join(' ').toLowerCase()
      return allWords.some(w => fieldText.includes(w))
    })
  }

  // Единая логика: сначала выбираем базовый набор (результат ИИ-поиска ИЛИ обычного keyword-поиска),
  // затем поверх него применяем общие фильтры (город/бартер/категории/сортировка) — независимо от режима.
  useEffect(() => {
    let base: Author[]

    if (aiResults) {
      const ids = aiResults.map(r => r.id)
      base = ids.map(id => authors.find(a => a.id === id)).filter(Boolean) as Author[]
    } else if (searchMode === 'regular' && search.trim()) {
      const searchWords = search.toLowerCase().split(/\s+/).filter(w => w.length > 1)
      const allWords = expandSearch(searchWords)
      const scored = authors.map(a => {
        let score = 0
        let hits = 0
        const fieldText = [a.name, a.city, a.occupation, a.bio, a.hobbies, ...(a.lifestyle || [])].filter(Boolean).join(' ').toLowerCase()
        const fieldWords = fieldText.split(/[\s,;.!?·—–\-]+/).filter(w => w.length > 2)
        for (const w of searchWords) {
          if (['бартер','бартера','бартеру'].includes(w)) { if (a.open_to_barter) { score += 8; hits++ }; continue }
          if (fieldText.includes(w)) { score += 6; hits++; continue }
          const root = w.slice(0, Math.max(4, Math.floor(w.length * 0.6)))
          if (fieldWords.some(fw => fw.startsWith(root) || w.startsWith(fw.slice(0, Math.max(4, Math.floor(fw.length * 0.6)))))) { score += 5; hits++; continue }
        }
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
      base = scored.filter(s => s.hits > 0).sort((a, b) => b.score - a.score).map(s => s.author)
    } else {
      base = authors
    }

    // "бартер" словом в тексте запроса — учитываем только для обычного поиска
    if (searchMode === 'regular' && !aiResults) {
      const searchWords = search.toLowerCase().split(/\s+/).filter(w => w.length > 1)
      const hasBarter = searchWords.some(w => ['бартер', 'бартера', 'бартеру'].includes(w))
      if (hasBarter) base = base.filter(a => a.open_to_barter)
    }

    if (city) { const c = city.toLowerCase(); base = base.filter(a => a.city?.toLowerCase().includes(c)) }
    if (barter === 'yes') base = base.filter(a => a.open_to_barter)
    if (barter === 'no') base = base.filter(a => !a.open_to_barter)
    if (lifestyleFilter.length > 0) base = base.filter(a => lifestyleFilter.some(tag => a.lifestyle?.includes(tag)))
    if (minFollowers > 0 || maxFollowers < FOLLOWERS_MAX_CAP) {
      base = base.filter(a => a.followers_count >= minFollowers && (maxFollowers >= FOLLOWERS_MAX_CAP || a.followers_count <= maxFollowers))
    }
    if (sort === 'followers') base = [...base].sort((a, b) => b.followers_count - a.followers_count)
    else if (sort === 'rating') base = [...base].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))

    setFiltered(base)
    setVisibleCount(12)
  }, [authors, search, city, barter, lifestyleFilter, sort, aiResults, searchMode, minFollowers, maxFollowers])

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (city) params.set('city', city)
      if (barter !== 'all') params.set('barter', barter)
      if (sort !== 'relevance') params.set('sort', sort)
      if (lifestyleFilter.length > 0) params.set('lifestyle', lifestyleFilter.join(','))
      if (searchMode !== 'ai') params.set('mode', searchMode)
      const qs = params.toString()
      router.replace(qs ? `/catalog?${qs}` : '/catalog', { scroll: false })
    }, 400)
    return () => clearTimeout(timer)
  }, [search, city, barter, sort, lifestyleFilter, searchMode, router])

  // ИИ-поиск — явное действие (кнопка/Enter), не авто-триггер
  const runAiSearch = async () => {
    if (!search.trim() || search.trim().length < 2 || authors.length === 0) return
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
      const raw = data.results?.length > 0 ? data.results : []
      const relevant = filterAiResultsByRelevance(raw, authors, search)
        .sort((a, b) => b.score - a.score) // не доверяем порядку из ответа модели — сортируем сами
      setAiFilteredOutCount(raw.length - relevant.length)
      setAiResults(relevant)
    } catch {
      setAiResults(null)
      toast.error('ИИ-поиск сейчас недоступен. Попробуй обычный поиск.')
    }
    setAiSearching(false)
  }

  const clearAiSearch = () => {
    setAiResults(null)
    setAiFilteredOutCount(0)
    setSearch('')
  }

  const switchMode = (mode: SearchMode) => {
    if (mode === searchMode) return
    setSearchMode(mode)
    setAiResults(null)
    setShowAdvanced(mode === 'regular')
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

  const activeFiltersCount = (searchMode === 'ai' && city ? 1 : 0) + (barter !== 'all' ? 1 : 0) + lifestyleFilter.length + (sort !== 'relevance' ? 1 : 0) + (minFollowers > 0 || maxFollowers < FOLLOWERS_MAX_CAP ? 1 : 0)

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'clamp(28px, 7vw, 48px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'32px' }}>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'40px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Каталог авторов</h1>
          <p style={{ fontSize:'15px', color:'#7a7570' }}>{filtered.length} {filtered.length===1?'автор':filtered.length<5?'автора':'авторов'}</p>
        </div>

        {/* Mode tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
          <button onClick={() => switchMode('regular')} style={{ flex:'1', padding:'12px 16px', borderRadius:'14px', border: searchMode==='regular' ? '1.5px solid #C56A43' : '1.5px solid #e0ddd8', background: searchMode==='regular' ? '#fdf3e7' : '#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
            <div style={{ fontSize:'14px', fontWeight:700, color: searchMode==='regular' ? '#C56A43' : '#1a1a1a', marginBottom:'2px' }}>🔍 Обычный поиск</div>
            <div style={{ fontSize:'12px', color:'#9a9590' }}>Точные слова, город и фильтры сразу</div>
          </button>
          <button onClick={() => switchMode('ai')} style={{ flex:'1', padding:'12px 16px', borderRadius:'14px', border: searchMode==='ai' ? '1.5px solid #C56A43' : '1.5px solid #e0ddd8', background: searchMode==='ai' ? '#fdf3e7' : '#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'left', position:'relative' }}>
            <div style={{ fontSize:'14px', fontWeight:700, color: searchMode==='ai' ? '#C56A43' : '#1a1a1a', marginBottom:'2px' }}>🤖 Умный ИИ-поиск</div>
            <div style={{ fontSize:'12px', color:'#9a9590' }}>Находит по смыслу и объясняет выбор — там, где обычный поиск не сработает</div>
          </button>
        </div>


        {/* Search */}
        <div style={{ marginBottom:'6px' }}>
          <div style={{ display:'flex', gap:'8px' }}>
            <div style={{ position:'relative', flex:'1' }}>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); if (aiResults) setAiResults(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && searchMode === 'ai') runAiSearch() }}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                style={{ width:'100%', padding:'16px 44px 16px 48px', border:'1.5px solid #e0ddd8', borderRadius:'16px', fontSize:'16px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
              />
              <span style={{ position:'absolute', left:'18px', top:'50%', transform:'translateY(-50%)', fontSize:'20px', opacity:0.4 }}>🔍</span>
              {search && (
                <button onClick={() => { setSearch(''); setAiResults(null) }} style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#9a9590', padding:'4px' }}>✕</button>
              )}
            </div>
            {searchMode === 'regular' ? (
              <CityPicker
                value={city}
                onChange={setCity}
                placeholder="Город"
                width="150px"
                inputStyle={{ padding:'16px', borderRadius:'16px', fontSize:'15px' }}
              />
            ) : (
              <button onClick={runAiSearch} disabled={!search.trim() || aiSearching} style={{ padding:'0 24px', borderRadius:'16px', fontSize:'14px', fontWeight:700, border:'none', cursor: !search.trim() || aiSearching ? 'not-allowed' : 'pointer', fontFamily:'inherit', background: !search.trim() ? '#e8e6e1' : 'linear-gradient(135deg, #C56A43, #d4845f)', color: !search.trim() ? '#9a9590' : '#fff', opacity: aiSearching ? 0.7 : 1, whiteSpace:'nowrap' }}>
                {aiSearching ? '🔄 Ищем...' : 'Найти'}
              </button>
            )}
          </div>
          <p style={{ fontSize:'12px', color:'#9a9590', marginTop:'6px', paddingLeft:'4px', lineHeight:1.5 }}>
            {searchMode === 'ai'
              ? '💡 ИИ ищет по смыслу, не по ключевым словам. Опишите бизнес: «кофейня, нужен обзор» — или портрет автора: «девушка, фитнес, ЗОЖ». Подберёт до 10 авторов и объяснит, чем каждый подходит.'
              : '💡 Ищет по точным словам, синонимам и корням в профиле автора. Город можно указать сразу в поле справа.'}
          </p>
        </div>

        {/* AI results banner */}
        {aiResults && aiResults.length > 0 && (
          <div style={{ padding:'10px 16px', background:'#fafaf9', border:'1px solid #e8e6e1', borderRadius:'12px', marginTop:'12px', marginBottom:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px' }}>
            <span style={{ fontSize:'13px', color:'#5a5650' }}>
              🤖 ИИ подобрал {aiResults.length} {aiResults.length === 1 ? 'автора' : aiResults.length < 5 ? 'автора' : 'авторов'}
              {aiFilteredOutCount > 0 && <span style={{ color:'#9a9590' }}> · ещё {aiFilteredOutCount} отсеяно по проверке на связь с запросом</span>}
            </span>
            <button onClick={clearAiSearch} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'#9a9590', fontFamily:'inherit', textDecoration:'underline' }}>Показать всех</button>
          </div>
        )}
        {aiResults && aiResults.length === 0 && (
          <div style={{ padding:'10px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'12px', marginTop:'12px', marginBottom:'16px', fontSize:'13px', color:'#dc2626' }}>
            {aiFilteredOutCount > 0
              ? `ИИ предложил ${aiFilteredOutCount} ${aiFilteredOutCount === 1 ? 'автора' : 'авторов'}, но ни один не прошёл проверку на явную связь с запросом. Попробуй обычный поиск или переформулируй запрос.`
              : 'В каталоге пока нет авторов, подходящих под этот запрос.'}
          </div>
        )}

        {/* Filters toggle — только в ИИ-режиме, в обычном фильтры всегда видны */}
        <div style={{ display:'flex', gap:'8px', marginTop:'12px', marginBottom:'16px', alignItems:'center', flexWrap:'wrap' }}>
          {searchMode === 'ai' && (
            <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ padding:'9px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:500, border:'1px solid #e0ddd8', cursor:'pointer', fontFamily:'inherit', background: showAdvanced ? '#f0ede6' : '#fff', color:'#5a5650' }}>
              ⚙️ Фильтры{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
            </button>
          )}
          {activeFiltersCount > 0 && (
            <button onClick={() => { setCity(''); setBarter('all'); setLifestyleFilter([]); setSort('relevance'); setMinFollowers(0); setMaxFollowers(FOLLOWERS_MAX_CAP) }} style={{ padding:'8px 12px', background:'none', border:'none', cursor:'pointer', fontSize:'13px', color:'#dc2626', fontFamily:'inherit' }}>Сбросить всё</button>
          )}
        </div>

        {/* Advanced panel — компактный тулбар, не отдельная форма */}
        {showAdvanced && (
          <div style={{ marginBottom:'24px', paddingBottom:'20px', borderBottom:'1px solid #e8e6e1', display:'flex', flexDirection:'column', gap:'14px' }}>
            <style>{`
              .followers-range { -webkit-appearance:none; appearance:none; position:absolute; top:0; left:0; width:100%; height:4px; background:transparent; margin:0; pointer-events:none; }
              .followers-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:15px; height:15px; border-radius:50%; background:#C56A43; cursor:pointer; pointer-events:auto; margin-top:-5.5px; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
              .followers-range::-moz-range-thumb { width:15px; height:15px; border-radius:50%; background:#C56A43; cursor:pointer; pointer-events:auto; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
              .followers-range::-webkit-slider-runnable-track { height:4px; background:transparent; }
              .followers-range::-moz-range-track { height:4px; background:transparent; }
            `}</style>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center' }}>
              {searchMode === 'ai' && (
                <CityPicker value={city} onChange={setCity} placeholder="Город" width="130px" />
              )}
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding:'8px 12px', border:'1.5px solid #e0ddd8', borderRadius:'10px', fontSize:'13px', background:'#fff', color:'#1a1a1a', cursor:'pointer', fontFamily:'inherit' }}>
                <option value="relevance">По релевантности</option>
                <option value="new">Новые</option>
                <option value="followers">По подписчикам</option>
                <option value="rating">По рейтингу</option>
              </select>
              <div style={{ display:'flex', gap:'3px' }}>
                {[{val:'all' as const,label:'Бартер: все'},{val:'yes' as const,label:'Бартер'},{val:'no' as const,label:'Без бартера'}].map(opt => (
                  <button key={opt.val} onClick={()=>setBarter(opt.val)} style={{ padding:'8px 12px', borderRadius:'8px', fontSize:'13px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', borderColor: barter===opt.val?'#1a1a1a':'#e0ddd8', background: barter===opt.val?'#1a1a1a':'#fff', color: barter===opt.val?'#fff':'#5a5650' }}>{opt.label}</button>
                ))}
              </div>
              <div style={{ width:'1px', height:'22px', background:'#e0ddd8', margin:'0 2px' }} />
              <div style={{ minWidth:'220px' }}>
                <div style={{ fontSize:'11px', color:'#9a9590', marginBottom:'4px' }}>
                  Подписчики: {minFollowers.toLocaleString('ru')} — {maxFollowers >= FOLLOWERS_MAX_CAP ? `${FOLLOWERS_MAX_CAP.toLocaleString('ru')}+` : maxFollowers.toLocaleString('ru')}
                </div>
                <div style={{ position:'relative', height:'15px' }}>
                  <div style={{ position:'absolute', top:'5.5px', left:0, right:0, height:'4px', background:'#e8e6e1', borderRadius:'2px' }} />
                  <div style={{ position:'absolute', top:'5.5px', height:'4px', background:'#C56A43', borderRadius:'2px', left:`${(minFollowers/FOLLOWERS_MAX_CAP)*100}%`, right:`${100-(maxFollowers/FOLLOWERS_MAX_CAP)*100}%` }} />
                  <input type="range" className="followers-range" min={0} max={FOLLOWERS_MAX_CAP} step={100} value={minFollowers}
                    onChange={e => setMinFollowers(Math.min(Number(e.target.value), maxFollowers - 100))} />
                  <input type="range" className="followers-range" min={0} max={FOLLOWERS_MAX_CAP} step={100} value={maxFollowers}
                    onChange={e => setMaxFollowers(Math.max(Number(e.target.value), minFollowers + 100))} />
                </div>
              </div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center' }}>
              {CATEGORIES.map(cat => {
                const active = cat.tags.some(t => lifestyleFilter.includes(t))
                return (
                  <button key={cat.label} onClick={() => toggleCategory(cat.tags)} style={{ padding:'8px 12px', borderRadius:'8px', fontSize:'13px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', borderColor: active ? '#C56A43' : '#e0ddd8', background: active ? '#fdf3e7' : '#fff', color: active ? '#C56A43' : '#5a5650' }}>{cat.label}</button>
                )
              })}
              <button onClick={() => setShowAllTags(v => !v)} style={{ padding:'8px 4px', background:'none', border:'none', cursor:'pointer', fontSize:'13px', color:'#9a9590', fontFamily:'inherit', textDecoration:'underline', whiteSpace:'nowrap' }}>
                {showAllTags ? 'Скрыть' : `Ещё интересы (+${Object.keys(TAG_COLORS).length - CATEGORIES.length})`}
              </button>
            </div>
            {showAllTags && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {Object.keys(TAG_COLORS).map(tag => {
                  const active = lifestyleFilter.includes(tag)
                  return (
                    <button key={tag} onClick={() => setLifestyleFilter(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])} style={{ padding:'6px 11px', borderRadius:'8px', fontSize:'12px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', borderColor: active ? '#C56A43' : '#e0ddd8', background: active ? '#fdf3e7' : '#fff', color: active ? '#C56A43' : '#7a7570' }}>{tag}</button>
                  )
                })}
              </div>
            )}
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

                    {/* AI tip — отдельный выделенный блок с объяснением, не дубль тегов */}
                    {aiResults && (() => {
                      const r = aiResults.find(r => r.id === a.id)
                      if (!r) return null
                      const icons: Record<string, string> = { direct:'🎯', scenario:'🎬', audience:'👥', content:'📸', geo:'📍' }
                      const icon = r.match_type ? icons[r.match_type] || '✨' : '✨'
                      return (
                        <div style={{ padding:'9px 11px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'10px', marginBottom:'12px', fontSize:'12.5px', color:'#8a5a2e', lineHeight:1.45 }}>
                          {icon} {r.reason}
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
