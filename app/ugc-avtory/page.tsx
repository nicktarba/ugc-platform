import type { Metadata } from 'next'
import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import Footer from '@/components/Footer'
import AuthorSeoCards from '@/components/seo/AuthorSeoCards'
import JsonLd from '@/components/seo/JsonLd'
import { absoluteUrl, SITE_NAME, SITE_URL } from '@/lib/seo'
import { buildSeoFacets, getApprovedAuthors } from '@/lib/public-authors-server'
import styles from '@/app/seo-pages.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'UGC-авторы и креаторы — найти автора | СВОИ UGC',
  description: 'Каталог UGC-авторов: поиск по городу и тематике. Публичные профили, предложения, чат и сделки на платформе СВОИ UGC.',
  alternates: { canonical: absoluteUrl('/ugc-avtory') },
  openGraph: { title: 'UGC-авторы и креаторы — СВОИ UGC', description: 'Найдите UGC-автора по городу и тематике.', url: absoluteUrl('/ugc-avtory'), type: 'website', locale: 'ru_RU', siteName: SITE_NAME },
}

export default async function UgcAuthorsPage() {
  const authors = await getApprovedAuthors()
  const { cities, categories } = buildSeoFacets(authors)
  const indexableCities = cities.filter(item => item.count >= 2).slice(0, 40)
  const indexableCategories = categories.filter(item => item.count >= 2).slice(0, 50)

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'UGC-авторы и креаторы — СВОИ UGC',
    description: 'Публичный каталог одобренных UGC-авторов на платформе СВОИ UGC.',
    url: absoluteUrl('/ugc-avtory'),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: authors.length,
      itemListElement: authors.slice(0, 30).map((author, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(`/author/${author.id}`),
        name: author.name,
      })),
    },
  }

  return (
    <main className={styles.page}>
      <JsonLd data={collectionLd} />
      <AppHeader />
      <div className={styles.collectionPage}>
        <section className={styles.facetIntro}>
          <span className={styles.eyebrow}>Каталог UGC-креаторов</span>
          <h1>UGC-авторы для бизнеса</h1>
          <p>СВОИ UGC помогает находить авторов для пользовательского контента по городу и тематике. В публичных подборках показываются только одобренные профили. Для отправки предложения бизнес переходит в профиль автора и начинает сотрудничество через платформу.</p>
          <div className={styles.heroActions}><Link className={styles.primaryAction} href="/catalog">Открыть поиск по каталогу</Link><Link className={styles.secondaryAction} href="/kak-nayti-ugc-avtora">Как выбрать автора</Link></div>
          <div className={styles.collectionStats}>
            <div><strong>{authors.length}</strong><span>одобренных профилей в публичной базе</span></div>
            <div><strong>{indexableCities.length}</strong><span>городов с отдельными подборками</span></div>
            <div><strong>{indexableCategories.length}</strong><span>активных тематик авторов</span></div>
          </div>
          <p className={styles.dataNote}>Подборки строятся только по реально опубликованным профилям.</p>
        </section>

        <AuthorSeoCards authors={authors} heading="Новые одобренные UGC-авторы" />

        {indexableCities.length > 0 && <section className={styles.infoCard}><h2>UGC-авторы по городам</h2><p>Города с несколькими опубликованными профилями:</p><div className={styles.facetLinks}>{indexableCities.map(city => <Link href={`/ugc-avtory/${city.slug}`} key={city.slug}>{city.label} · {city.count}</Link>)}</div></section>}

        {indexableCategories.length > 0 && <section className={styles.infoCard}><h2>UGC-авторы по тематикам</h2><p>Перейдите в нишевую подборку, чтобы увидеть авторов, которые указали эту тематику в публичном профиле.</p><div className={styles.facetLinks}>{indexableCategories.map(category => <Link href={`/ugc-dlya-biznesa/${category.slug}`} key={category.slug}>{category.label} · {category.count}</Link>)}</div></section>}

        <div className={styles.collectionGrid}>
          <section className={styles.infoCard}><h2>Как искать UGC-автора</h2><ul><li>определите задачу и формат контента;</li><li>выберите город, если нужна офлайн-съёмка;</li><li>сравните тематику и данные профиля;</li><li>отправьте предложение и согласуйте сроки и условия.</li></ul></section>
          <section className={styles.infoCard}><h2>Что такое СВОИ UGC</h2><p>Платформа объединяет каталог авторов, предложения от бизнеса, чат, статусы сделок, отзывы и модерацию. <Link href="/o-servise">Подробнее о сервисе →</Link></p></section>
        </div>
      </div>
      <Footer />
    </main>
  )
}
