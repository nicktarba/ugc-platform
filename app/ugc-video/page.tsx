import type { Metadata } from 'next'
import SeoArticle from '@/components/seo/SeoArticle'
import { SEO_ARTICLES } from '@/lib/seo-content'
import { absoluteUrl } from '@/lib/seo'

const PATH = '/ugc-video'
const data = SEO_ARTICLES['ugc-video']

export const metadata: Metadata = {
  title: 'UGC-видео для бизнеса | Форматы и авторы — СВОИ UGC',
  description: 'Форматы UGC-видео, сценарии, требования к заданию и подбор автора для рекламных и контентных задач бизнеса.',
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: { title: 'UGC-видео для бизнеса | Форматы и авторы — СВОИ UGC', description: 'Форматы UGC-видео, сценарии, требования к заданию и подбор автора для рекламных и контентных задач бизнеса.', url: absoluteUrl(PATH), type: 'article', locale: 'ru_RU', siteName: 'СВОИ UGC' },
  twitter: { card: 'summary', title: 'UGC-видео для бизнеса | Форматы и авторы — СВОИ UGC', description: 'Форматы UGC-видео, сценарии, требования к заданию и подбор автора для рекламных и контентных задач бизнеса.' },
}

export default function Page() {
  return <SeoArticle data={data} path={PATH} />
}
