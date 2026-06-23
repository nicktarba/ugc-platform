'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

  const cases = [
    {
      brandInitial: 'B', brand: 'Botanica',
      request: 'Ищем автора для крема на натуральных маслах',
      tags: ['Москва', 'Бьюти', 'Женщины 22–35'],
      author: 'Алина', role: 'Москва · бьюти-мастер', followers: '600 подп.',
      audience: 'Женщины 22–35 · уход, косметика, lifestyle',
      matchLabel: '94%',
    },
    {
      brandInitial: 'D', brand: 'DRIVE Шины',
      request: 'Ищем автора под автомобильную аудиторию',
      tags: ['Владивосток', 'Авто', 'Мужчины 18–27'],
      author: 'Артём', role: 'Владивосток · 21 год', followers: '850 подп.',
      audience: 'Мужчины 18–27 · авто, тюнинг, доработки',
      matchLabel: '91%',
    },
  ]

  const go = (idx: number) => {
    const n = cases.length
    setAnim(false)
    setTimeout(() => { setI(((idx % n) + n) % n); setAnim(true) }, 50)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setAnim(false)
      setTimeout(() => { setI(prev => (prev + 1) % cases.length); setAnim(true) }, 50)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const c = cases[i]

  return (
    <div style={{ position: 'relative' }}>
      {/* Декоративные мини-карточки вокруг слайдера */}
      <div style={{ position: 'absolute', top: '-18px', right: '-12px', width: '72px', height: '96px', borderRadius: '12px', background: 'repeating-linear-gradient(135deg, #E8D9C4 0 8px, #F0E5D4 8px 16px)', boxShadow: '0 6px 16px rgba(42,39,35,.10)', transform: 'rotate(4deg)', zIndex: 1, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '5px 6px', background: 'linear-gradient(transparent, rgba(42,39,35,.5))' }}>
          <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: '7px', fontWeight: 700, color: '#fff' }}>▶ Reels</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: '12px', left: '-18px', width: '64px', height: '64px', borderRadius: '10px', background: 'repeating-linear-gradient(45deg, #DDD0BB 0 7px, #EAE0CE 7px 14px)', boxShadow: '0 4px 14px rgba(42,39,35,.08)', transform: 'rotate(-5deg)', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: '80px', left: '-22px', width: '52px', height: '52px', borderRadius: '50%', background: 'repeating-linear-gradient(135deg, #ECDFCB 0 6px, #F4EADA 6px 12px)', border: '2.5px solid #C56A43', boxShadow: '0 4px 12px rgba(42,39,35,.08)', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: '60px', right: '-16px', width: '60px', height: '78px', borderRadius: '10px', background: 'repeating-linear-gradient(135deg, #D8CCBA 0 7px, #E8DECE 7px 14px)', boxShadow: '0 5px 14px rgba(42,39,35,.08)', transform: 'rotate(-3deg)', zIndex: 1, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 5px', background: 'linear-gradient(transparent, rgba(42,39,35,.4))' }}>
          <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: '7px', fontWeight: 700, color: '#fff' }}>обзор</span>
        </div>
      </div>

      {/* Основной слайдер */}
      <div style={{ position: 'relative', zIndex: 2, animation: anim ? 'ugcRise .35s ease both' : 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Метка */}
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#b49a7a', marginBottom: '7px', marginLeft: '4px', letterSpacing: '.02em' }}>Бренд ищет автора</div>

        {/* Пузырь бренда */}
        <div style={{ alignSelf: 'flex-start', padding: '12px 16px', background: '#2A2723', borderRadius: '16px 16px 16px 4px', transform: 'rotate(-0.8deg)', maxWidth: '88%', boxShadow: '0 6px 18px rgba(42,39,35,.10)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '8px', background: '#C56A43', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>{c.brandInitial}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F2E7D7' }}>{c.brand}</div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#9e917f', marginTop: '1px' }}>{c.request}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
            {c.tags.map(tag => (
              <span key={tag} style={{ fontSize: '10.5px', fontWeight: 600, color: '#ddd0be', background: 'rgba(255,255,255,.07)', padding: '4px 9px', borderRadius: '20px' }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Коннектор */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '4px 0', marginLeft: '20px' }}>
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none" style={{ flexShrink: 0 }}>
            <path d="M12 0 C12 12, 12 12, 20 28" stroke="#C56A43" strokeWidth="1.5" strokeDasharray="3 3" fill="none" strokeLinecap="round" />
            <path d="M16 25 L20 28 L15 28" fill="#C56A43" />
          </svg>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#C56A43', marginLeft: '4px' }}>ugcmarket подобрал</span>
        </div>

        {/* Карточка автора */}
        <div style={{ alignSelf: 'flex-end', marginRight: '4px', background: '#fff', border: '1px solid #EDE3D3', borderRadius: '4px 16px 16px 16px', padding: '14px 15px', transform: 'rotate(0.4deg)', boxShadow: '0 8px 22px rgba(42,39,35,.08)', maxWidth: '92%' }}>
          <div style={{ display: 'flex', gap: '11px', alignItems: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, background: 'repeating-linear-gradient(135deg, #ECDFCB 0 7px, #F4EADA 7px 14px)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#2A2723' }}>{c.author}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#C56A43' }}>{c.followers}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#7a6f60', marginTop: '2px' }}>{c.role}</div>
            </div>
          </div>

          <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 500, lineHeight: 1.35, color: '#6b6358', background: '#FBF6EE', padding: '6px 10px', borderRadius: '20px', display: 'inline-block' }}>{c.audience}</div>

          <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: '#EEF1E2', borderRadius: '20px' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#7E8B4F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#4d5234' }}>Совпадение {c.matchLabel}</span>
          </div>
        </div>
      </div>

      {/* Контролы */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px', zIndex: 2, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {cases.map((_, idx) => (
            <span key={idx} onClick={() => go(idx)} style={{ height: '6px', borderRadius: '99px', cursor: 'pointer', transition: 'width .3s ease, background .3s ease', width: idx === i ? '18px' : '6px', background: idx === i ? '#C56A43' : '#D8C9B4', display: 'inline-block' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['‹', i - 1], ['›', i + 1]].map(([label, idx]) => (
            <button key={label as string} onClick={() => go(idx as number)} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1.5px solid #DCCDB6', background: '#FBF7F0', color: '#2A2723', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>{label}</button>
          ))}
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
              <span style={{ fontFamily: "'Great Vibes', cursive", fontWeight: 400, fontSize: '1.2em', color: '#C56A43', display: 'inline-block', transform: 'rotate(-2deg)', lineHeight: 0.8, padding: '0 0.06em 0 0.02em' }}>тёплой</span>
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
