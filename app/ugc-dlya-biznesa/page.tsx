import type { Metadata } from 'next'
import Link from 'next/link'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'
import { buildSeoFacets, getApprovedAuthors } from '@/lib/public-authors-server'
import styles from '@/app/seo-pages.module.css'

const PATH = '/ugc-dlya-biznesa'
const data = SEO_ARTICLES['ugc-dlya-biznesa']
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'UGC для бизнеса — найти автора | СВОИ UGC',
  description: 'Как бизнесу найти UGC-автора, поставить задачу, согласовать формат, сроки и использование контента.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'UGC для бизнеса — найти автора | СВОИ UGC', description: 'Как бизнесу найти UGC-автора, поставить задачу, согласовать формат, сроки и использование контента.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
  twitter: { card: 'summary', title: 'UGC для бизнеса — найти автора | СВОИ UGC', description: 'Как бизнесу найти UGC-автора, поставить задачу, согласовать формат, сроки и использование контента.' },
}

export default async function Page() {
  const authors = await getApprovedAuthors()
  const { categories } = buildSeoFacets(authors)
  const active = categories.filter(item => item.count >= 2).slice(0, 50)

  return (
    <SeoArticle data={data} path={PATH}>
      {active.length > 0 && (
        <section>
          <h2>UGC-авторы по нишам бизнеса</h2>
          <p>Нишевые страницы появляются только там, где уже есть несколько одобренных профилей с соответствующей тематикой.</p>
          <div className={styles.facetLinks}>{active.map(category => <Link key={category.slug} href={`/ugc-dlya-biznesa/${category.slug}`}>{category.label} · {category.count}</Link>)}</div>
        </section>
      )}
    </SeoArticle>
  )
}
