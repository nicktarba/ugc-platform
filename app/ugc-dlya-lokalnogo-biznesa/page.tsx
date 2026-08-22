import type { Metadata } from 'next'
import Link from 'next/link'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'
import { buildSeoFacets, getApprovedAuthors } from '@/lib/public-authors-server'
import styles from '@/app/seo-pages.module.css'

const PATH = '/ugc-dlya-lokalnogo-biznesa'
const data = SEO_ARTICLES['ugc-dlya-lokalnogo-biznesa']
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'UGC для локального бизнеса | СВОИ UGC',
  description: 'Как ресторанам, салонам, фитнесу, авто, отелям и другим локальным бизнесам находить UGC-авторов в своём городе.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'UGC для локального бизнеса | СВОИ UGC', description: 'Поиск локальных UGC-авторов по городу и тематике.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
}

export default async function Page() {
  const authors = await getApprovedAuthors()
  const { cities } = buildSeoFacets(authors)
  const active = cities.filter(item => item.count >= 2).slice(0, 40)
  return (
    <SeoArticle data={data} path={PATH}>
      {active.length > 0 && <section><h2>UGC-авторы по городам</h2><p>Открытые городские подборки основаны на реально опубликованных профилях.</p><div className={styles.facetLinks}>{active.map(city => <Link key={city.slug} href={`/ugc-avtory/${city.slug}`}>{city.label} · {city.count}</Link>)}</div></section>}
    </SeoArticle>
  )
}
