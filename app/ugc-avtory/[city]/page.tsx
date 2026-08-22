import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import Footer from '@/components/Footer'
import AuthorSeoCards from '@/components/seo/AuthorSeoCards'
import JsonLd from '@/components/seo/JsonLd'
import { absoluteUrl, SITE_NAME, SITE_URL } from '@/lib/seo'
import { getAuthorsByCity, resolveCitySlug, buildSeoFacets } from '@/lib/public-authors-server'
import styles from '@/app/seo-pages.module.css'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ city: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params
  const city = await resolveCitySlug(slug)
  if (!city) return { title: 'UGC-авторы — СВОИ UGC', robots: { index: false, follow: false } }
  const indexable = city.count >= 2
  const title = `UGC-авторы — ${city.label} | СВОИ UGC`
  const description = `UGC-авторы: город ${city.label}. Публичные профили креаторов, тематики и данные для выбора автора на СВОИ UGC.`
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/ugc-avtory/${city.slug}`) },
    robots: { index: indexable, follow: true },
    openGraph: { title, description, url: absoluteUrl(`/ugc-avtory/${city.slug}`), type: 'website', locale: 'ru_RU', siteName: SITE_NAME },
  }
}

export default async function CityAuthorsPage({ params }: Props) {
  const { city: slug } = await params
  const city = await resolveCitySlug(slug)
  if (!city) notFound()
  const authors = await getAuthorsByCity(city.label)
  const { categories } = buildSeoFacets(authors)

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `UGC-авторы — ${city.label}`,
    url: absoluteUrl(`/ugc-avtory/${city.slug}`),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    about: { '@type': 'Thing', name: 'UGC-креаторы' },
    mainEntity: { '@type': 'ItemList', numberOfItems: authors.length, itemListElement: authors.map((author, i) => ({ '@type': 'ListItem', position: i + 1, name: author.name, url: absoluteUrl(`/author/${author.id}`) })) },
  }

  return (
    <main className={styles.page}>
      <JsonLd data={ld} />
      <AppHeader />
      <div className={styles.collectionPage}>
        <section className={styles.facetIntro}>
          <nav className={styles.breadcrumbs}><Link href="/ugc-avtory">UGC-авторы</Link><span>→</span><span>{city.label}</span></nav>
          <span className={styles.eyebrow}>UGC в вашем городе</span>
          <h1>UGC-авторы — {city.label}</h1>
          <p>Здесь собраны одобренные профили авторов, которые указали город «{city.label}». Локальный поиск особенно полезен, когда креатору нужно приехать в ресторан, салон, отель, студию, автосервис, на объект или другую офлайн-площадку.</p>
          <p className={styles.dataNote}>Сейчас в подборке: {authors.length} {authors.length === 1 ? 'профиль' : 'профилей'}.</p>
        </section>
        <AuthorSeoCards authors={authors} heading={`UGC-креаторы — ${city.label}`} />
        {categories.filter(item => item.count >= 2).length > 0 && <section className={styles.infoCard}><h2>Тематики авторов — {city.label}</h2><div className={styles.facetLinks}>{categories.filter(item => item.count >= 2).slice(0, 30).map(category => <Link key={category.slug} href={`/ugc-avtory/${city.slug}/${category.slug}`}>{category.label} · {category.count}</Link>)}</div></section>}
        <section className={styles.infoCard}><h2>Как выбрать локального UGC-автора</h2><p>Уточните место съёмки, формат, сроки и требования к контенту. Затем сравните тематики и профили кандидатов и отправьте предложение через СВОИ UGC.</p></section>
      </div>
      <Footer />
    </main>
  )
}
