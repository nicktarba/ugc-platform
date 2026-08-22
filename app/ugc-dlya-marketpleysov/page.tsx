import type { Metadata } from 'next'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'

const PATH = '/ugc-dlya-marketpleysov'
const data = SEO_ARTICLES['ugc-dlya-marketpleysov']

export const metadata: Metadata = {
  title: 'UGC для маркетплейсов | СВОИ UGC',
  description: 'UGC-контент для карточек товаров и рекламы: распаковки, демонстрации, фото и видео от авторов.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'UGC для маркетплейсов | СВОИ UGC', description: 'UGC-контент для карточек товаров и рекламы: распаковки, демонстрации, фото и видео от авторов.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
  twitter: { card: 'summary', title: 'UGC для маркетплейсов | СВОИ UGC', description: 'UGC-контент для карточек товаров и рекламы: распаковки, демонстрации, фото и видео от авторов.' },
}

export default function Page() {
  return <SeoArticle data={data} path={PATH} />
}
