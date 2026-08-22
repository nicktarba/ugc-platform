import type { Metadata } from 'next'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'

const PATH = '/ugc'
const data = SEO_ARTICLES['ugc']

export const metadata: Metadata = {
  title: 'UGC: что это и как работает | СВОИ UGC',
  description: 'UGC: что это такое, какие форматы использует бизнес и как найти UGC-автора для рекламы, соцсетей и контента.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'UGC: что это и как работает | СВОИ UGC', description: 'UGC: что это такое, какие форматы использует бизнес и как найти UGC-автора для рекламы, соцсетей и контента.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
  twitter: { card: 'summary', title: 'UGC: что это и как работает | СВОИ UGC', description: 'UGC: что это такое, какие форматы использует бизнес и как найти UGC-автора для рекламы, соцсетей и контента.' },
}

export default function Page() {
  return <SeoArticle data={data} path={PATH} />
}
