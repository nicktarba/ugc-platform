import type { Metadata } from 'next'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'

const PATH = '/kak-nayti-ugc-avtora'
const data = SEO_ARTICLES['kak-nayti-ugc-avtora']

export const metadata: Metadata = {
  title: 'Как найти UGC-автора для бизнеса | СВОИ UGC',
  description: 'Пошагово: как выбрать UGC-автора по городу, тематике и задаче, что проверить в профиле и что согласовать до работы.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'Как найти UGC-автора для бизнеса | СВОИ UGC', description: 'Пошагово: как выбрать UGC-автора по городу, тематике и задаче, что проверить в профиле и что согласовать до работы.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
  twitter: { card: 'summary', title: 'Как найти UGC-автора для бизнеса | СВОИ UGC', description: 'Пошагово: как выбрать UGC-автора по городу, тематике и задаче, что проверить в профиле и что согласовать до работы.' },
}

export default function Page() {
  return <SeoArticle data={data} path={PATH} />
}
