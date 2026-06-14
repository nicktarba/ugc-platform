'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const C = {
  bg: '#FBF7F0',
  bgAlt: '#F3EAD8',
  ink: '#1F1F1C',
  inkSoft: '#6E6A63',
  forest: '#314B35',
  forestSoft: '#4F6847',
  sage: '#7E916F',
  sagePale: '#E7EDE3',
  caramel: '#C2873F',
  caramelPale: '#F6E6CF',
  card: '#FFFDF8',
  cardAlt: '#F8F1E8',
  line: '#E5DCCF',
  butter: '#F6E2A8',
}

const wrap = { maxWidth: '1180px', margin: '0 auto', padding: '0 24px' }

const HeartDoodle = ({ color = C.forest, size = 28, style }: { color?: string; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M12 20.3c-4-2.6-8-6-8-10.1A4.7 4.7 0 0 1 12 7a4.7 4.7 0 0 1 8 3.2c0 4.1-4 7.5-8 10.1z" />
  </svg>
)

const SparkDoodle = ({ color = C.caramel, size = 26, style }: { color?: string; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" style={style}>
    <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l3.2 3.2M19 19l-3.2-3.2M19 5l-3.2 3.2M5 19l3.2-3.2" />
  </svg>
)

const ArrowDoodle = ({ color = C.forest, style }: { color?: string; style?: React.CSSProperties }) => (
  <svg width="64" height="40" viewBox="0 0 64 40" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M2 30C20 6 44 4 60 16" />
    <path d="M49 9l12 7-9 10" />
  </svg>
)

const MarkerUnderline = ({ color = C.forestSoft, width = 320, style }: { color?: string; width?: number; style?: React.CSSProperties }) => (
  <svg width={width} height="16" viewBox={"0 0 " + width + " 16"} fill="none" style={style}>
    <path d={"M3 10 C " + Math.round(width * 0.28) + " 2, " + Math.round(width * 0.66) + " 15, " + (width - 3) + " 7"} stroke={color} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.5" />
  </svg>
)

const StepArrow = () => (
  <svg width="40" height="24" viewBox="0 0 40 24" fill="none" stroke={C.sage} strokeWidth="2" strokeLinecap="round" strokeDasharray="1 6">
    <path d="M2 12h32" />
    <path d="M26 5l8 7-8 7" strokeDasharray="0" />
  </svg>
)

function Tape({ style }: { style: React.CSSProperties }) {
  return <div style={{ position: 'absolute', width: '70px', height: '24px', background: 'rgba(194,135,63,0.28)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', ...style }} />
}

function Sticker({ children, bg, color, rotate, style }: { children: React.ReactNode; bg: string; color: string; rotate: number; style: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute', background: bg, color, padding: '12px 16px', borderRadius: '10px',
      fontFamily: 'Caveat, cursive', fontSize: '20px', fontWeight: 600, lineHeight: 1.25,
      boxShadow: '0 6px 16px rgba(31,31,28,0.10)', transform: 'rotate(' + rotate + 'deg)',
      maxWidth: '160px', ...style,
    }}>
      {children}
    </div>
  )
}

function Polaroid({ src, caption, rotate, style }: { src: string; caption?: string; rotate: number; style: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute', background: '#fff', padding: '10px 10px 22px', borderRadius: '6px',
      boxShadow: '0 14px 30px rgba(31,31,28,0.14)', transform: 'rotate(' + rotate + 'deg)', ...style,
    }}>
      <img src={src} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px' }} />
      {caption && (
        <div style={{ position: 'absolute', bottom: '2px', left: '12px', right: '12px', fontFamily: 'Caveat, cursive', fontSize: '17px', color: C.ink, fontWeight: 600 }}>{caption}</div>
      )}
    </div>
  )
}

const exampleProfiles = [
  {
    role: 'Фитнес-тренер', img: 'ugc-fitness-card', followers: '600',
    core: 'Ядро аудитории: 400 человек со спортивным интересом',
    topics: ['зал', 'тренировки', 'спортпит', 'растяжка', 'восстановление', 'массаж', 'здоровый режим'],
    fits: ['фитнес-клубы', 'студии растяжки', 'массажные кабинеты', 'магазины спортпита', 'бренды спортивной одежды'],
    insight: 'Аудитория уже собрана вокруг спорта, поэтому фитнес-бизнес попадает в точный и естественный контекст.',
  },
  {
    role: 'Студент', img: 'ugc-student-card', followers: '900',
    core: 'Ядро аудитории: 520 человек из учебной, городской и ивент-среды',
    topics: ['университет', 'кафе между парами', 'мероприятия', 'курсы', 'гаджеты', 'бюджетные предложения'],
    fits: ['кофейни рядом с вузами', 'образовательные курсы', 'языковые школы', 'локальные мероприятия', 'сервисы доставки', 'бренды гаджетов'],
    insight: 'Автор живёт в студенческой среде и может показать продукт там, где его увидит нужная аудитория.',
  },
  {
    role: 'Автолюбитель', img: 'ugc-car-card', followers: '750',
    core: 'Ядро аудитории: 430 человек с интересом к авто и обслуживанию',
    topics: ['поездки', 'мойка', 'детейлинг', 'автосервис', 'заправки', 'шины', 'аксессуары', 'подбор авто'],
    fits: ['детейлинг-центры', 'автосервисы', 'магазины автотоваров', 'шинные центры', 'автострахование', 'компании по подбору авто'],
    insight: 'Тема авто уже является частью жизни автора, поэтому рекомендация выглядит органично.',
  },
  {
    role: 'Девушка-кофеман', img: 'ugc-coffee-card', followers: '1 200',
    core: 'Ядро аудитории: 700 человек реагируют на кафе, завтраки и городские места',
    topics: ['кофейни', 'завтраки', 'прогулки', 'эстетичные места', 'локальные бренды', 'встречи с подругами'],
    fits: ['кофейни', 'рестораны', 'кондитерские', 'локальные бренды еды', 'магазины посуды', 'доставка завтраков', 'lifestyle-проекты'],
    insight: 'Автор может привести точную аудиторию, которой уже интересны кафе, эстетика и городские места.',
  },
  {
    role: 'Мастер красоты', img: 'ugc-beauty-card', followers: '850',
    core: 'Ядро аудитории: 500 человек интересуются уходом и beauty-рутиной',
    topics: ['салоны', 'уход за кожей', 'макияж', 'процедуры', 'косметика', 'личные рекомендации'],
    fits: ['салоны красоты', 'косметологи', 'бренды косметики', 'магазины уходовых средств', 'студии макияжа', 'nail-студии'],
    insight: 'Аудитория уже доверяет автору в вопросах внешности и ухода, поэтому рекомендация beauty-продукта выглядит естественно.',
  },
  {
    role: 'Молодая мама', img: 'ugc-mom-card', followers: '1 100',
    core: 'Ядро аудитории: 650 человек интересуются семьёй, детьми и домом',
    topics: ['детские товары', 'семейные выходные', 'дом', 'быт', 'питание', 'развитие ребёнка', 'покупки для семьи'],
    fits: ['детские магазины', 'семейные кафе', 'развивающие центры', 'бренды товаров для дома', 'сервисы доставки', 'wellness для семьи'],
    insight: 'Автор показывает продукт в реальной семейной жизни, поэтому рекомендация воспринимается ближе и понятнее.',
  },
]

const businessFeatures = [
  { icon: '🎯', title: 'Точный контекст', text: 'Вы находите автора, для которого ваша ниша уже является частью жизни: спорт, кофе, авто, beauty, семья, учёба или городской lifestyle.' },
  { icon: '💬', title: 'Живая аудитория', text: 'Даже небольшое количество подписчиков может быть ценным, если люди реально интересуются темой продукта.' },
  { icon: '📍', title: 'Локальность', text: 'Можно продвигать бизнес через людей из нужного города, района, университета, спортзала, кафе или сообщества.' },
  { icon: '✨', title: 'Естественная рекомендация', text: 'Автор показывает продукт в привычной жизни, поэтому контент выглядит как личный опыт.' },
]

const authorFeatures = [
  { icon: '🌱', title: 'Не нужно быть крупным блогером', text: 'Если у тебя 500, 800 или 1 500 подписчиков, ты всё равно можешь быть интересен бизнесу, если твоя аудитория собрана вокруг конкретной темы.' },
  { icon: '🔎', title: 'Бренды находят тебя по интересам', text: 'Кофе, спорт, авто, beauty, семья, учёба, путешествия, дом, еда, мероприятия — всё это может быть полезным контекстом.' },
  { icon: '📲', title: 'Можно получать предложения по своей жизни', text: 'Ты показываешь то, что уже есть в твоём обычном дне: тренировки, кафе, дорогу, уход, дом, покупки, учёбу или семейные моменты.' },
  { icon: '🤍', title: 'Ценится честный контент', text: 'Бизнесу нужны живые рекомендации, реальные сценарии и понятный человеческий опыт.' },
]

const steps = [
  { n: '01', title: 'Вы описываете задачу', text: 'Указываете город, нишу, продукт, аудиторию и жизненный контекст, в котором должен появиться бренд.' },
  { n: '02', title: 'Мы подбираем авторов', text: 'Показываем людей, у которых совпадают интересы, образ жизни и аудитория.' },
  { n: '03', title: 'Вы получаете живой контент', text: 'Автор показывает продукт в реальной ситуации, поэтому рекомендация выглядит естественно.' },
]

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string; user_metadata?: { role?: string } } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  return (
    <main style={{ background: C.bg, minHeight: '100vh', color: C.ink, overflowX: 'hidden' }}>
      {/* NAVBAR */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid ' + C.line, background: C.bg, position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', fontWeight: 800, color: C.ink }}>ugcmarket</span>
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }} className="home-hide-mobile">
          <a href="#business" style={{ fontSize: '14px', color: C.ink, textDecoration: 'none', fontWeight: 500 }}>Бизнесу</a>
          <a href="#authors" style={{ fontSize: '14px', color: C.ink, textDecoration: 'none', fontWeight: 500 }}>Авторам</a>
          <a href="#how" style={{ fontSize: '14px', color: C.ink, textDecoration: 'none', fontWeight: 500 }}>Как это работает</a>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/catalog" style={{ padding: '9px 18px', border: '1.5px solid ' + C.line, borderRadius: '100px', textDecoration: 'none', color: C.ink, fontSize: '14px', fontWeight: 500, background: C.card }} className="home-hide-mobile">Каталог</Link>
          {user ? (
            <>
              <Link href={user.user_metadata?.role === 'author' ? '/dashboard/author' : '/catalog'} style={{ padding: '8px 14px', fontSize: '14px', color: C.inkSoft, textDecoration: 'none' }} className="home-hide-mobile">{user.email}</Link>
              <button onClick={handleLogout} style={{ padding: '9px 20px', border: '1.5px solid ' + C.line, borderRadius: '100px', background: C.card, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', color: C.ink }}>Выйти</button>
            </>
          ) : (
            <>
              <Link href="/login" style={{ padding: '9px 16px', fontSize: '14px', color: C.ink, textDecoration: 'none', fontWeight: 500 }} className="home-hide-mobile">Войти</Link>
              <Link href="/register" style={{ padding: '10px 22px', background: C.forest, borderRadius: '100px', textDecoration: 'none', color: '#fff', fontSize: '14px', fontWeight: 600 }}>Регистрация</Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section style={{ ...wrap, padding: '64px 24px 110px' }}>
        <div className="home-hero-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', background: C.cardAlt, border: '1px solid ' + C.line, borderRadius: '100px', fontSize: '13px', color: C.forestSoft, marginBottom: '28px', fontWeight: 600 }}>
              <HeartDoodle color={C.forestSoft} size={16} /> Площадка микро-авторов
            </div>

            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(44px, 6.4vw, 76px)', fontWeight: 800, lineHeight: 1.08, color: C.ink, letterSpacing: '-1px', margin: 0 }}>
              Не охваты.<br />А люди с
            </h1>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '28px' }}>
              <span style={{ fontFamily: 'Caveat, cursive', fontSize: 'clamp(48px, 7.5vw, 88px)', fontWeight: 700, color: C.forest, lineHeight: 1 }}>нужным контекстом.</span>
              <MarkerUnderline color={C.sage} width={340} style={{ position: 'absolute', left: '4px', bottom: '-6px', width: '88%', height: 'auto' }} />
            </div>

            <p style={{ fontSize: '18px', color: C.ink, maxWidth: '520px', margin: '0 0 18px', lineHeight: 1.7, fontWeight: 500 }}>
              Ценность автора определяется не количеством подписчиков, а совпадением его стиля жизни, аудитории и контекста с задачами бизнеса.
            </p>
            <p style={{ fontSize: '15px', color: C.inkSoft, maxWidth: '480px', margin: '0 0 36px', lineHeight: 1.7 }}>
              Выбирайте авторов по городу, профессии, интересам и реальному повседневному контексту. Так бизнес находит людей, чья аудитория уже близка к его продукту.
            </p>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link href="/catalog" style={{ padding: '15px 32px', background: C.forest, borderRadius: '100px', textDecoration: 'none', color: '#fff', fontSize: '16px', fontWeight: 700 }}>Найти автора</Link>
              <Link href="/become-author" style={{ padding: '15px 32px', background: C.card, border: '1.5px solid ' + C.sage, borderRadius: '100px', textDecoration: 'none', color: C.forest, fontSize: '16px', fontWeight: 700 }}>Стать автором</Link>
            </div>
          </div>

          {/* COLLAGE */}
          <div className="home-collage">
            <Polaroid src={'https://picsum.photos/seed/ugc-coffee-home/640/720'} caption="про жизнь, а не про цифры" rotate={-3} style={{ top: '0%', left: '6%', width: '56%', height: '60%' }} />
            <Tape style={{ top: '-2%', left: '16%', transform: 'rotate(-8deg)' }} />

            <div style={{ position: 'absolute', top: '4%', right: '0%', width: '34%', height: '68%', borderRadius: '22px', overflow: 'hidden', background: '#000', boxShadow: '0 16px 32px rgba(31,31,28,0.18)', transform: 'rotate(3deg)', border: '6px solid #fff' }}>
              <img src={'https://picsum.photos/seed/ugc-fitness-story/420/760'} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.45) 100%)' }} />
              <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', height: '3px', background: 'rgba(255,255,255,0.35)', borderRadius: '3px' }}>
                <div style={{ width: '70%', height: '100%', background: '#fff', borderRadius: '3px' }} />
              </div>
              <div style={{ position: 'absolute', top: '20px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', fontSize: '12px', fontWeight: 600 }}>
                <span>dasha.lifestyle</span>
                <span style={{ fontSize: '16px' }}>×</span>
              </div>
              <div style={{ position: 'absolute', bottom: '38px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
                <span style={{ fontSize: '20px' }}>♡</span>
                <span style={{ fontSize: '20px' }}>➤</span>
              </div>
              <div style={{ position: 'absolute', bottom: '8px', left: '12px', right: '40px', fontFamily: 'Caveat, cursive', fontSize: '15px', fontWeight: 700, color: C.ink, background: C.sagePale, padding: '6px 10px', borderRadius: '8px', transform: 'rotate(-2deg)', lineHeight: 1.15 }}>
                тренировка — часть моего дня
              </div>
            </div>

            <Polaroid src={'https://picsum.photos/seed/ugc-study-desk/520/420'} caption="учёба, кофе, дедлайны" rotate={-4} style={{ bottom: '0%', left: '0%', width: '40%', height: '36%' }} />
            <Polaroid src={'https://picsum.photos/seed/ugc-driving/520/420'} caption="дорога = свобода" rotate={4} style={{ bottom: '4%', left: '36%', width: '38%', height: '34%' }} />

            <Sticker bg={C.butter} color={C.ink} rotate={-6} style={{ top: '36%', left: '0%' }}>живой контент работает</Sticker>
            <Sticker bg={C.sagePale} color={C.forestSoft} rotate={4} style={{ bottom: '34%', right: '4%' }}>ваш бренд в её реальности</Sticker>

            <HeartDoodle color={C.forest} size={30} style={{ position: 'absolute', top: '46%', left: '52%' }} />
            <SparkDoodle color={C.caramel} size={28} style={{ position: 'absolute', bottom: '2%', right: '32%' }} />
          </div>
        </div>
      </section>

      {/* EXAMPLES */}
      <section style={{ background: C.bgAlt, padding: '100px 0', borderTop: '1px solid ' + C.line, borderBottom: '1px solid ' + C.line }}>
        <div style={wrap}>
          <div style={{ maxWidth: '700px', marginBottom: '52px' }}>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 800, color: C.ink, marginBottom: '16px', lineHeight: 1.15 }}>
              Примеры авторов, которых ищет бизнес
            </h2>
            <p style={{ fontSize: '17px', color: C.inkSoft, lineHeight: 1.7 }}>
              Небольшая аудитория может быть ценной, если она собрана вокруг конкретного интереса, города и жизненного контекста.
            </p>
          </div>

          <div className="home-grid-3">
            {exampleProfiles.map((p, i) => (
              <div key={p.role} style={{ background: C.card, border: '1px solid ' + C.line, borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: '160px' }}>
                  <img src={'https://picsum.photos/seed/' + p.img + '/480/320'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: '10px', left: '14px', background: 'rgba(255,253,248,0.92)', borderRadius: '8px', padding: '4px 10px', fontFamily: 'Caveat, cursive', fontSize: '17px', fontWeight: 700, color: C.forest, transform: 'rotate(-2deg)' }}>
                    {p.followers} подписчиков
                  </div>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '21px', fontWeight: 700, color: C.ink }}>{p.role}</h3>
                  <p style={{ fontSize: '13px', color: C.inkSoft, lineHeight: 1.5 }}>{p.core}</p>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: C.sage, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Темы</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {p.topics.map(t => <span key={t} style={{ fontSize: '12px', padding: '4px 10px', background: C.sagePale, color: C.forestSoft, borderRadius: '100px', fontWeight: 500 }}>{t}</span>)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: C.caramel, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Подходит для</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {p.fits.map(t => <span key={t} style={{ fontSize: '12px', padding: '4px 10px', background: C.caramelPale, color: '#8a5a22', borderRadius: '100px', fontWeight: 500 }}>{t}</span>)}
                    </div>
                  </div>

                  <p style={{ fontFamily: 'Caveat, cursive', fontSize: '18px', color: C.ink, lineHeight: 1.4, marginTop: 'auto', paddingTop: '8px', borderTop: '1px dashed ' + C.line, fontWeight: 600 }}>
                    {p.insight}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUSINESS */}
      <section id="business" style={{ padding: '110px 0' }}>
        <div style={wrap}>
          <div className="home-grid-2">
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 800, color: C.ink, marginBottom: '10px' }}>Бизнесу</div>
              <div style={{ fontFamily: 'Caveat, cursive', fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, color: C.forest, marginBottom: '20px' }}>
                Находите людей, которые уже живут в контексте вашего продукта
              </div>
              <p style={{ fontSize: '16px', color: C.inkSoft, lineHeight: 1.75, marginBottom: '32px' }}>
                ugcmarket помогает бизнесу находить микро-авторов, чья аудитория, интересы и стиль жизни совпадают с задачей бренда. Такой автор может показать продукт в естественной ситуации: на тренировке, в кофейне, в машине, дома, на учёбе или в семейной жизни.
              </p>

              <div className="home-grid-4" style={{ marginBottom: '32px' }}>
                {businessFeatures.map(f => (
                  <div key={f.title} style={{ background: C.card, border: '1px solid ' + C.line, borderRadius: '18px', padding: '20px' }}>
                    <div style={{ fontSize: '26px', marginBottom: '10px' }}>{f.icon}</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink, marginBottom: '6px' }}>{f.title}</div>
                    <div style={{ fontSize: '13px', color: C.inkSoft, lineHeight: 1.6 }}>{f.text}</div>
                  </div>
                ))}
              </div>

              <Link href="/catalog" style={{ display: 'inline-block', padding: '15px 32px', background: C.forest, borderRadius: '100px', textDecoration: 'none', color: '#fff', fontSize: '16px', fontWeight: 700 }}>Найти автора</Link>
            </div>

            <div style={{ position: 'relative', height: '440px' }} className="home-hide-mobile">
              <Polaroid src={'https://picsum.photos/seed/ugc-business-1/560/640'} caption="точное совпадение" rotate={-3} style={{ top: '4%', left: '8%', width: '62%', height: '70%' }} />
              <Tape style={{ top: '0%', left: '34%', transform: 'rotate(-6deg)' }} />
              <Sticker bg={C.sagePale} color={C.forestSoft} rotate={5} style={{ top: '8%', right: '0%' }}>точное совпадение ✓</Sticker>
              <div style={{ position: 'absolute', bottom: '6%', right: '2%', display: 'flex', flexWrap: 'wrap', gap: '8px', maxWidth: '220px', justifyContent: 'flex-end' }}>
                {['спорт', 'кофе', 'город', 'beauty', 'семья'].map((t, i) => (
                  <span key={t} style={{ fontSize: '13px', padding: '6px 14px', background: i % 2 ? C.caramelPale : C.card, border: '1px solid ' + C.line, color: i % 2 ? '#8a5a22' : C.forestSoft, borderRadius: '100px', fontWeight: 600, transform: 'rotate(' + (i % 2 === 0 ? -2 : 2) + 'deg)' }}>{t}</span>
                ))}
              </div>
              <SparkDoodle color={C.caramel} size={28} style={{ position: 'absolute', bottom: '4%', left: '4%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* AUTHORS */}
      <section id="authors" style={{ background: C.bgAlt, padding: '110px 0', borderTop: '1px solid ' + C.line, borderBottom: '1px solid ' + C.line }}>
        <div style={wrap}>
          <div className="home-grid-2">
            <div style={{ position: 'relative', height: '440px' }} className="home-hide-mobile">
              <Polaroid src={'https://picsum.photos/seed/ugc-author-life/560/640'} caption="реальная жизнь = ценность" rotate={3} style={{ top: '4%', right: '8%', width: '62%', height: '70%' }} />
              <Tape style={{ top: '0%', right: '34%', transform: 'rotate(6deg)' }} />
              <Sticker bg={C.butter} color={C.ink} rotate={-5} style={{ top: '10%', left: '0%' }}>реальная жизнь = ценность</Sticker>
              <div style={{ position: 'absolute', bottom: '8%', left: '2%', background: C.card, border: '1px solid ' + C.line, borderRadius: '14px', padding: '14px 18px', boxShadow: '0 10px 24px rgba(31,31,28,0.10)', transform: 'rotate(-2deg)', maxWidth: '200px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink, marginBottom: '4px' }}>Профиль автора</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {['кофе', 'учёба', 'город'].map(t => <span key={t} style={{ fontSize: '11px', padding: '3px 8px', background: C.sagePale, color: C.forestSoft, borderRadius: '100px', fontWeight: 600 }}>{t}</span>)}
                </div>
              </div>
              <HeartDoodle color={C.forest} size={26} style={{ position: 'absolute', bottom: '2%', right: '6%' }} />
            </div>

            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 800, color: C.ink, marginBottom: '10px' }}>Автору</div>
              <div style={{ fontFamily: 'Caveat, cursive', fontSize: 'clamp(26px, 3.2vw, 36px)', fontWeight: 700, color: C.forest, marginBottom: '20px' }}>
                Твой стиль жизни может быть полезен брендам
              </div>
              <p style={{ fontSize: '16px', color: C.inkSoft, lineHeight: 1.75, marginBottom: '32px' }}>
                На платформе можно быть ценным даже с небольшой аудиторией. Брендам важны реальные интересы, город, профессия, повседневные привычки и доверие людей, которые тебя смотрят.
              </p>

              <div className="home-grid-4" style={{ marginBottom: '32px' }}>
                {authorFeatures.map(f => (
                  <div key={f.title} style={{ background: C.card, border: '1px solid ' + C.line, borderRadius: '18px', padding: '20px' }}>
                    <div style={{ fontSize: '26px', marginBottom: '10px' }}>{f.icon}</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.ink, marginBottom: '6px' }}>{f.title}</div>
                    <div style={{ fontSize: '13px', color: C.inkSoft, lineHeight: 1.6 }}>{f.text}</div>
                  </div>
                ))}
              </div>

              <Link href="/become-author" style={{ display: 'inline-block', padding: '15px 32px', background: C.card, border: '1.5px solid ' + C.sage, borderRadius: '100px', textDecoration: 'none', color: C.forest, fontSize: '16px', fontWeight: 700 }}>Стать автором</Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: '110px 0' }}>
        <div style={wrap}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 800, color: C.ink, margin: 0 }}>Как это работает</h2>
              <MarkerUnderline color={C.sage} width={260} style={{ position: 'absolute', left: '8%', bottom: '-10px', width: '84%', height: 'auto' }} />
            </div>
          </div>

          <div className="home-steps">
            {steps.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: C.card, border: '1px solid ' + C.line, borderRadius: '20px', padding: '32px 24px', flex: 1, textAlign: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: C.sagePale, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 800, color: C.forest }}>{s.n}</div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: C.ink, marginBottom: '8px' }}>{s.title}</div>
                  <div style={{ fontSize: '14px', color: C.inkSoft, lineHeight: 1.6 }}>{s.text}</div>
                </div>
                {i < steps.length - 1 && <div className="home-step-arrow"><StepArrow /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={{ padding: '0 0 110px' }}>
        <div style={wrap}>
          <div style={{ background: C.cardAlt, border: '1px solid ' + C.line, borderRadius: '28px', padding: 'clamp(32px, 5vw, 64px)', position: 'relative', overflow: 'hidden' }} className="home-cta-grid">
            <div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(28px, 3.6vw, 40px)', fontWeight: 800, color: C.ink, marginBottom: '14px', lineHeight: 1.2 }}>
                Твой стиль жизни может быть полезен брендам
              </h2>
              <p style={{ fontSize: '16px', color: C.inkSoft, lineHeight: 1.7, marginBottom: '28px', maxWidth: '440px' }}>
                Заполни анкету, укажи город, Instagram, интересы, профессию и места, где ты чаще всего бываешь. Так бизнес сможет найти тебя по настоящему совпадению.
              </p>
              <Link href="/become-author" style={{ display: 'inline-block', padding: '15px 32px', background: C.forest, borderRadius: '100px', textDecoration: 'none', color: '#fff', fontSize: '16px', fontWeight: 700 }}>Заполнить анкету</Link>
            </div>
            <div style={{ position: 'relative', height: '260px' }} className="home-hide-mobile">
              <Polaroid src={'https://picsum.photos/seed/ugc-cta-photo/520/600'} caption="твой повседневный контекст" rotate={3} style={{ top: '0%', right: '8%', width: '70%', height: '92%' }} />
              <Sticker bg={C.butter} color={C.ink} rotate={-6} style={{ top: '6%', left: '0%' }}>это про тебя ✨</Sticker>
              <ArrowDoodle color={C.forest} style={{ position: 'absolute', bottom: '4%', left: '6%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid ' + C.line, padding: '28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: C.inkSoft, flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 800, color: C.ink, fontSize: '18px' }}>ugcmarket</span>
        <span>Площадка микро-авторов</span>
      </footer>
    </main>
  )
}
