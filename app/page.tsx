'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CASES = [
  {
    brandInitial: 'B', brand: 'Botanica', brandKind: 'натуральная косметика',
    request: 'Ищем автора под бьюти-аудиторию для крема на натуральных маслах',
    tags: ['Москва', 'Бьюти', 'Женщины 22–35'],
    author: 'Алина', role: 'Москва · бьюти-мастер', followers: '600 подписчиков',
    snippet: 'Снимает свою работу и делится полезными лайфхаками по уходу и косметике',
    audienceLabel: 'Её аудитория',
    audience: 'Женщины 22–35 лет · уход за собой, косметика и lifestyle-контент',
    matchPct: 94,
    status: 'Подходит — её аудитория совпадает с задачей, а контент органичен для рекламы натурального бьюти-продукта',
  },
  {
    brandInitial: 'D', brand: 'DRIVE Шины', brandKind: 'магазин шин и автотоваров',
    request: 'Ищем автора под мужскую автомобильную аудиторию',
    tags: ['Владивосток', 'Авто', 'Мужчины 18–27'],
    author: 'Артём', role: 'Владивосток · автоэнтузиаст, 21 год', followers: '850 подписчиков',
    snippet: 'Снимает доработки, сборку и развитие своего автопроекта',
    audienceLabel: 'Его аудитория',
    audience: 'Мужчины 18–27 лет, Владивосток · авто, тюнинг и доработки',
    matchPct: 91,
    status: 'Подходит — релевантный микро-автор с понятным контекстом, а не крупный автоблогер',
  },
]

const AUTHORS = [
  { initial: 'М', bg: '#fdf3e7', color: '#c17f3e', name: 'Михаил Т.', city: 'Краснодар', role: 'Автолюбитель · строит гоночный корч', desc: 'Снимает процесс сборки машины, тест-драйвы и покатушки. Аудитория — мужчины 22–35, любители авто и механики.', inst: '7 200', tg: '4 100', tags: ['Автосервис', 'Детейлинг', 'Шины'], extra: '★ 3 сделки', extraStyle: { background: '#fdf3e7', border: '1px solid #f5dcb8', color: '#c17f3e' } },
  { initial: 'С', bg: '#f0fdf4', color: '#16a34a', name: 'Соня В.', city: 'Москва', role: 'Мастер красоты · блог о процедурах', desc: 'Пишет честно про косметику, показывает процедуры в салоне и домашний уход. Аудитория — девушки 20–34, интересуются красотой.', inst: '5 700', stories: '920', tags: ['Косметика', 'Салоны', 'Уход'], extra: 'Бартер', extraStyle: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' } },
  { initial: 'А', bg: '#fdf4ff', color: '#7c3aed', name: 'Аня Р.', city: 'Питер', role: 'Молодая мама · жизнь с малышом', desc: 'Честно про материнство, лайфхаки и быт с ребёнком. Аудитория — мамы 24–38, ищут советы по товарам для детей.', inst: '3 400', tg: '1 200', tags: ['Детские товары', 'Питание', 'Одежда'], extra: null, extraStyle: null },
  { initial: 'Д', bg: '#e8f4fd', color: '#1a6fa8', name: 'Даша К.', city: 'Екатеринбург', role: 'Фитнес-тренер · ЗОЖ и питание', desc: 'Тренировки, разборы питания, честные отзывы на добавки. Аудитория — активные 21–35, следят за здоровьем.', inst: '11 800', stories: '620', tags: ['Спортпит', 'Клубы', 'Одежда'], extra: 'Бартер', extraStyle: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' } },
]

const TAG = { padding: '3px 9px', background: '#f0ede6', borderRadius: '100px', fontSize: '11px', color: '#7a7570', fontWeight: 500 } as const

function HeroSlider() {
  const [i, setI] = useState(0)
  const [anim, setAnim] = useState(true)

  const go = (idx: number) => {
    const n = CASES.length
    setAnim(false)
    setTimeout(() => { setI(((idx % n) + n) % n); setAnim(true) }, 50)
  }

  // Автопереключение каждые 4 секунды
  useEffect(() => {
    const timer = setInterval(() => {
      setAnim(false)
      setTimeout(() => {
        setI(prev => (prev + 1) % CASES.length)
        setAnim(true)
      }, 50)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const c = CASES[i]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ animation: anim ? 'ugcRise .45s ease both' : 'none' }}>
        {/* Запрос бренда */}
        <div style={{ background: '#2A2723', borderRadius: '22px', padding: '19px 21px', boxShadow: '0 16px 38px rgba(42,39,35,.16)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.06em', color: '#b7a690', textTransform: 'uppercase' as const }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C56A43' }} />
            Запрос бренда
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginTop: '13px' }}>
            <span style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '11px', background: '#C56A43', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>{c.brandInitial}</span>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#F6EEE2' }}>{c.brand}</div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#b7a690', marginTop: '1px' }}>{c.brandKind}</div>
            </div>
          </div>
          <p style={{ margin: '14px 0 13px', fontSize: '15.5px', fontWeight: 600, lineHeight: 1.4, color: '#ece2d4' }}>{c.request}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {c.tags.map(tag => (
              <span key={tag} style={{ fontSize: '12.5px', fontWeight: 600, color: '#e7dccd', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.10)', padding: '6px 12px', borderRadius: '9px' }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Коннектор */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '13px 0' }}>
          {[0, 0.2, 0.4].map((delay, idx) => (
            <span key={idx} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C56A43', animation: `ugcPulse 1.4s ease-in-out infinite ${delay}s` }} />
          ))}
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#8a8175', marginLeft: '4px' }}>Платформа подобрала автора</span>
        </div>

        {/* Карточка автора */}
        <div style={{ background: '#FFFFFF', border: '1px solid #EFE4D3', borderRadius: '22px', padding: '19px', boxShadow: '0 20px 46px rgba(42,39,35,.13)' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '17px', flexShrink: 0, background: 'repeating-linear-gradient(135deg, #ECDFCB 0 7px, #F4EADA 7px 14px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <span style={{ fontSize: '8px', color: '#b09a7e', paddingBottom: '5px', fontFamily: 'monospace' }}>фото</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '19px', fontWeight: 800, color: '#2A2723' }}>{c.author}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#7a5a3f', background: '#F2E7D7', padding: '3px 9px', borderRadius: '7px' }}>Телеграм</span>
              </div>
              <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 600, color: '#6b6358' }}>{c.role}</div>
              <div style={{ marginTop: '2px', fontSize: '14px', fontWeight: 700, color: '#C56A43' }}>{c.followers}</div>
            </div>
          </div>

          <div style={{ marginTop: '13px', fontSize: '13.5px', fontWeight: 600, lineHeight: 1.4, color: '#5e574d' }}>{c.snippet}</div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '13px' }}>
            {['Reels', '', ''].map((label, idx) => (
              <div key={idx} style={{ flex: 1, height: '56px', borderRadius: '11px', background: 'repeating-linear-gradient(135deg, #ECDFCB 0 7px, #F4EADA 7px 14px)', display: 'flex', alignItems: 'flex-end', padding: '6px' }}>
                {label && <span style={{ fontSize: '8px', color: '#b09a7e', fontFamily: 'monospace' }}>{label}</span>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '15px', padding: '14px', background: '#FBF6EE', borderRadius: '14px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: '#9a8f7e' }}>{c.audienceLabel}</div>
            <div style={{ marginTop: '6px', fontSize: '14.5px', fontWeight: 600, lineHeight: 1.45, color: '#463f37' }}>{c.audience}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#6b6358' }}>Совпадение с задачей бренда</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#C56A43' }}>{c.matchPct}%</span>
            </div>
            <div style={{ marginTop: '8px', height: '7px', borderRadius: '99px', background: '#EEE2D0', overflow: 'hidden' }}>
              <div style={{ width: `${c.matchPct}%`, height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #D88A52, #C56A43)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '15px', padding: '13px 15px', background: '#EEF1E2', border: '1px solid #DDE2C7', borderRadius: '14px' }}>
            <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', background: '#7E8B4F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, marginTop: '1px' }}>✓</span>
            <span style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4, color: '#4d5234' }}>{c.status}</span>
          </div>
        </div>
      </div>

      {/* Контролы слайдера */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px', padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {CASES.map((_, idx) => (
            <span key={idx} onClick={() => go(idx)} style={{ height: '8px', borderRadius: '99px', cursor: 'pointer', transition: 'width .3s ease, background .3s ease', width: idx === i ? '22px' : '8px', background: idx === i ? '#C56A43' : '#D8C9B4', display: 'inline-block' }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#9a8f7e', letterSpacing: '0.02em' }}>Кейс {i + 1} / {CASES.length}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['‹', i - 1], ['›', i + 1]].map(([label, idx]) => (
              <button key={label as string} onClick={() => go(idx as number)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid #DCCDB6', background: '#FBF7F0', color: '#2A2723', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, fontFamily: 'inherit' }}>{label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const role = data.user?.user_metadata?.role
      if (role === 'business') { router.replace('/catalog'); return }
      if (role === 'author') { router.replace('/dashboard/author'); return }
      if (role === 'admin') { router.replace('/dashboard/admin'); return }
      setChecking(false)
    })
  }, [router])

  if (checking) return <div style={{ minHeight: '100vh', background: '#FBF7F0' }} />

  const btnAmber = { padding: '13px 28px', background: '#c17f3e', borderRadius: '100px', textDecoration: 'none', color: '#fff', fontSize: '15px', fontWeight: 600, display: 'inline-block' } as const
  const btnOutlineSmall = { padding: '13px 28px', border: '1.5px solid #DCCDB6', borderRadius: '100px', textDecoration: 'none', color: '#2A2723', fontSize: '15px', fontWeight: 600, display: 'inline-block', background: 'transparent' } as const

  return (
    <main style={{ background: '#FBF7F0', minHeight: '100vh', fontFamily: "'Manrope', system-ui, sans-serif" }}>

      {/* ═══ HEADER ═══ */}
      <header style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 64px', borderBottom: '1px solid rgba(42,39,35,.06)', background: '#FBF7F0' }}>
        <Link href="/" style={{ fontSize: '23px', fontWeight: 800, letterSpacing: '-0.02em', color: '#2A2723', textDecoration: 'none' }}>
          ugc<span style={{ color: '#C56A43' }}>market</span>
        </Link>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          <Link href="/catalog" style={{ fontSize: '15px', fontWeight: 600, color: '#514a40', textDecoration: 'none' }}>Каталог</Link>
          <Link href="/support" style={{ fontSize: '15px', fontWeight: 600, color: '#514a40', textDecoration: 'none' }}>Поддержка</Link>
          <Link href="/login" style={{ fontSize: '15px', fontWeight: 600, color: '#514a40', textDecoration: 'none' }}>Войти</Link>
          <Link href="/register" style={{ fontSize: '15px', fontWeight: 700, color: '#2A2723', textDecoration: 'none', padding: '11px 20px', border: '1.5px solid #E0D2BC', borderRadius: '12px' }}>Регистрация</Link>
        </nav>
      </header>

      {/* ═══ HERO ═══ */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '620px', height: '620px', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(197,106,67,.10), rgba(197,106,67,0))', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 472px', gap: '60px', padding: '44px 64px 52px' }}>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingTop: '22px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '9px 15px', background: '#F2E7D7', border: '1px solid #E7D7BF', borderRadius: '100px', fontSize: '13.5px', fontWeight: 600, color: '#7a5a3f' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C56A43', flexShrink: 0 }} />
              Площадка микро-авторов · от 300 до 30 000 подписчиков
            </div>

            <h1 style={{ margin: '20px 0 0', fontSize: '64px', fontWeight: 800, lineHeight: 1.0, letterSpacing: '-0.025em', color: '#2A2723' }}>
              Живые люди<br />
              с{' '}
              <span style={{ fontFamily: "'Pacifico', cursive", fontWeight: 400, fontSize: '1.04em', color: '#C56A43', display: 'inline-block', transform: 'rotate(-4deg)', lineHeight: 0.8, padding: '0 0.06em 0 0.02em' }}>тёплой</span>
              <br />аудиторией
            </h1>

            <p style={{ margin: '20px 0 0', maxWidth: '540px', fontSize: '17px', fontWeight: 500, lineHeight: 1.55, color: '#4a443c' }}>
              Ценность автора определяется не количеством подписчиков, а совпадением его стиля жизни, аудитории и контекста с задачами бизнеса.
            </p>
            <p style={{ margin: '10px 0 0', maxWidth: '540px', fontSize: '14px', fontWeight: 500, lineHeight: 1.55, color: '#8a8175' }}>
              Выбирайте авторов по городу, профессии, хобби, темам и стилю жизни
            </p>

            <div style={{ display: 'flex', gap: '14px', marginTop: '28px' }}>
              <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '16px', fontWeight: 700, color: '#FFF7EE', background: '#C56A43', padding: '17px 28px', borderRadius: '14px', textDecoration: 'none', boxShadow: '0 8px 22px rgba(197,106,67,.28)' }}>Стать автором — бесплатно</Link>
              <Link href="/catalog" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '16px', fontWeight: 700, color: '#2A2723', padding: '17px 26px', borderRadius: '14px', border: '1.5px solid #DCCDB6', textDecoration: 'none' }}>Смотреть каталог</Link>
            </div>
          </div>

          <HeroSlider />
        </div>
      </section>

      {/* ═══ ДЛЯ АВТОРОВ ═══ */}
      <section style={{ padding: 'clamp(44px, 8vw, 72px) clamp(16px, 5vw, 64px)', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-block', padding: '5px 14px', background: '#F2E7D7', border: '1px solid #E7D7BF', borderRadius: '100px', fontSize: '12px', color: '#7a5a3f', fontWeight: 600, marginBottom: '14px' }}>Для авторов</div>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800, marginBottom: '12px', lineHeight: 1.15, color: '#2A2723' }}>
            У тебя 500 подписчиков?<br />
            <span style={{ color: '#C56A43' }}>Это уже аудитория для бизнеса.</span>
          </h2>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#8a8175', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }}>
            Мы работаем с авторами от 300 до 30 000 подписчиков — бизнес ищёт живых людей, а не миллионников.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))', gap: '12px', marginBottom: '28px' }}>
          {AUTHORS.map(a => (
            <div key={a.name} style={{ background: '#fff', border: '1px solid #EFE4D3', borderRadius: '18px', padding: '20px', display: 'flex', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: a.bg, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 800, flexShrink: 0, alignSelf: 'flex-start', marginTop: '2px' }}>{a.initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2A2723', marginBottom: '2px' }}>{a.name} · {a.city}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#9a8f7e', marginBottom: '8px' }}>{a.role}</div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#5e574d', lineHeight: 1.6, marginBottom: '10px' }}>{a.desc}</p>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#9a8f7e', marginBottom: '8px' }}>
                  {a.inst && <><strong style={{ color: '#2A2723' }}>{a.inst}</strong> inst</>}
                  {(a as any).tg && <> · <strong style={{ color: '#2A2723' }}>{(a as any).tg}</strong> tg</>}
                  {(a as any).stories && <> · сторис <strong style={{ color: '#2A2723' }}>{(a as any).stories}</strong></>}
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {a.tags.map(t => <span key={t} style={{ padding: '3px 9px', background: '#F2E7D7', borderRadius: '100px', fontSize: '11px', color: '#7a5a3f', fontWeight: 600 }}>{t}</span>)}
                  {a.extra && <span style={{ padding: '3px 9px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, ...a.extraStyle }}>{a.extra}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '15px', fontWeight: 700, color: '#FFF7EE', background: '#C56A43', padding: '14px 28px', borderRadius: '14px', textDecoration: 'none', boxShadow: '0 6px 18px rgba(197,106,67,.22)' }}>Заполнить анкету бесплатно</Link>
          <Link href="/catalog" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '15px', fontWeight: 700, color: '#2A2723', padding: '14px 26px', borderRadius: '14px', border: '1.5px solid #DCCDB6', textDecoration: 'none' }}>Смотреть всех в каталоге</Link>
        </div>
      </section>

      {/* ═══ ДЛЯ БИЗНЕСА ═══ */}
      <section style={{ background: '#2A2723', padding: 'clamp(44px, 8vw, 72px) clamp(16px, 5vw, 64px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', padding: '5px 14px', background: 'rgba(255,255,255,.1)', borderRadius: '100px', fontSize: '12px', color: '#b7a690', fontWeight: 600, marginBottom: '18px' }}>Для бизнеса</div>
            <h2 style={{ fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 800, color: '#F6EEE2', marginBottom: '14px', lineHeight: 1.2 }}>
              Микро-блогер продаёт лучше, чем миллионник
            </h2>
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#b7a690', lineHeight: 1.75, marginBottom: '10px' }}>
              Аудитория от 300 до 30 000 — живая, лояльная, доверяет автору. Реклама выглядит как рекомендация друга, а не интеграция.
            </p>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#8a8175', lineHeight: 1.65, marginBottom: '28px' }}>
              Найдите автора по нише, городу и аудитории — договоритесь напрямую без агентств.
            </p>
            <Link href="/catalog" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '15px', fontWeight: 700, color: '#FFF7EE', background: '#C56A43', padding: '15px 26px', borderRadius: '14px', textDecoration: 'none', boxShadow: '0 8px 22px rgba(197,106,67,.28)' }}>Открыть каталог авторов →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: '🎯', title: 'Точное попадание в ЦА', text: 'Фитнес-тренер рекламирует спортпит — органично и работает' },
              { icon: '💬', title: 'Напрямую, без посредников', text: 'Пишете сами, договариваетесь в чате, никаких агентств' },
              { icon: '💰', title: 'Бюджет от 1 000 ₽ или бартер', text: 'Микро-авторы открыты к гибким условиям' },
            ].map(item => (
              <div key={item.title} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.10)', borderRadius: '14px', padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '22px', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#F6EEE2', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#9a8f7e', lineHeight: 1.5 }}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ КАК РАБОТАЕТ ═══ */}
      <section style={{ background: '#fff', borderTop: '1px solid #EFE4D3', borderBottom: '1px solid #EFE4D3', padding: 'clamp(44px, 8vw, 72px) clamp(16px, 5vw, 64px)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2 style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 800, marginBottom: '10px', color: '#2A2723' }}>Как это работает</h2>
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#8a8175' }}>От регистрации до первого предложения — за несколько минут</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
            {[
              { n: '1', title: 'Заполни анкету', text: 'Профиль, соцсети, стиль жизни' },
              { n: '2', title: 'Появись в каталоге', text: 'После быстрой модерации' },
              { n: '3', title: 'Получай предложения', text: 'Бизнес сам находит тебя' },
              { n: '4', title: 'Договорись в чате', text: 'Условия, бюджет, сроки' },
            ].map(s => (
              <div key={s.n} style={{ textAlign: 'center', padding: '18px 12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F2E7D7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '17px', fontWeight: 800, color: '#C56A43' }}>{s.n}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2A2723', marginBottom: '5px' }}>{s.title}</div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#9a8f7e', lineHeight: 1.5 }}>{s.text}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '28px' }}>
            <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '15px', fontWeight: 700, color: '#FFF7EE', background: '#C56A43', padding: '14px 28px', borderRadius: '14px', textDecoration: 'none', boxShadow: '0 6px 18px rgba(197,106,67,.22)' }}>Зарегистрироваться сейчас →</Link>
          </div>
        </div>
      </section>

      {/* ═══ ФИНАЛЬНЫЙ CTA ═══ */}
      <section style={{ padding: 'clamp(44px, 8vw, 72px) clamp(16px, 5vw, 64px)', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 800, color: '#2A2723', marginBottom: '10px' }}>Ты микро-автор?</h2>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#8a8175', marginBottom: '26px', lineHeight: 1.7 }}>Заполни анкету — бизнесы сами найдут тебя. Бесплатно, без скрытых условий.</p>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '16px', fontWeight: 700, color: '#FFF7EE', background: '#C56A43', padding: '16px 40px', borderRadius: '14px', textDecoration: 'none', boxShadow: '0 8px 22px rgba(197,106,67,.28)' }}>Заполнить анкету</Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #EFE4D3', padding: 'clamp(16px, 5vw, 24px) clamp(16px, 5vw, 64px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 600, color: '#9a8f7e' }}>
        <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', color: '#2A2723' }}>ugc<span style={{ color: '#C56A43' }}>market</span></span>
        <span>Площадка микро-авторов</span>
      </footer>

    </main>
  )
}
