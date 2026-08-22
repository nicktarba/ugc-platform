import type { Metadata } from 'next'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'

const PATH = '/ugc-kreator'
const data = SEO_ARTICLES['ugc-kreator']

export const metadata: Metadata = {
  title: 'UGC-креатор: кто это и чем занимается | СВОИ UGC',
  description: 'Кто такой UGC-креатор, чем он отличается от блогера и как автору получать предложения от бизнеса.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'UGC-креатор: кто это и чем занимается | СВОИ UGC', description: 'Кто такой UGC-креатор, чем он отличается от блогера и как автору получать предложения от бизнеса.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
  twitter: { card: 'summary', title: 'UGC-креатор: кто это и чем занимается | СВОИ UGC', description: 'Кто такой UGC-креатор, чем он отличается от блогера и как автору получать предложения от бизнеса.' },
}

export default function Page() {
  return <SeoArticle data={data} path={PATH} />
}
