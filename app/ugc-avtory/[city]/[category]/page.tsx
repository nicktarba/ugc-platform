import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import Footer from '@/components/Footer'
import AuthorSeoCards from '@/components/seo/AuthorSeoCards'
import JsonLd from '@/components/seo/JsonLd'
import { absoluteUrl, SITE_NAME } from '@/lib/seo'
import { getAuthorsByCityCategory, resolveCategorySlug, resolveCitySlug } from '@/lib/public-authors-server'
import styles from '@/app/seo-pages.module.css'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ city: string; category: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params
  const [city, category] = await Promise.all([resolveCitySlug(citySlug), resolveCategorySlug(categorySlug)])
  if (!city || !category) return { title: 'UGC-авторы — СВОИ UGC', robots: { index: false, follow: false } }
  const authors = await getAuthorsByCityCategory(city.label, category.label)
  const indexable = authors.length >= 3
  const path = `/ugc-avtory/${city.slug}/${category.slug}`
  const title = `${category.label}: UGC-авторы — ${city.label} | СВОИ UGC`
  const description = `UGC-авторы по тематике «${category.label}», город ${city.label}. Реальные одобренные профили на платформе СВОИ UGC.`
  return { title, description, alternates: { canonical: absoluteUrl(path) }, robots: { index: indexable, follow: true }, openGraph: { title, description, url: absoluteUrl(path), type: 'website', locale: 'ru_RU', siteName: SITE_NAME } }
}

export default async function CityCategoryPage({ params }: Props) {
  const { city: citySlug, category: categorySlug } = await params
  const [city, category] = await Promise.all([resolveCitySlug(citySlug), resolveCategorySlug(categorySlug)])
  if (!city || !category) notFound()
  const authors = await getAuthorsByCityCategory(city.label, category.label)
  if (!authors.length) notFound()
  const path = `/ugc-avtory/${city.slug}/${category.slug}`

  return (
    <main className={styles.page}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: `${category.label}: UGC-авторы — ${city.label}`, url: absoluteUrl(path), mainEntity: { '@type': 'ItemList', numberOfItems: authors.length, itemListElement: authors.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.name, url: absoluteUrl(`/author/${a.id}`) })) } }} />
      <AppHeader />
      <div className={styles.collectionPage}>
        <section className={styles.facetIntro}>
          <nav className={styles.breadcrumbs}><Link href="/ugc-avtory">UGC-авторы</Link><span>→</span><Link href={`/ugc-avtory/${city.slug}`}>{city.label}</Link><span>→</span><span>{category.label}</span></nav>
          <span className={styles.eyebrow}>Город × тематика</span>
          <h1>{category.label}: UGC-авторы — {city.label}</h1>
          <p>Подборка строится по реальным одобренным профилям: автор указал город {city.label} и тематику «{category.label}». Страница допускается к индексации только когда в ней достаточно опубликованных профилей.</p>
          <p className={styles.dataNote}>Найдено профилей: {authors.length}.</p>
        </section>
        <AuthorSeoCards authors={authors} heading={`${category.label} — авторы, ${city.label}`} />
      </div>
      <Footer />
    </main>
  )
}
