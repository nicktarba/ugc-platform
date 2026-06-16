'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'

const AUTHORS = [
  { initial: 'М', bg: '#fdf3e7', color: '#c17f3e', name: 'Михаил Т.', city: 'Краснодар', role: 'Автолюбитель · строит гоночный корч', desc: 'Снимает процесс сборки машины, тест-драйвы и покатушки. Аудитория — мужчины 22–35, любители авто и механики.', inst: '7 200', tg: '4 100', tags: ['Автосервис', 'Детейлинг', 'Шины'], extra: '★ 3 сделки', extraStyle: { background: '#fdf3e7', border: '1px solid #f5dcb8', color: '#c17f3e' } },
  { initial: 'С', bg: '#f0fdf4', color: '#16a34a', name: 'Соня В.', city: 'Москва', role: 'Мастер красоты · блог о процедурах', desc: 'Пишет честно про косметику, показывает процедуры в салоне и домашний уход. Аудитория — девушки 20–34, интересуются красотой.', inst: '5 700', stories: '920', tags: ['Косметика', 'Салоны', 'Уход'], extra: 'Бартер', extraStyle: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' } },
  { initial: 'А', bg: '#fdf4ff', color: '#7c3aed', name: 'Аня Р.', city: 'Питер', role: 'Молодая мама · жизнь с малышом', desc: 'Честно про материнство, лайфхаки и быт с ребёнком. Аудитория — мамы 24–38, ищут советы по товарам для детей.', inst: '3 400', tg: '1 200', tags: ['Детские товары', 'Питание', 'Одежда'], extra: null, extraStyle: null },
  { initial: 'Д', bg: '#e8f4fd', color: '#1a6fa8', name: 'Даша К.', city: 'Екатеринбург', role: 'Фитнес-тренер · ЗОЖ и питание', desc: 'Тренировки, разборы питания, честные отзывы на добавки. Аудитория — активные 21–35, следят за здоровьем.', inst: '11 800', stories: '620', tags: ['Спортпит', 'Клубы', 'Одежда'], extra: 'Бартер', extraStyle: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' } },
]

const TAG = { padding: '3px 9px', background: '#f0ede6', borderRadius: '100px', fontSize: '11px', color: '#7a7570', fontWeight: 500 } as const

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

  if (checking) return <div style={{ minHeight: '100vh', background: '#fafaf9' }} />

  const btnDark = { padding: '13px 28px', background: '#1a1a1a', borderRadius: '100px', textDecoration: 'none', color: '#fff', fontSize: '15px', fontWeight: 600, display: 'inline-block' } as const
  const btnOutline = { padding: '13px 28px', border: '1.5px solid #d4d0c8', borderRadius: '100px', textDecoration: 'none', color: '#1a1a1a', fontSize: '15px', fontWeight: 500, display: 'inline-block', background: '#fff' } as const
  const btnAmber = { padding: '13px 28px', background: '#c17f3e', borderRadius: '100px', textDecoration: 'none', color: '#fff', fontSize: '15px', fontWeight: 600, display: 'inline-block' } as const

  return (
    <main style={{ background: '#fafaf9', minHeight: '100vh' }}>
      <AppHeader />

      {/* ═══ HERO ═══ */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: 'clamp(52px, 10vw, 88px) clamp(16px, 5vw, 40px) clamp(44px, 8vw, 72px)', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '5px 16px', background: '#f0ede6', borderRadius: '100px', fontSize: '13px', color: '#7a7570', marginBottom: '24px', fontWeight: 500 }}>
          Площадка микро-авторов · от 300 до 30 000 подписчиков
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(36px, 8vw, 68px)', fontWeight: 700, lineHeight: 1.1, color: '#1a1a1a', marginBottom: '24px', letterSpacing: '-1px' }}>
          Живые люди с <span style={{ fontStyle: 'italic', color: '#c17f3e' }}>тёплой</span> аудиторией
        </h1>
        <p style={{ fontSize: '17px', color: '#5a5650', maxWidth: '600px', margin: '0 auto 14px', lineHeight: 1.75 }}>
          Ценность автора определяется не количеством подписчиков, а совпадением его стиля жизни, аудитории и контекста с задачами бизнеса.
        </p>
        <p style={{ fontSize: '14px', color: '#9a9590', maxWidth: '500px', margin: '0 auto 40px', lineHeight: 1.65 }}>
          Выбирайте авторов по городу, Instagram, профессии, хобби и темам, в которых они органичны.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={btnDark}>Стать автором — бесплатно</Link>
          <Link href="/catalog" style={btnOutline}>Смотреть каталог</Link>
        </div>
        <p style={{ fontSize: '12px', color: '#b0ada8', marginTop: '16px' }}>Уже 200+ авторов · Москва, Питер, регионы</p>
      </section>

      {/* ═══ ДЛЯ АВТОРОВ ═══ */}
      <section style={{ padding: 'clamp(44px, 8vw, 72px) clamp(16px, 5vw, 40px)', maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'inline-block', padding: '5px 14px', background: '#f0ede6', borderRadius: '100px', fontSize: '12px', color: '#7a7570', fontWeight: 500, marginBottom: '14px' }}>Для авторов</div>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 700, marginBottom: '12px', lineHeight: 1.2 }}>
            У тебя 500 подписчиков?<br />
            <span style={{ color: '#c17f3e' }}>Это уже аудитория для бизнеса.</span>
          </h2>
          <p style={{ fontSize: '15px', color: '#7a7570', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }}>
            Мы работаем с авторами от 300 до 30 000 подписчиков — бизнес ищёт живых людей, а не миллионников.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {AUTHORS.map(a => (
            <div key={a.name} style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: '18px', padding: '20px', display: 'flex', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: a.bg, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 700, flexShrink: 0, alignSelf: 'flex-start', marginTop: '2px' }}>{a.initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', marginBottom: '2px' }}>{a.name} · {a.city}</div>
                <div style={{ fontSize: '12px', color: '#9a9590', marginBottom: '8px' }}>{a.role}</div>
                <p style={{ fontSize: '13px', color: '#5a5650', lineHeight: 1.6, marginBottom: '10px' }}>{a.desc}</p>
                <div style={{ fontSize: '12px', color: '#9a9590', marginBottom: '8px' }}>
                  {a.inst && <><strong style={{ color: '#1a1a1a' }}>{a.inst}</strong> inst</>}
                  {a.tg && <> · <strong style={{ color: '#1a1a1a' }}>{a.tg}</strong> tg</>}
                  {a.stories && <> · сторис <strong style={{ color: '#1a1a1a' }}>{a.stories}</strong></>}
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {a.tags.map(t => <span key={t} style={TAG}>{t}</span>)}
                  {a.extra && <span style={{ ...TAG, ...a.extraStyle }}>{a.extra}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={btnDark}>Заполнить анкету бесплатно</Link>
          <Link href="/catalog" style={btnOutline}>Смотреть всех в каталоге</Link>
        </div>
      </section>

      {/* ═══ ДЛЯ БИЗНЕСА ═══ */}
      <section style={{ background: '#1a1a1a', padding: 'clamp(44px, 8vw, 72px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '48px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', padding: '5px 14px', background: 'rgba(255,255,255,.1)', borderRadius: '100px', fontSize: '12px', color: '#c0bdb8', fontWeight: 500, marginBottom: '18px' }}>Для бизнеса</div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 700, color: '#fff', marginBottom: '14px', lineHeight: 1.2 }}>
              Микро-блогер продаёт лучше, чем миллионник
            </h2>
            <p style={{ fontSize: '15px', color: '#9a9590', lineHeight: 1.75, marginBottom: '10px' }}>
              Аудитория от 300 до 30 000 — живая, лояльная, доверяет автору. Реклама выглядит как рекомендация друга, а не интеграция.
            </p>
            <p style={{ fontSize: '14px', color: '#7a7570', lineHeight: 1.65, marginBottom: '28px' }}>
              Найдите автора по нише, городу и аудитории — и договоритесь напрямую без агентств.
            </p>
            <Link href="/catalog" style={btnAmber}>Открыть каталог авторов →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: '🎯', title: 'Точное попадание в ЦА', text: 'Фитнес-тренер рекламирует спортпит — органично и работает' },
              { icon: '💬', title: 'Напрямую, без посредников', text: 'Пишете сами, договариваетесь в чате, никаких агентств' },
              { icon: '💰', title: 'Бюджет от 1 000 ₽ или бартер', text: 'Микро-авторы открыты к гибким условиям' },
            ].map(item => (
              <div key={item.title} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '14px', padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '22px', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '13px', color: '#9a9590', lineHeight: 1.5 }}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ КАК РАБОТАЕТ ═══ */}
      <section style={{ background: '#fff', borderTop: '1px solid #e8e6e1', borderBottom: '1px solid #e8e6e1', padding: 'clamp(44px, 8vw, 72px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, marginBottom: '10px' }}>Как это работает</h2>
            <p style={{ fontSize: '15px', color: '#7a7570' }}>От регистрации до первого предложения — за несколько минут</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
            {[
              { n: '1', title: 'Заполни анкету', text: 'Профиль, соцсети, стиль жизни' },
              { n: '2', title: 'Появись в каталоге', text: 'После быстрой модерации' },
              { n: '3', title: 'Получай предложения', text: 'Бизнес сам находит тебя' },
              { n: '4', title: 'Договорись в чате', text: 'Условия, бюджет, сроки' },
            ].map(s => (
              <div key={s.n} style={{ textAlign: 'center', padding: '18px 12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f0ede6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontFamily: 'Fraunces, serif', fontSize: '17px', fontWeight: 700, color: '#c17f3e' }}>{s.n}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginBottom: '5px' }}>{s.title}</div>
                <div style={{ fontSize: '12px', color: '#9a9590', lineHeight: 1.5 }}>{s.text}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '28px' }}>
            <Link href="/register" style={btnDark}>Зарегистрироваться сейчас →</Link>
          </div>
        </div>
      </section>

      {/* ═══ ФИНАЛЬНЫЙ CTA ═══ */}
      <section style={{ padding: 'clamp(44px, 8vw, 72px) clamp(16px, 5vw, 40px)', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, color: '#1a1a1a', marginBottom: '10px' }}>Ты микро-автор?</h2>
          <p style={{ fontSize: '15px', color: '#7a7570', marginBottom: '26px', lineHeight: 1.7 }}>Заполни анкету — бизнесы сами найдут тебя. Бесплатно, без скрытых условий.</p>
          <Link href="/register" style={{ ...btnAmber, fontSize: '16px', padding: '14px 40px' }}>Заполнить анкету</Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #e8e6e1', padding: 'clamp(16px, 5vw, 24px) clamp(16px, 5vw, 40px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#9a9590' }}>
        <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, color: '#1a1a1a' }}>ugcmarket</span>
        <span>Площадка микро-авторов</span>
      </footer>
    </main>
  )
}
