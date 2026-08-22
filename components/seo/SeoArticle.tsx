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
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки"><Link href="/">СВОИ UGC</Link><span>→</span><span>{data.eyebrow}</span></nav>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>{data.eyebrow}</span>
          <h1>{data.title}</h1>
          <p className={styles.lead}>{data.lead}</p>
          <div className={styles.directAnswer}><strong>Коротко:</strong> {data.answer}</div>
          <div className={styles.heroActions}>
            <Link href="/ugc-avtory" className={styles.primaryAction}>Найти UGC-автора</Link>
            <Link href="/register" className={styles.secondaryAction}>Стать автором</Link>
          </div>
        </header>

        <div className={styles.content}>
          {data.sections.map(section => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              {!!section.bullets?.length && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
            </section>
          ))}
          {children}
        </div>

        {!!data.related?.length && (
          <aside className={styles.related}>
            <h2>По теме</h2>
            <div>{data.related.map(item => <Link key={item.href} href={item.href}>{item.label}<span>→</span></Link>)}</div>
          </aside>
        )}
      </article>
      <Footer />
    </main>
  )
}
