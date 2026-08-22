import type { Metadata } from 'next'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'

const PATH = '/ugc-v-reklame'
const data = SEO_ARTICLES['ugc-v-reklame']

export const metadata: Metadata = {
  title: 'UGC в рекламе: креативы и авторы | СВОИ UGC',
  description: 'Как использовать UGC-контент в рекламе: форматы креативов, выбор автора и условия использования материалов.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'UGC в рекламе: креативы и авторы | СВОИ UGC', description: 'Как использовать UGC-контент в рекламе: форматы креативов, выбор автора и условия использования материалов.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
  twitter: { card: 'summary', title: 'UGC в рекламе: креативы и авторы | СВОИ UGC', description: 'Как использовать UGC-контент в рекламе: форматы креативов, выбор автора и условия использования материалов.' },
}

export default function Page() {
  return <SeoArticle data={data} path={PATH} />
}
