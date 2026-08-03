'use client'

import Link from 'next/link'
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

type LandingAuthor = {
  id: string
  name: string
  city: string
  occupation: string | null
  lifestyle: string[] | null
  followers_count: number | null
  stories_views: number | null
  open_to_barter: boolean | null
  avatar_url: string | null
  avg_rating: number | null
  reviews_count: number | null
}

type IconName =
  | 'search'
  | 'users'
  | 'chat'
  | 'shield'
  | 'pin'
  | 'spark'
  | 'heart'
  | 'arrow'
  | 'menu'
  | 'close'
  | 'check'
  | 'briefcase'
  | 'layers'
  | 'rocket'
  | 'building'

const CATEGORIES = [
  'Бьюти',
  'Еда и напитки',
  'Авто',
  'Путешествия',
  'Семья и дети',
  'Фитнес',
  'Технологии',
]

const FALLBACK_COVERS = [
  'linear-gradient(145deg, rgba(18,18,20,.06), rgba(18,18,20,.58)), url("/hero-author.png")',
  'linear-gradient(145deg, #5d5147 0%, #252529 100%)',
  'linear-gradient(145deg, #9b7b67 0%, #40342f 100%)',
  'linear-gradient(145deg, #53727a 0%, #273b44 100%)',
  'linear-gradient(145deg, #b68f77 0%, #5f4039 100%)',
]

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    chat: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /><path d="M8 10h8M8 14h5" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z" /><circle cx="12" cy="10" r="2.5" /></>,
    spark: <><path d="m12 3-1.6 4.4L6 9l4.4 1.6L12 15l1.6-4.4L18 9l-4.4-1.6z" /><path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8z" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8z" />,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    layers: <><path d="m12 2 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
    rocket: <><path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2" /><path d="M9 15 4 10l5.5-1.5L15 3c2.4-2.4 6-2 6-2s.4 3.6-2 6l-5.5 5.5z" /><circle cx="16" cy="6" r="1.5" /><path d="m9 15 1 5 5-5" /></>,
    building: <><path d="M3 21h18M5 21V5l7-3v19M19 21V9l-7-2M8 9h1M8 13h1M8 17h1M15 12h1M15 16h1" /></>,
  }

  return <svg {...common}>{paths[name]}</svg>
}

function formatFollowers(value: number | null) {
  const count = value ?? 0
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)} млн`
  if (count >= 1_000) return `${Math.round(count / 100) / 10} тыс.`
  return count.toLocaleString('ru-RU')
}

function safeBackground(author: LandingAuthor, index: number) {
  if (author.avatar_url && /^https?:\/\//i.test(author.avatar_url)) {
    const escaped = author.avatar_url.replace(/["\\]/g, '')
    return `linear-gradient(180deg, rgba(10,10,12,0) 42%, rgba(10,10,12,.82) 100%), url("${escaped}")`
  }
  return FALLBACK_COVERS[index % FALLBACK_COVERS.length]
}

export default function HomePage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [authors, setAuthors] = useState<LandingAuthor[]>([])
  const [authorsLoading, setAuthorsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setRole(data.user?.user_metadata?.role ?? null)
      setAuthReady(true)
    })

    supabase
      .from('authors')
      .select('id, name, city, occupation, lifestyle, followers_count, stories_views, open_to_barter, avatar_url, avg_rating, reviews_count')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!mounted) return
        setAuthors((data as LandingAuthor[] | null) ?? [])
        setAuthorsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const dashboardHref = useMemo(() => {
    if (role === 'author') return '/dashboard/author'
    if (role === 'admin') return '/dashboard/admin'
    return '/dashboard/business'
  }, [role])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim()
    router.push(value ? `/catalog?mode=regular&q=${encodeURIComponent(value)}` : '/catalog')
  }

  function searchCategory(category: string) {
    router.push(`/catalog?mode=regular&q=${encodeURIComponent(category)}`)
  }

  const previewAuthors = authors.slice(0, 4)

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.logo} href="/" aria-label="СВОИ UGC — главная">
            СВОИ <span>UGC</span>
          </Link>

          <nav className={styles.desktopNav} aria-label="Основная навигация">
            <Link href="/catalog">Каталог</Link>
            <a href="#business">Для бизнеса</a>
            <a href="#how">Как это работает</a>
            <a href="#authors">Для авторов</a>
            <Link href="/support">Поддержка</Link>
          </nav>

          <div className={styles.headerActions}>
            {authReady && role ? (
              <Link className={styles.primaryCompact} href={dashboardHref}>Кабинет</Link>
            ) : (
              <>
                <Link className={styles.loginLink} href="/login">Войти</Link>
                <Link className={styles.primaryCompact} href="/register">Регистрация</Link>
              </>
            )}
            <button className={styles.menuButton} type="button" onClick={() => setMenuOpen(true)} aria-label="Открыть меню">
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)}>
          <aside className={styles.mobileMenu} onClick={(event) => event.stopPropagation()} aria-label="Мобильное меню">
            <div className={styles.mobileMenuHead}>
              <span className={styles.logo}>СВОИ <span>UGC</span></span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню">
                <Icon name="close" />
              </button>
            </div>
            <Link href="/catalog" onClick={() => setMenuOpen(false)}>Каталог</Link>
            <a href="#business" onClick={() => setMenuOpen(false)}>Для бизнеса</a>
            <a href="#how" onClick={() => setMenuOpen(false)}>Как это работает</a>
            <a href="#authors" onClick={() => setMenuOpen(false)}>Для авторов</a>
            <Link href="/support" onClick={() => setMenuOpen(false)}>Поддержка</Link>
            <div className={styles.mobileMenuDivider} />
            {role ? (
              <Link className={styles.mobileMenuCta} href={dashboardHref} onClick={() => setMenuOpen(false)}>Открыть кабинет</Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)}>Войти</Link>
                <Link className={styles.mobileMenuCta} href="/register" onClick={() => setMenuOpen(false)}>Зарегистрироваться</Link>
              </>
            )}
          </aside>
        </div>
      )}

      <section className={styles.heroSection}>
        <div className={styles.heroPanel}>
          <div className={styles.heroGlow} />
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>Маркетплейс локальных UGC-авторов</div>
            <h1>Найдите авторов <span>для вашего бизнеса</span></h1>
            <p className={styles.heroLead}>
              Ищите по городу, тематике и аудитории. Отправляйте предложение, обсуждайте детали и ведите сделку в одном месте.
            </p>

            <form className={styles.searchBar} onSubmit={submitSearch}>
              <div className={styles.searchMode}>
                <Icon name="users" size={18} />
                <span>Авторы</span>
              </div>
              <label className={styles.searchInputWrap}>
                <Icon name="search" size={19} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Например: кофейня во Владивостоке, мама-блогер, авто"
                  aria-label="Поиск авторов"
                />
              </label>
              <button type="submit"><Icon name="search" size={18} />Найти</button>
            </form>

            <div className={styles.categoryRow} aria-label="Популярные категории">
              {CATEGORIES.map((category) => (
                <button key={category} type="button" onClick={() => searchCategory(category)}>{category}</button>
              ))}
            </div>
          </div>

          <div className={styles.heroAuthors}>
            {authorsLoading && Array.from({ length: 5 }).map((_, index) => (
              <div className={styles.creatorSkeleton} key={index} />
            ))}

            {!authorsLoading && authors.length === 0 && (
              <div className={styles.emptyHeroAuthors}>
                <Icon name="spark" size={28} />
                <strong>Каталог готов к первым авторам</strong>
                <span>Создайте профиль и станьте одним из первых участников платформы.</span>
                <Link href="/register">Стать автором</Link>
              </div>
            )}

            {authors.map((author, index) => (
              <Link
                href={`/author/${author.id}`}
                className={styles.creatorCard}
                key={author.id}
                style={{ backgroundImage: safeBackground(author, index) }}
              >
                <div className={styles.creatorTopline}>
                  <span>{formatFollowers(author.followers_count)}</span>
                  <span className={styles.creatorHeart}><Icon name="heart" size={16} /></span>
                </div>
                <div className={styles.creatorMeta}>
                  <strong>{author.name}</strong>
                  <span>{author.occupation || author.lifestyle?.[0] || 'UGC-автор'} · {author.city}</span>
                  <div>
                    {author.open_to_barter && <em>Бартер</em>}
                    {author.avg_rating ? <b>★ {Number(author.avg_rating).toFixed(1)}</b> : <b>Новый профиль</b>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.trustStrip} aria-label="Возможности платформы">
        {[
          { icon: 'users' as IconName, title: 'Прямой контакт', text: 'Общайтесь с авторами без агентства' },
          { icon: 'chat' as IconName, title: 'Чат и сделка', text: 'Все договорённости в одном месте' },
          { icon: 'shield' as IconName, title: 'Модерация профилей', text: 'В каталог попадают одобренные анкеты' },
          { icon: 'pin' as IconName, title: 'Локальный подбор', text: 'Ищите авторов по городу и тематике' },
        ].map((item) => (
          <div className={styles.trustItem} key={item.title}>
            <span><Icon name={item.icon} /></span>
            <div><strong>{item.title}</strong><small>{item.text}</small></div>
          </div>
        ))}
      </section>

      <section className={styles.section} id="business">
        <div className={styles.workflowCard}>
          <div className={styles.workflowCopy}>
            <div className={styles.kicker}>Для бизнеса</div>
            <h2>Подберите автора <span>до начала сделки</span></h2>
            <p>
              Сравнивайте авторов по городу, тематике, размеру аудитории и отзывам. Открывайте профиль, изучайте опыт и отправляйте предложение только тем, кто действительно подходит под задачу.
            </p>
            <ul>
              <li><Icon name="check" size={17} />Обычный поиск и ИИ-подбор</li>
              <li><Icon name="check" size={17} />Фильтры по городу, аудитории и интересам</li>
              <li><Icon name="check" size={17} />Похожие авторы и избранное</li>
            </ul>
            <Link className={styles.textLink} href="/catalog">Открыть каталог <Icon name="arrow" size={17} /></Link>
          </div>

          <div className={styles.catalogPreview}>
            <div className={styles.previewToolbar}>
              <span><Icon name="search" size={15} />Красота · Владивосток</span>
              <button type="button">Фильтры</button>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewFilters}>
                <b>Город</b><span>Владивосток</span>
                <b>Подписчики</b><div className={styles.previewRange}><i /><i /></div>
                <b>Тематика</b><span>Красота и уход</span>
              </div>
              <div className={styles.previewGrid}>
                {(previewAuthors.length ? previewAuthors : Array.from({ length: 4 }, (_, index) => ({ id: `empty-${index}` } as LandingAuthor))).map((author, index) => (
                  <div className={styles.previewAuthor} key={author.id}>
                    <div className={styles.previewPhoto} style={{ backgroundImage: safeBackground(author, index) }} />
                    <strong>{author.name || 'Профиль автора'}</strong>
                    <span>{author.city || 'Ваш город'}</span>
                    <small>{formatFollowers(author.followers_count)} подписчиков</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.capabilityGrid}>
          {[
            { icon: 'pin' as IconName, title: 'Автор рядом с вашим бизнесом', text: 'Находите людей из нужного города или региона.' },
            { icon: 'search' as IconName, title: 'Точный поиск под задачу', text: 'Ниша, аудитория, формат контента и интересы.' },
            { icon: 'shield' as IconName, title: 'Понятные условия сделки', text: 'Бюджет, дедлайн и задача сохраняются в предложении.' },
            { icon: 'briefcase' as IconName, title: 'Для малого бизнеса и команд', text: 'Один процесс для разовых интеграций и постоянной работы.' },
          ].map((item, index) => (
            <article className={`${styles.capabilityCard} ${styles[`capability${index + 1}`]}`} key={item.title}>
              <span><Icon name={item.icon} size={24} /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.salesCard}>
          <div className={styles.salesCopy}>
            <div className={styles.kicker}>Рабочий процесс</div>
            <h2>Запускайте UGC-кампании <span>быстрее и без хаоса</span></h2>
            <p>
              Не собирайте поиск, договорённости и переписку по таблицам и разным мессенджерам. В СВОИ UGC путь от подбора автора до отзыва собран в одном процессе.
            </p>
            <div className={styles.salesPoints}>
              <span><Icon name="search" />Найдите автора под конкретную задачу</span>
              <span><Icon name="chat" />Согласуйте бюджет, сроки и формат в чате</span>
              <span><Icon name="layers" />Следите за статусом активных сделок</span>
              <span><Icon name="shield" />Закройте сотрудничество и оставьте отзыв</span>
            </div>
            <Link className={styles.primaryButton} href="/register?role=business">Начать поиск авторов <Icon name="arrow" size={18} /></Link>
          </div>

          <div className={styles.processVisual} aria-label="Схема процесса">
            <div className={styles.processCenter}>СВОИ<br />UGC</div>
            {[
              { icon: 'search' as IconName, label: 'Поиск', className: styles.processOne },
              { icon: 'briefcase' as IconName, label: 'Предложение', className: styles.processTwo },
              { icon: 'chat' as IconName, label: 'Чат', className: styles.processThree },
              { icon: 'check' as IconName, label: 'Сделка', className: styles.processFour },
            ].map((item) => (
              <div className={`${styles.processNode} ${item.className}`} key={item.label}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.howSection} id="how">
        <div className={styles.sectionHeading}>
          <div className={styles.kicker}>Как это работает</div>
          <h2>От поиска до завершённой сделки</h2>
          <p>Четыре понятных шага без лишних промежуточных страниц.</p>
        </div>
        <div className={styles.stepsGrid}>
          {[
            { n: '01', icon: 'search' as IconName, title: 'Найдите автора', text: 'Используйте обычный поиск, ИИ-подбор и фильтры.' },
            { n: '02', icon: 'briefcase' as IconName, title: 'Отправьте предложение', text: 'Укажите задачу, бюджет и желаемый срок.' },
            { n: '03', icon: 'chat' as IconName, title: 'Обсудите детали', text: 'Переписывайтесь и согласовывайте условия в чате.' },
            { n: '04', icon: 'check' as IconName, title: 'Закройте сделку', text: 'Завершите сотрудничество и оставьте отзыв.' },
          ].map((step) => (
            <article className={styles.stepCard} key={step.n}>
              <div className={styles.stepNumber}>{step.n}</div>
              <span className={styles.stepIcon}><Icon name={step.icon} /></span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.audienceHeading}>
          <h2>Один сервис — разные задачи бизнеса</h2>
          <p>Начните с одного автора или используйте платформу для регулярных UGC-кампаний.</p>
        </div>
        <div className={styles.audienceGrid}>
          {[
            { icon: 'building' as IconName, title: 'Локальному бизнесу', text: 'Найдите автора рядом с заведением, салоном, магазином или студией.', action: 'Найти автора', href: '/catalog' },
            { icon: 'briefcase' as IconName, title: 'Маркетологам', text: 'Собирайте подборки, сохраняйте авторов и ведите несколько сделок.', action: 'Открыть каталог', href: '/catalog' },
            { icon: 'layers' as IconName, title: 'Агентствам', text: 'Используйте бизнес-профиль для проектов разных клиентов и направлений.', action: 'Создать аккаунт', href: '/register?role=business' },
            { icon: 'rocket' as IconName, title: 'Основателям', text: 'Быстро найдите людей, которые покажут продукт живой аудитории.', action: 'Начать поиск', href: '/catalog' },
          ].map((item, index) => (
            <article className={`${styles.audienceCard} ${styles[`audience${index + 1}`]}`} key={item.title}>
              <span><Icon name={item.icon} /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <Link href={item.href}>{item.action}<Icon name="arrow" size={16} /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.authorCtaSection} id="authors">
        <div className={styles.authorCta}>
          <div>
            <div className={styles.kickerDark}>Для авторов</div>
            <h2>Создавайте контент и получайте предложения от бизнеса</h2>
            <p>Заполните профиль, расскажите о своей аудитории и интересах. После модерации бизнес сможет найти вас в каталоге.</p>
          </div>
          <Link href="/register?role=author">Стать автором бесплатно <Icon name="arrow" size={18} /></Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div>
            <Link className={styles.logo} href="/">СВОИ <span>UGC</span></Link>
            <p>Маркетплейс локальных UGC-авторов и бизнеса.</p>
          </div>
          <div className={styles.footerLinks}>
            <div><strong>Платформа</strong><Link href="/catalog">Каталог</Link><a href="#how">Как это работает</a></div>
            <div><strong>Участникам</strong><a href="#business">Для бизнеса</a><a href="#authors">Для авторов</a></div>
            <div><strong>Помощь</strong><Link href="/support">Поддержка</Link><Link href="/login">Войти</Link></div>
          </div>
        </div>
        <div className={styles.footerBottom}>© {new Date().getFullYear()} СВОИ UGC</div>
      </footer>
    </main>
  )
}
