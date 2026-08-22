import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import Footer from '@/components/Footer'
import AuthorSeoCards from '@/components/seo/AuthorSeoCards'
import JsonLd from '@/components/seo/JsonLd'
import { absoluteUrl, SITE_NAME } from '@/lib/seo'
import { getAuthorsByCategory, resolveCategorySlug, buildSeoFacets } from '@/lib/public-authors-server'
import styles from '@/app/seo-pages.module.css'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ category: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params
  const category = await resolveCategorySlug(slug)
  if (!category) return { title: 'UGC для бизнеса — СВОИ UGC', robots: { index: false, follow: false } }
  const indexable = category.count >= 2
  const path = `/ugc-dlya-biznesa/${category.slug}`
  const title = `UGC для «${category.label}» — авторы и креаторы | СВОИ UGC`
  const description = `Найдите UGC-авторов по тематике «${category.label}». Одобренные профили, города и предложения о сотрудничестве на СВОИ UGC.`
  return { title, description, alternates: { canonical: absoluteUrl(path) }, robots: { index: indexable, follow: true }, openGraph: { title, description, url: absoluteUrl(path), type: 'website', locale: 'ru_RU', siteName: SITE_NAME } }
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params
  const category = await resolveCategorySlug(slug)
  if (!category) notFound()
  const authors = await getAuthorsByCategory(category.label)
  const { cities } = buildSeoFacets(authors)
  const path = `/ugc-dlya-biznesa/${category.slug}`

  return (
    <main className={styles.page}>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: `UGC для ${category.label}`, url: absoluteUrl(path), mainEntity: { '@type': 'ItemList', numberOfItems: authors.length, itemListElement: authors.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.name, url: absoluteUrl(`/author/${a.id}`) })) } }} />
      <AppHeader />
      <div className={styles.collectionPage}>
        <section className={styles.facetIntro}>
          <nav className={styles.breadcrumbs}><Link href="/ugc-dlya-biznesa">UGC для бизнеса</Link><span>→</span><span>{category.label}</span></nav>
          <span className={styles.eyebrow}>UGC по тематике</span>
          <h1>UGC для {category.label}</h1>
          <p>В этой подборке — одобренные UGC-авторы, которые указали тематику «{category.label}». Бизнес может сравнить профили, выбрать подходящего креатора и отправить предложение через СВОИ UGC.</p>
          <p className={styles.dataNote}>Опубликовано подходящих профилей: {authors.length}.</p>
        </section>
        <AuthorSeoCards authors={authors} heading={`UGC-авторы: ${category.label}`} />
        {cities.filter(item => item.count >= 2).length > 0 && <section className={styles.infoCard}><h2>Города</h2><div className={styles.facetLinks}>{cities.filter(item => item.count >= 2).slice(0, 30).map(city => <Link key={city.slug} href={`/ugc-avtory/${city.slug}/${category.slug}`}>{city.label} · {city.count}</Link>)}</div></section>}
        <section className={styles.infoCard}><h2>Как поставить задачу автору</h2><p>Укажите нужный формат, что именно должен показать автор, срок, место съёмки, условия сотрудничества и где вы планируете использовать готовый контент. Для рекламного использования отдельно согласуйте необходимые права.</p></section>
      </div>
      <Footer />
    </main>
  )
}
