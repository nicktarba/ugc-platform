import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import Footer from '@/components/Footer'
import JsonLd from '@/components/seo/JsonLd'
import { SITE_NAME, SITE_URL } from '@/lib/seo'
import styles from '@/app/seo-pages.module.css'

export type SeoArticleSection = {
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export type SeoArticleData = {
  eyebrow: string
  title: string
  lead: string
  answer: string
  sections: SeoArticleSection[]
  related?: { href: string; label: string }[]
}

const PLATFORM_FACTS = [
  { number: '01', title: 'Найдите автора', text: 'По городу, тематике и данным публичного профиля.' },
  { number: '02', title: 'Отправьте предложение', text: 'Обсудите задачу и условия напрямую с креатором.' },
  { number: '03', title: 'Ведите сделку', text: 'Чат, статусы и отзывы остаются внутри платформы.' },
]

export default function SeoArticle({ data, path, children }: { data: SeoArticleData; path: string; children?: React.ReactNode }) {
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.lead,
    inLanguage: 'ru-RU',
    mainEntityOfPage: `${SITE_URL}${path}`,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: data.title, item: `${SITE_URL}${path}` },
    ],
  }

  return (
    <main className={styles.page}>
      <JsonLd data={[articleJsonLd, breadcrumbJsonLd]} />
      <AppHeader />

      <article className={styles.article}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/">СВОИ UGC</Link><span>→</span><span>{data.eyebrow}</span>
        </nav>

        <header className={styles.articleHero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{data.eyebrow}</span>
            <h1>{data.title}</h1>
            <p className={styles.lead}>{data.lead}</p>

            <div className={styles.heroActions}>
              <Link href="/ugc-avtory" className={styles.primaryAction}>Найти UGC-автора</Link>
              <Link href="/register" className={styles.secondaryAction}>Стать автором</Link>
            </div>
          </div>

          <aside className={styles.heroAside} aria-label="Как работает СВОИ UGC">
            <div className={styles.heroAsideTop}>
              <span>СВОИ UGC</span>
              <b>Платформа для UGC</b>
            </div>
            <div className={styles.heroAsideList}>
              {PLATFORM_FACTS.map(item => (
                <div className={styles.heroAsideItem} key={item.number}>
                  <span>{item.number}</span>
                  <div><strong>{item.title}</strong><small>{item.text}</small></div>
                </div>
              ))}
            </div>
          </aside>
        </header>

        <section className={styles.answerStrip}>
          <span>Короткий ответ</span>
          <p>{data.answer}</p>
        </section>

        <div className={styles.contentGrid}>
          {data.sections.map((section, index) => (
            <section className={`${styles.sectionCard} ${index === 0 ? styles.sectionFeatured : ''}`} key={section.title}>
              <div className={styles.sectionNumber}>{String(index + 1).padStart(2, '0')}</div>
              <div className={styles.sectionBody}>
                <h2>{section.title}</h2>
                {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                {!!section.bullets?.length && (
                  <ul className={styles.cleanList}>
                    {section.bullets.map(item => <li key={item}><span>✓</span><p>{item}</p></li>)}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>

        {children && <div className={styles.extraContent}>{children}</div>}

        {!!data.related?.length && (
          <aside className={styles.related}>
            <div className={styles.relatedHeading}>
              <span className={styles.eyebrow}>Продолжить</span>
              <h2>Полезно по теме</h2>
            </div>
            <div className={styles.relatedGrid}>
              {data.related.map((item, index) => (
                <Link key={item.href} href={item.href}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{item.label}</strong>
                  <b>→</b>
                </Link>
              ))}
            </div>
          </aside>
        )}

        <section className={styles.finalCta}>
          <div>
            <span className={styles.eyebrow}>СВОИ UGC</span>
            <h2>Перейдите от теории к подходящему автору</h2>
            <p>Откройте каталог, сравните одобренные профили и отправьте предложение автору под вашу задачу.</p>
          </div>
          <div className={styles.finalCtaActions}>
            <Link href="/ugc-avtory" className={styles.primaryAction}>Смотреть авторов</Link>
            <Link href="/ugc-dlya-biznesa" className={styles.secondaryAction}>Для бизнеса</Link>
          </div>
        </section>
      </article>

      <Footer />
    </main>
  )
}
