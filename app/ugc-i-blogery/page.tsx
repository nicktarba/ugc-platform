import type { Metadata } from 'next'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'

const PATH = '/ugc-i-blogery'
const data = SEO_ARTICLES['ugc-i-blogery']

export const metadata: Metadata = {
  title: 'UGC-автор и блогер: в чём разница | СВОИ UGC',
  description: 'Чем создание UGC-контента отличается от рекламного размещения у блогера и когда бизнесу нужен каждый формат.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'UGC-автор и блогер: в чём разница | СВОИ UGC', description: 'Чем создание UGC-контента отличается от рекламного размещения у блогера и когда бизнесу нужен каждый формат.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
  twitter: { card: 'summary', title: 'UGC-автор и блогер: в чём разница | СВОИ UGC', description: 'Чем создание UGC-контента отличается от рекламного размещения у блогера и когда бизнесу нужен каждый формат.' },
}

export default function Page() {
  return <SeoArticle data={data} path={PATH} />
}
