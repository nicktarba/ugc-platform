import type { Metadata } from 'next'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'

const PATH = '/o-servise'
const data = SEO_ARTICLES['o-servise']

export const metadata: Metadata = {
  title: 'О платформе СВОИ UGC',
  description: 'СВОИ UGC — платформа для поиска UGC-авторов: публичный каталог, предложения, чат, сделки, отзывы и модерация.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'О платформе СВОИ UGC', description: 'СВОИ UGC — платформа для поиска UGC-авторов: публичный каталог, предложения, чат, сделки, отзывы и модерация.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
  twitter: { card: 'summary', title: 'О платформе СВОИ UGC', description: 'СВОИ UGC — платформа для поиска UGC-авторов: публичный каталог, предложения, чат, сделки, отзывы и модерация.' },
}

export default function Page() {
  return <SeoArticle data={data} path={PATH} />
}
