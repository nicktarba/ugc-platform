import type { Metadata } from 'next'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'

const PATH = '/kak-stat-ugc-avtorom'
const data = SEO_ARTICLES['kak-stat-ugc-avtorom']

export const metadata: Metadata = {
  title: 'Как стать UGC-автором | СВОИ UGC',
  description: 'Как начать работать UGC-автором: профиль, тематики, портфолио, условия сотрудничества и предложения от бизнеса.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'Как стать UGC-автором | СВОИ UGC', description: 'Как начать работать UGC-автором: профиль, тематики, портфолио, условия сотрудничества и предложения от бизнеса.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
  twitter: { card: 'summary', title: 'Как стать UGC-автором | СВОИ UGC', description: 'Как начать работать UGC-автором: профиль, тематики, портфолио, условия сотрудничества и предложения от бизнеса.' },
}

export default function Page() {
  return <SeoArticle data={data} path={PATH} />
}
