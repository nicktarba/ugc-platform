import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import AuthorProfileClient from './AuthorProfileClient'
import JsonLd from '@/components/seo/JsonLd'
import { getPublicAuthor } from '@/lib/public-authors-server'
import { absoluteUrl, authorDescription, authorTitle, SITE_NAME, SITE_URL } from '@/lib/seo'
import { isSeoExcludedAuthor } from '@/lib/seo-author-exclusions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

function normalizeAuthor(author: NonNullable<Awaited<ReturnType<typeof getPublicAuthor>>>) {
  return {
    id: author.id,
    name: author.name || 'UGC-автор',
    city: author.city || '',
    instagram_url: author.instagram_url || '',
    telegram_url: author.telegram_url || null,
    followers_count: author.followers_count || 0,
    telegram_followers: author.telegram_followers || 0,
    stories_views: author.stories_views || 0,
    occupation: author.occupation || '',
    lifestyle: author.lifestyle || [],
    hobbies: author.hobbies || '',
    bio: author.bio || '',
    open_to_barter: Boolean(author.open_to_barter),
    avatar_url: author.avatar_url || null,
    completed_deals_count: author.completed_deals_count || 0,
    avg_rating: author.avg_rating || null,
    reviews_count: author.reviews_count || 0,
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const author = await getPublicAuthor(id)
  if (!author) return { title: 'Автор не найден — СВОИ UGC', robots: { index: false, follow: false } }

  const title = authorTitle(author.name, author.city)
  const description = authorDescription(author)
  const url = absoluteUrl(`/author/${author.id}`)
  const seoExcluded = isSeoExcludedAuthor(author.id)

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: seoExcluded
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 } },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'ru_RU',
      type: 'profile',
      images: author.avatar_url ? [{ url: author.avatar_url, alt: `UGC-автор ${author.name}` }] : undefined,
    },
    twitter: { card: author.avatar_url ? 'summary_large_image' : 'summary', title, description, images: author.avatar_url ? [author.avatar_url] : undefined },
  }
}

export default async function AuthorPage({ params }: Props) {
  const { id } = await params
  const author = await getPublicAuthor(id)
  if (!author) notFound()

  const normalized = normalizeAuthor(author)
  const url = absoluteUrl(`/author/${author.id}`)
  const seoExcluded = isSeoExcludedAuthor(author.id)
  const profileLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: authorTitle(author.name, author.city),
    url,
    inLanguage: 'ru-RU',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'Person',
      name: author.name,
      jobTitle: 'UGC-автор',
      description: authorDescription(author),
      image: author.avatar_url || undefined,
      homeLocation: author.city ? { '@type': 'Place', name: author.city } : undefined,
      knowsAbout: author.lifestyle?.length ? author.lifestyle : undefined,
    },
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'UGC-авторы', item: absoluteUrl('/ugc-avtory') },
      { '@type': 'ListItem', position: 3, name: author.name, item: url },
    ],
  }

  return <>{!seoExcluded && <JsonLd data={[profileLd, breadcrumbLd]} />}<AuthorProfileClient initialAuthor={normalized} /></>
}
