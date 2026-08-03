'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { useApp } from '../AppContext'
import { CatalogSkeleton } from '@/components/Skeleton'
import UiIcon from '@/components/UiIcon'
import styles from './catalog.module.css'

type Author = { id:string; name:string; city:string; instagram_url:string; telegram_url:string|null; telegram_followers:number; followers_count:number; stories_views:number; occupation:string; lifestyle:string[]; hobbies:string; bio:string; open_to_barter:boolean; avatar_url:string|null; completed_deals_count:number; avg_rating:number|null; reviews_count:number }

const TAG_COLORS: Record<string, { bg:string; color:string; border:string }> = {
  // Спорт и здоровье — зелёный
  'Активный спорт': { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  'Фитнес и тренировки': { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  'Йога и пилатес': { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  'Единоборства': { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  'Танцы': { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  'ЗОЖ и питание': { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  'Нутрициология': { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  'Сёрфинг и водный спорт': { bg:'#ecfdf5', color:'#047857', border:'#a7f3d0' },
  // Еда — оранжевый
  'Кофе и кафе': { bg:'#fdf3e7', color:'#b45309', border:'#f5dcb8' },
  'Рестораны': { bg:'#fdf3e7', color:'#b45309', border:'#f5dcb8' },
  'Кондитерская': { bg:'#fdf3e7', color:'#b45309', border:'#f5dcb8' },
  'Бар': { bg:'#fdf3e7', color:'#b45309', border:'#f5dcb8' },
  'Суши и азиатская кухня': { bg:'#fdf3e7', color:'#b45309', border:'#f5dcb8' },
  'Домашняя кухня': { bg:'#fdf3e7', color:'#b45309', border:'#f5dcb8' },
  // Путешествия и авто — голубой
  'Путешествия': { bg:'#e8f4fd', color:'#1a6fa8', border:'#b5d4f4' },
  'Кемпинг и походы': { bg:'#e8f4fd', color:'#1a6fa8', border:'#b5d4f4' },
  'Отели и курорты': { bg:'#e8f4fd', color:'#1a6fa8', border:'#b5d4f4' },
  'Авто': { bg:'#e8f4fd', color:'#1a6fa8', border:'#b5d4f4' },
  'Мотоциклы': { bg:'#e8f4fd', color:'#1a6fa8', border:'#b5d4f4' },
  'Автосервис': { bg:'#e8f4fd', color:'#1a6fa8', border:'#b5d4f4' },
  // Мода и красота — фиолетовый
  'Мода и стиль': { bg:'#fdf4ff', color:'#7c3aed', border:'#e9d5ff' },
  'Красота и уход': { bg:'#fdf4ff', color:'#7c3aed', border:'#e9d5ff' },
  'Барбершоп': { bg:'#fdf4ff', color:'#7c3aed', border:'#e9d5ff' },
  'Маникюр': { bg:'#fdf4ff', color:'#7c3aed', border:'#e9d5ff' },
  'Ювелирка и аксессуары': { bg:'#fdf4ff', color:'#7c3aed', border:'#e9d5ff' },
  'Искусство': { bg:'#fdf4ff', color:'#7c3aed', border:'#e9d5ff' },
  // Семья — красный
  'Семья и дети': { bg:'#fff0f0', color:'#dc2626', border:'#fecaca' },
  'Беременность и материнство': { bg:'#fff0f0', color:'#dc2626', border:'#fecaca' },
  'Детское развитие': { bg:'#fff0f0', color:'#dc2626', border:'#fecaca' },
  // Технологии и бизнес — синий
  'Технологии': { bg:'#f0f4ff', color:'#3b5bdb', border:'#c3d4f7' },
  'Гаджеты': { bg:'#f0f4ff', color:'#3b5bdb', border:'#c3d4f7' },
  'Игры и киберспорт': { bg:'#f0f4ff', color:'#3b5bdb', border:'#c3d4f7' },
  'Стриминг': { bg:'#f0f4ff', color:'#3b5bdb', border:'#c3d4f7' },
  'Бизнес': { bg:'#f0f4ff', color:'#3b5bdb', border:'#c3d4f7' },
  'Маркетинг и SMM': { bg:'#f0f4ff', color:'#3b5bdb', border:'#c3d4f7' },
  'Финансы и инвестиции': { bg:'#f0f4ff', color:'#3b5bdb', border:'#c3d4f7' },
  'Недвижимость': { bg:'#f0f4ff', color:'#3b5bdb', border:'#c3d4f7' },
  // Культура — жёлтый
  'Музыка': { bg:'#fef3cd', color:'#92400e', border:'#fde68a' },
  'Кино и сериалы': { bg:'#fef3cd', color:'#92400e', border:'#fde68a' },
  'Фотография': { bg:'#fef3cd', color:'#92400e', border:'#fde68a' },
  'Видеопродакшн': { bg:'#fef3cd', color:'#92400e', border:'#fde68a' },
  // Остальное — нейтральный
  'Книги': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Собаки': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Кошки': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Ветеринария': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Образование и курсы': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Языки': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Психология': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Медицина': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Стоматология': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Массаж и СПА': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Интерьер и декор': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Ремонт': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Мебель': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Садоводство': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Рыбалка': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Охота': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Свадьбы и торжества': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Флористика': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
  'Организация мероприятий': { bg:'#f0ede6', color:'#5a5650', border:'#d4d0c8' },
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
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород',
  'Челябинск', 'Красноярск', 'Самара', 'Уфа', 'Ростов-на-Дону', 'Краснодар', 'Омск', 'Воронеж',
  'Пермь', 'Волгоград', 'Саратов', 'Тюмень', 'Тольятти', 'Барнаул', 'Ижевск', 'Ульяновск',
  'Иркутск', 'Ярославль', 'Махачкала', 'Томск', 'Оренбург', 'Кемерово', 'Новокузнецк', 'Рязань',
  'Астрахань', 'Пенза', 'Липецк', 'Киров', 'Чебоксары', 'Тула', 'Калининград', 'Курск',
  'Ставрополь', 'Сочи', 'Тверь', 'Магнитогорск', 'Иваново', 'Брянск', 'Белгород', 'Сургут',
  'Владимир', 'Нижний Тагил', 'Архангельск', 'Симферополь', 'Калуга', 'Волжский', 'Смоленск',
  'Саранск', 'Череповец', 'Курган', 'Орёл', 'Вологда', 'Владикавказ', 'Мурманск', 'Тамбов',
  'Стерлитамак', 'Грозный', 'Кострома', 'Петрозаводск', 'Нижневартовск', 'Новороссийск',
  'Йошкар-Ола', 'Таганрог', 'Сыктывкар', 'Нальчик', 'Шахты', 'Дзержинск', 'Орск', 'Ангарск',
  'Старый Оскол', 'Великий Новгород', 'Прокопьевск', 'Химки', 'Псков', 'Бийск', 'Энгельс',
  'Рыбинск', 'Балаково', 'Северодвинск', 'Армавир', 'Подольск', 'Королёв', 'Мытищи', 'Люберцы',
  'Балашиха', 'Одинцово', 'Красногорск', 'Домодедово', 'Реутов', 'Долгопрудный', 'Электросталь',
  'Жуковский', 'Пятигорск', 'Кисловодск', 'Новочеркасск', 'Ессентуки', 'Копейск', 'Октябрьский',
  'Абакан', 'Норильск', 'Салехард',
  // Дальний Восток
  'Владивосток', 'Хабаровск', 'Находка', 'Уссурийск', 'Артём', 'Благовещенск',
  'Южно-Сахалинск', 'Петропавловск-Камчатский', 'Комсомольск-на-Амуре', 'Биробиджан',
  'Магадан', 'Чита', 'Улан-Удэ', 'Якутск', 'Партизанск', 'Арсеньев', 'Дальнегорск',
  'Спасск-Дальний', 'Лесозаводск',
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
  const [showAdvanced, setShowAdvanced] = useState(false)
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
    'спорт': ['фитнес','тренер','тренировк','спорт','кроссфит','бег','йога','активный спорт','зож','здоров','зал','качалк','штанг','гантел','пилатес','танц','единоборств','бокс','плаван','лыж','сноуборд'],
    'фитнес': ['фитнес','тренер','тренировк','спорт','кроссфит','йога','активный спорт','зож','зал','похуден','тело','форм'],
    'тренажерн': ['фитнес','тренер','тренировк','спорт','кроссфит','активный спорт','зож','зал'],
    'зал': ['фитнес','тренер','тренировк','спорт','кроссфит','активный спорт','зож'],
    'йога': ['йога','медитац','осознанн','зож','фитнес','спорт','активный спорт','растяжк','пилатес','баланс'],
    'пилатес': ['пилатес','йога','фитнес','спорт','тренер','реформер','растяжк','активный спорт'],
    'танц': ['танц','хореограф','танцовщ','балет','сальса','хип-хоп','активный спорт'],
    'бег': ['бег','марафон','трейл','кардио','спорт','активный спорт','зож'],
    'единоборств': ['единоборств','бокс','мма','карат','борьб','спорт','активный спорт'],
    // Еда и рестораны
    'кофейн': ['кофе','кафе','бариста','латте','капучино','обжарк','кофе и кафе','рестораны','еда','фуд','заведен'],
    'кафе': ['кофе','кафе','ресторан','еда','фуд','кофе и кафе','рестораны','заведен','меню','кухн'],
    'ресторан': ['ресторан','кафе','еда','фуд','кухн','шеф','меню','рестораны','кофе и кафе','заведен','бар','суши','пицц','бургер'],
    'еда': ['еда','фуд','рецепт','кухн','готовк','ресторан','кафе','рестораны','кофе и кафе','питан','десерт','выпечк','кондитер'],
    'фуд': ['фуд','еда','рецепт','ресторан','кафе','food','рестораны','кофе и кафе','кухн'],
    'суши': ['суши','ролл','японск','ресторан','рестораны','еда','фуд','кофе и кафе'],
    'пицц': ['пицц','пиццер','ресторан','рестораны','доставк','еда','фуд'],
    'кондитер': ['кондитер','торт','десерт','выпечк','сладост','еда','фуд'],
    'бар': ['бар','коктейл','напитк','ресторан','рестораны','заведен','кофе и кафе'],
    // Красота
    'салон': ['красот','маникюр','стилист','визаж','уход','бьюти','косметик','красота и уход','мода и стиль','ногт','волос','причёск','барбершоп'],
    'красот': ['красот','маникюр','стилист','визаж','уход','бьюти','косметик','красота и уход','мода и стиль'],
    'бьюти': ['красот','маникюр','стилист','визаж','уход','бьюти','косметик','красота и уход'],
    'маникюр': ['маникюр','ногт','красот','уход','дизайн','салон','красота и уход','педикюр'],
    'косметик': ['косметик','уход','красот','бьюти','крем','сыворотк','красота и уход'],
    'барбершоп': ['барбершоп','барбер','стрижк','мужск','красот','красота и уход','волос'],
    'парикмахер': ['парикмахер','стрижк','волос','окрашиван','красот','салон','красота и уход'],
    // Мода
    'мода': ['мода','стиль','одежд','образ','гардероб','шопинг','мода и стиль','бренд','аутфит','обувь'],
    'стиль': ['стиль','мода','одежд','образ','гардероб','мода и стиль','имидж'],
    'одежд': ['мода','стиль','одежд','бренд','шопинг','мода и стиль'],
    'обувь': ['обувь','кроссовк','кед','мода','стиль','мода и стиль','шопинг'],
    'украшен': ['украшен','бижутер','ювелир','аксессуар','мода','стиль','мода и стиль'],
    // Семья и дети
    'мама': ['мама','дети','ребёнок','семья','воспитан','детск','семья и дети','родител','малыш','материнств','беременн'],
    'дети': ['дети','мама','семья','ребёнок','детск','воспитан','семья и дети','родител','развива','школ','садик'],
    'семь': ['семья','дети','мама','ребёнок','семья и дети','родител'],
    'беременн': ['беременн','мама','роды','малыш','семья','семья и дети','материнств'],
    'детск': ['детск','дети','мама','ребёнок','семья и дети','игрушк','развива'],
    // Авто
    'авто': ['авто','машин','тачк','тюнинг','дрифт','автомобил','автосервис','авто','водител','гараж'],
    'машин': ['авто','машин','тачк','тюнинг','автомобил','автосервис','авто'],
    'автосервис': ['авто','машин','ремонт','сервис','автосервис','автомобил','авто','шиномонтаж'],
    'мотоцикл': ['мотоцикл','мото','байк','авто','скутер'],
    // Путешествия
    'путешеств': ['путешеств','тревел','туризм','отель','гид','поездк','путешествия','страна','город','самолёт','виз'],
    'туризм': ['путешеств','тревел','туризм','отель','путешествия','турист','экскурс'],
    'отель': ['отель','гостиниц','хостел','путешеств','путешествия','отдых','курорт'],
    'кемпинг': ['кемпинг','поход','палатк','природ','путешеств','путешествия','активный спорт'],
    // Технологии
    'технолог': ['технолог','IT','гаджет','программ','разработ','технологии','AI','софт','приложен'],
    'айти': ['технолог','IT','программ','разработ','технологии','стартап','код','веб'],
    'гаджет': ['гаджет','смартфон','телефон','ноутбук','технолог','технологии','обзор'],
    // Бизнес
    'бизнес': ['бизнес','предприниматель','стартап','компания','бизнес','управлен','инвестиц','маркетинг','продаж'],
    'предпринимат': ['бизнес','предприниматель','стартап','бизнес'],
    'маркетинг': ['маркетинг','реклам','продвижен','smm','бизнес','бренд','таргет'],
    'финанс': ['финанс','деньг','инвестиц','крипт','банк','бизнес','бухгалтер','экономик'],
    // Интерьер и ремонт
    'интерьер': ['интерьер','дизайн','ремонт','декор','мебель','квартир','дом','искусство'],
    'ремонт': ['ремонт','интерьер','стройк','декор','квартир','дом','плитк','штукатурк'],
    'мебель': ['мебель','интерьер','дизайн','кухн','шкаф','стол','дом','декор'],
    // Строительство
    'стройк': ['стройк','строител','дом','ремонт','фундамент','бетон','кровл','фасад'],
    'строител': ['строител','стройк','дом','ремонт','архитект','проект'],
    // Музыка и культура
    'музык': ['музык','гитар','песн','концерт','группа','музыка','кавер','диджей','барабан'],
    'фото': ['фото','съёмк','фотограф','камер','портрет','искусство','свадебн'],
    'видео': ['видео','съёмк','монтаж','ролик','рилс','продакшн','дрон','оператор'],
    // Цветы и декор
    'цвет': ['цвет','букет','флорист','декор','оформлен','искусство'],
    'свадьб': ['свадьб','декор','оформлен','букет','невест','торжеств','флорист','свадебн'],
    // Медицина и здоровье
    'врач': ['врач','доктор','медицин','клиник','здоров','лечен','больниц'],
    'стоматолог': ['стоматолог','зуб','зубн','стомат','клиник','врач','отбелив','брекет'],
    'психолог': ['психолог','терапевт','психотерап','ментальн','тревожн','коуч'],
    'нутрициолог': ['нутрициолог','питан','диет','зож','ЗОЖ и питание','рацион','калор','пп'],
    'массаж': ['массаж','спа','релакс','тело','здоров','красота и уход'],
    'здоров': ['здоров','зож','ЗОЖ и питание','медицин','витамин','бад','иммунитет'],
    // Образование
    'обучен': ['обучен','курс','урок','школ','преподават','репетитор','образован','тренинг'],
    'курс': ['курс','обучен','онлайн','школ','образован','тренинг','вебинар'],
    'репетитор': ['репетитор','урок','обучен','школ','егэ','подготовк','преподават'],
    'английск': ['английск','язык','обучен','курс','перевод','репетитор'],
    // Животные
    'животн': ['животн','питомец','кот','кошк','собак','ветеринар','зоо','корм'],
    'собак': ['собак','щенок','питомец','животн','дрессировк','выгул','зоо'],
    'кошк': ['кошк','кот','котёнок','питомец','животн','зоо'],
    'ветеринар': ['ветеринар','клиник','животн','питомец','лечен','зоо'],
    // Недвижимость
    'недвижим': ['недвижим','квартир','дом','риэлтор','ипотек','аренд','новостройк'],
    'квартир': ['квартир','недвижим','ремонт','интерьер','аренд','продаж','новостройк'],
    // Юристы
    'юрист': ['юрист','адвокат','право','закон','суд','консультац','договор'],
    'адвокат': ['адвокат','юрист','право','суд','защит'],
    // Доставка и логистика
    'доставк': ['доставк','курьер','логистик','перевозк','груз','транспорт'],
    'такси': ['такси','водител','поездк','трансфер','авто'],
    // Игры и киберспорт
    'игр': ['игр','гейм','киберспорт','стрим','летсплей','playstation','xbox','компьютер'],
    'стрим': ['стрим','стример','твич','игр','гейм','контент'],
    // Бытовые услуги
    'клининг': ['клининг','уборк','чистот','химчистк','дом','быт'],
    'химчистк': ['химчистк','стирк','клининг','чистк','одежд'],
    // Рыбалка и outdoor
    'рыбалк': ['рыбалк','рыб','удочк','спиннинг','улов','природ','активный спорт'],
    'охот': ['охот','оружи','природ','лес','активный спорт'],
    'поход': ['поход','трекинг','горы','палатк','природ','кемпинг','путешествия','активный спорт'],
    // Садоводство
    'сад': ['сад','огород','дача','растен','рассад','ландшафт','цветовод'],
    'дача': ['дача','сад','огород','загородн','дом','участок'],
  }

  const expandSearch = (words: string[]): string[] => {
    const expanded = new Set(words)
    for (const w of words) {
      for (const [trigger, related] of Object.entries(CONCEPT_MAP)) {
        // Минимум 4 символа совпадения, чтобы "бар" не матчил "барбершоп",
        // а "зал" не матчил "залив". Точное совпадение коротких триггеров (3 символа) допускается.
        if (w === trigger || (trigger.length >= 4 && w.startsWith(trigger)) || (w.length >= 4 && trigger.startsWith(w.slice(0, Math.max(4, Math.floor(w.length * 0.5)))))) {
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

    // Логируем обычный поиск (fire and forget, с дебаунсом через тот же useEffect)
    if (searchMode === 'regular' && search.trim().length >= 2 && !aiResults) {
      supabase.from('search_logs').insert([{ query: search.trim().toLowerCase(), mode: 'regular', results_count: base.length }])
    }
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
    setShowAdvanced(false)
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
    router.push(`/dashboard/chat/${inserted.id}`)
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
    { label: '🍽 Еда', tags: ['Кофе и кафе', 'Рестораны', 'Кондитерская', 'Бар', 'Суши и азиатская кухня', 'Домашняя кухня'] },
    { label: '💪 Спорт', tags: ['Активный спорт', 'Фитнес и тренировки', 'Йога и пилатес', 'Единоборства', 'Танцы', 'ЗОЖ и питание', 'Нутрициология'] },
    { label: '👗 Стиль', tags: ['Мода и стиль', 'Красота и уход', 'Барбершоп', 'Маникюр', 'Ювелирка и аксессуары'] },
    { label: '✈️ Путешествия', tags: ['Путешествия', 'Кемпинг и походы', 'Отели и курорты'] },
    { label: '🚗 Авто', tags: ['Авто', 'Мотоциклы', 'Автосервис'] },
    { label: '💻 Тех', tags: ['Технологии', 'Гаджеты', 'Игры и киберспорт', 'Стриминг'] },
    { label: '📈 Бизнес', tags: ['Бизнес', 'Маркетинг и SMM', 'Финансы и инвестиции', 'Недвижимость'] },
    { label: '🎵 Культура', tags: ['Музыка', 'Кино и сериалы', 'Книги', 'Искусство', 'Фотография', 'Видеопродакшн'] },
    { label: '👨‍👩‍👧 Семья', tags: ['Семья и дети', 'Беременность и материнство', 'Детское развитие'] },
    { label: '🐾 Животные', tags: ['Собаки', 'Кошки', 'Ветеринария'] },
    { label: '🏠 Дом', tags: ['Интерьер и декор', 'Ремонт', 'Мебель', 'Садоводство'] },
    { label: '🏥 Здоровье', tags: ['Медицина', 'Стоматология', 'Массаж и СПА', 'Психология'] },
  ]

  const toggleCategory = (tags: string[]) => {
    const allActive = tags.every(t => lifestyleFilter.includes(t))
    if (allActive) setLifestyleFilter(prev => prev.filter(t => !tags.includes(t)))
    else setLifestyleFilter(prev => [...prev.filter(t => !tags.includes(t)), ...tags])
  }

  const activeFiltersCount = (searchMode === 'ai' && city ? 1 : 0) + (barter !== 'all' ? 1 : 0) + lifestyleFilter.length + (sort !== 'relevance' ? 1 : 0) + (minFollowers > 0 || maxFollowers < FOLLOWERS_MAX_CAP ? 1 : 0)

  const hasActiveSearch = Boolean(search.trim() || city || lifestyleFilter.length || barter !== 'all' || minFollowers > 0 || maxFollowers < FOLLOWERS_MAX_CAP)

  return (
    <main className={styles.page}>
      <div className={styles.mobileTopbar}>
        <Link href="/" className={styles.mobileBrand}>СВОИ <span>UGC</span></Link>
        {!userId && <Link href="/login" className={styles.mobileLogin}>Войти</Link>}
      </div>

      <div className={styles.container}>
        <header className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>Авторы для рекламы и коллабораций</span>
            <h1>Каталог авторов</h1>
            <p>Ищите по городу, тематике и аудитории. Откройте профиль, обсудите задачу и ведите сделку в одном месте.</p>
          </div>
          <div className={styles.resultCounter}>
            <strong>{filtered.length}</strong>
            <span>{filtered.length === 1 ? 'автор' : filtered.length < 5 ? 'автора' : 'авторов'}</span>
          </div>
        </header>

        <section className={styles.searchPanel} aria-label="Поиск авторов">
          <div className={styles.modeSwitch}>
            <button type="button" className={searchMode === 'regular' ? styles.modeActive : ''} onClick={() => switchMode('regular')}>
              <UiIcon name="search" width={18} height={18} />
              <span><strong>Обычный поиск</strong><small>Точные слова и фильтры</small></span>
            </button>
            <button type="button" className={searchMode === 'ai' ? styles.modeActive : ''} onClick={() => switchMode('ai')}>
              <UiIcon name="sparkles" width={18} height={18} />
              <span><strong>ИИ-подбор</strong><small>По смыслу вашей задачи</small></span>
            </button>
          </div>

          <div className={styles.searchRow}>
            <label className={styles.searchInputWrap}>
              <UiIcon name={searchMode === 'ai' ? 'sparkles' : 'search'} width={20} height={20} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); if (aiResults) setAiResults(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && searchMode === 'ai') runAiSearch() }}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                aria-label={searchMode === 'ai' ? 'Опишите, какого автора нужно найти' : 'Поиск по каталогу'}
              />
              {search && <button type="button" aria-label="Очистить поиск" onClick={() => { setSearch(''); setAiResults(null) }}><UiIcon name="close" width={17} height={17} /></button>}
            </label>

            {searchMode === 'regular' ? (
              <CityPicker value={city} onChange={setCity} placeholder="Город" width="190px" inputStyle={{ height:'54px', borderRadius:'14px', borderColor:'#dedad5', background:'#fff' }} />
            ) : (
              <button type="button" className={styles.aiSearchButton} onClick={runAiSearch} disabled={!search.trim() || aiSearching}>
                {aiSearching ? 'Подбираем…' : 'Подобрать авторов'}
                {!aiSearching && <UiIcon name="arrowRight" width={17} height={17} />}
              </button>
            )}
          </div>

          <div className={styles.searchFooter}>
            <p>{searchMode === 'ai' ? 'Опишите бизнес, продукт и желаемую аудиторию обычными словами.' : 'Можно искать по имени, профессии, тегам, описанию и городу.'}</p>
            <button type="button" className={showAdvanced ? styles.filterButtonActive : styles.filterButton} onClick={() => setShowAdvanced(!showAdvanced)}>
              <UiIcon name="filters" width={17} height={17} />
              Фильтры{activeFiltersCount > 0 ? ` · ${activeFiltersCount}` : ''}
            </button>
          </div>

          {showAdvanced && (
            <div className={styles.filtersPanel}>
              <div className={styles.filterGrid}>
                {searchMode === 'ai' && (
                  <div className={styles.filterField}>
                    <label>Город</label>
                    <CityPicker value={city} onChange={setCity} placeholder="Любой город" width="100%" />
                  </div>
                )}
                <div className={styles.filterField}>
                  <label>Формат сотрудничества</label>
                  <select value={barter} onChange={e => setBarter(e.target.value as 'all'|'yes'|'no')}>
                    <option value="all">Любой</option>
                    <option value="yes">Готовы к бартеру</option>
                    <option value="no">Только оплата</option>
                  </select>
                </div>
                <div className={styles.filterField}>
                  <label>Сортировка</label>
                  <select value={sort} onChange={e => setSort(e.target.value)}>
                    <option value="relevance">По релевантности</option>
                    <option value="followers">По подписчикам</option>
                    <option value="rating">По рейтингу</option>
                  </select>
                </div>
                <div className={`${styles.filterField} ${styles.followersField}`}>
                  <label>Подписчики Instagram</label>
                  <div className={styles.numberFields}>
                    <input type="number" min="0" max={FOLLOWERS_MAX_CAP} value={minFollowers} onChange={e => setMinFollowers(Math.max(0, Number(e.target.value) || 0))} aria-label="Минимум подписчиков" />
                    <span>—</span>
                    <input type="number" min="0" max={FOLLOWERS_MAX_CAP} value={maxFollowers} onChange={e => setMaxFollowers(Math.max(minFollowers, Number(e.target.value) || FOLLOWERS_MAX_CAP))} aria-label="Максимум подписчиков" />
                  </div>
                </div>
              </div>

              <div className={styles.categoryBlock}>
                <div className={styles.categoryHead}>
                  <label>Тематика автора</label>
                  {activeFiltersCount > 0 && (
                    <button type="button" onClick={() => { setCity(''); setBarter('all'); setLifestyleFilter([]); setSort('relevance'); setMinFollowers(0); setMaxFollowers(FOLLOWERS_MAX_CAP) }}>Сбросить фильтры</button>
                  )}
                </div>
                <div className={styles.categoryChips}>
                  {CATEGORIES.map(category => {
                    const selected = category.tags.some(tag => lifestyleFilter.includes(tag))
                    return (
                      <button key={category.label} type="button" className={selected ? styles.categorySelected : ''} onClick={() => toggleCategory(category.tags)}>
                        {category.label.replace(/^\S+\s/, '')}
                        {selected && <UiIcon name="check" width={14} height={14} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {aiResults && aiResults.length > 0 && (
          <div className={styles.aiNotice}>
            <UiIcon name="sparkles" width={19} height={19} />
            <div><strong>ИИ подобрал {aiResults.length} {aiResults.length === 1 ? 'автора' : aiResults.length < 5 ? 'авторов' : 'авторов'}</strong>{aiFilteredOutCount > 0 && <span>Ещё {aiFilteredOutCount} вариантов не прошли проверку релевантности.</span>}</div>
            <button type="button" onClick={clearAiSearch}>Показать весь каталог</button>
          </div>
        )}

        {aiResults && aiResults.length === 0 && (
          <div className={styles.emptyNotice}>
            <UiIcon name="search" width={21} height={21} />
            <span>{aiFilteredOutCount > 0 ? 'Подходящих авторов после проверки не осталось. Попробуйте переформулировать запрос.' : 'В каталоге пока нет авторов под этот запрос.'}</span>
          </div>
        )}

        <div className={styles.catalogToolbar}>
          <div>
            <strong>{hasActiveSearch ? 'Результаты поиска' : 'Все авторы'}</strong>
            <span>{filtered.length} {filtered.length === 1 ? 'профиль' : filtered.length < 5 ? 'профиля' : 'профилей'}</span>
          </div>
          {activeFiltersCount > 0 && <button type="button" onClick={() => { setCity(''); setBarter('all'); setLifestyleFilter([]); setSort('relevance'); setMinFollowers(0); setMaxFollowers(FOLLOWERS_MAX_CAP) }}>Очистить фильтры</button>}
        </div>

        {loading ? <CatalogSkeleton /> : filtered.length === 0 ? (
          <section className={styles.emptyState}>
            <div><UiIcon name="search" width={28} height={28} /></div>
            <h2>Ничего не нашли</h2>
            <p>Измените запрос или уберите часть фильтров. Новые авторы будут появляться в каталоге после модерации.</p>
            <button type="button" onClick={() => { setSearch(''); setCity(''); setBarter('all'); setLifestyleFilter([]); setAiResults(null); setSort('relevance'); setMinFollowers(0); setMaxFollowers(FOLLOWERS_MAX_CAP) }}>Показать всех авторов</button>
          </section>
        ) : (
          <>
            <div className={styles.cardGrid}>
              {filtered.slice(0, visibleCount).map(author => {
                const index = author.id.charCodeAt(0) % HEADER_GRADIENTS.length
                const aiMatch = aiResults?.find(result => result.id === author.id)
                const isFavorite = favoriteIds.includes(author.id)
                return (
                  <article key={author.id} className={styles.authorCard}>
                    <Link href={`/author/${author.id}`} className={styles.cardMedia} aria-label={`Открыть профиль ${author.name}`}>
                      {author.avatar_url ? <img src={author.avatar_url} alt={author.name} /> : (
                        <div className={styles.avatarFallback} style={{ background: HEADER_GRADIENTS[index] }}>{author.name?.[0]?.toUpperCase() || '?'}</div>
                      )}
                      <div className={styles.cardOverlay} />
                      <div className={styles.cardBadges}>
                        {author.open_to_barter && <span>Бартер</span>}
                        {author.avg_rating && <span><UiIcon name="star" width={12} height={12} /> {author.avg_rating}</span>}
                      </div>
                    </Link>

                    {userRole === 'business' && (
                      <button type="button" className={`${styles.favoriteButton}${isFavorite ? ` ${styles.favoriteActive}` : ''}`} onClick={() => toggleFavorite(author.id)} aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}>
                        <UiIcon name="heart" width={19} height={19} fill={isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    )}

                    <div className={styles.cardBody}>
                      <div className={styles.cardTitleRow}>
                        <div>
                          <Link href={`/author/${author.id}`}>{author.name}</Link>
                          <p><UiIcon name="pin" width={14} height={14} /> {author.city}{author.occupation ? ` · ${author.occupation}` : ''}</p>
                        </div>
                      </div>

                      {aiMatch?.reason && <div className={styles.aiReason}><UiIcon name="sparkles" width={15} height={15} /><span>{aiMatch.reason}</span></div>}

                      {author.bio && <p className={styles.cardBio}>{author.bio}</p>}

                      {author.lifestyle?.length > 0 && (
                        <div className={styles.cardTags}>
                          {author.lifestyle.slice(0, 3).map(tag => {
                            const colors = TAG_COLORS[tag] || defaultTag
                            return <span key={tag} style={{ background: colors.bg, color: colors.color, borderColor: colors.border }}>{tag}</span>
                          })}
                          {author.lifestyle.length > 3 && <span className={styles.moreTag}>+{author.lifestyle.length - 3}</span>}
                        </div>
                      )}

                      <div className={styles.cardStats}>
                        <span><strong>{author.followers_count > 0 ? author.followers_count.toLocaleString('ru') : '—'}</strong><small>подписчиков</small></span>
                        <span><strong>{author.stories_views > 0 ? author.stories_views.toLocaleString('ru') : '—'}</strong><small>просмотры</small></span>
                        <span><strong>{author.completed_deals_count || '—'}</strong><small>сделки</small></span>
                      </div>

                      <div className={styles.cardActions}>
                        <Link href={`/author/${author.id}`}>Смотреть профиль</Link>
                        {userRole === 'business' && (requestMap[author.id]
                          ? <Link className={styles.primaryCardAction} href={`/dashboard/chat/${requestMap[author.id]}`}>Открыть сделку</Link>
                          : <button type="button" onClick={() => openModal(author)}>Предложить</button>
                        )}
                        {!userEmail && <Link className={styles.primaryCardAction} href={`/register?redirect=${encodeURIComponent(`/author/${author.id}`)}`}>Связаться</Link>}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {visibleCount < filtered.length && (
              <div className={styles.loadMore}>
                <button type="button" onClick={() => setVisibleCount(current => current + 12)}>Показать ещё <span>{filtered.length - visibleCount}</span></button>
              </div>
            )}
          </>
        )}
      </div>

      {modalAuthor && (
        <div className={styles.modalBackdrop} onClick={() => setModalAuthor(null)}>
          <div className={styles.modal} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="catalog-request-title">
            <button type="button" className={styles.modalClose} onClick={() => setModalAuthor(null)} aria-label="Закрыть"><UiIcon name="close" width={20} height={20} /></button>
            <span className={styles.modalEyebrow}>Новое предложение</span>
            <h2 id="catalog-request-title">Написать {modalAuthor.name}</h2>
            <p>Коротко опишите задачу. После отправки откроется чат, где можно согласовать детали и условия.</p>
            <label className={styles.modalField}>
              <span>Сообщение</span>
              <textarea value={message} onChange={event => setMessage(event.target.value)} rows={5} maxLength={3000} placeholder="Что нужно снять, для какого бизнеса и какой результат вы ожидаете?" />
            </label>
            <div className={styles.modalGrid}>
              <label className={styles.modalField}><span>Бюджет</span><input value={budget} onChange={event => setBudget(event.target.value)} placeholder="Например, 5 000 ₽ или бартер" /></label>
              <label className={styles.modalField}><span>Желаемый срок</span><input type="date" value={deadline} onChange={event => setDeadline(event.target.value)} /></label>
            </div>
            {error && <div className={styles.modalError}>{error}</div>}
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setModalAuthor(null)}>Отмена</button>
              <button type="button" className={styles.modalPrimary} onClick={sendRequest} disabled={sending || !message.trim()}>{sending ? 'Отправляем…' : 'Отправить предложение'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
