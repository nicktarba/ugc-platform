import { createClient } from '@supabase/supabase-js'
import { cache } from 'react'
import { seoSlug } from '@/lib/seo'
import { filterSeoAuthors } from '@/lib/seo-author-exclusions'

export type PublicAuthorSeo = {
  id: string
  name: string
  city: string
  instagram_url: string | null
  telegram_url: string | null
  followers_count: number | null
  telegram_followers: number | null
  stories_views: number | null
  occupation: string | null
  lifestyle: string[] | null
  hobbies: string | null
  bio: string | null
  open_to_barter: boolean | null
  avatar_url: string | null
  completed_deals_count: number | null
  avg_rating: number | null
  reviews_count: number | null
}

const PUBLIC_SELECT = 'id,name,city,instagram_url,telegram_url,followers_count,telegram_followers,stories_views,occupation,lifestyle,hobbies,bio,open_to_barter,avatar_url,completed_deals_count,avg_rating,reviews_count'

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Public Supabase environment is not configured')
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

const getPublicAuthorCached = cache(async (id: string): Promise<PublicAuthorSeo | null> => {
  const { data, error } = await getClient()
    .from('authors')
    .select(PUBLIC_SELECT)
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle()

  if (error) return null
  return (data as PublicAuthorSeo | null) ?? null
})

export async function getPublicAuthor(id: string) {
  return getPublicAuthorCached(id)
}

const getApprovedAuthorsCached = cache(async (): Promise<PublicAuthorSeo[]> => {
  const { data, error } = await getClient()
    .from('authors')
    .select(PUBLIC_SELECT)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error || !data) return []
  return filterSeoAuthors(data as PublicAuthorSeo[])
})

export async function getApprovedAuthors(limit = 1000): Promise<PublicAuthorSeo[]> {
  const authors = await getApprovedAuthorsCached()
  return authors.slice(0, limit)
}

export async function getAuthorsByCity(city: string, limit = 100): Promise<PublicAuthorSeo[]> {
  const authors = await getApprovedAuthorsCached()
  return authors.filter(author => author.city === city).slice(0, limit)
}

export async function getAuthorsByCategory(category: string, limit = 100): Promise<PublicAuthorSeo[]> {
  const authors = await getApprovedAuthorsCached()
  return authors.filter(author => (author.lifestyle || []).includes(category)).slice(0, limit)
}

export async function getAuthorsByCityCategory(city: string, category: string, limit = 100): Promise<PublicAuthorSeo[]> {
  const authors = await getApprovedAuthorsCached()
  return authors
    .filter(author => author.city === city && (author.lifestyle || []).includes(category))
    .slice(0, limit)
}

export type SeoFacet = { label: string; slug: string; count: number }
export type SeoCombination = { city: string; citySlug: string; category: string; categorySlug: string; count: number }

export function buildSeoFacets(authors: PublicAuthorSeo[]) {
  const cityCounts = new Map<string, number>()
  const categoryCounts = new Map<string, number>()
  const comboCounts = new Map<string, { city: string; category: string; count: number }>()

  for (const author of authors) {
    const city = (author.city || '').trim()
    if (city) cityCounts.set(city, (cityCounts.get(city) || 0) + 1)

    const tags = Array.from(new Set((author.lifestyle || []).map(tag => tag.trim()).filter(Boolean)))
    for (const category of tags) {
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
      if (city) {
        const key = `${city}\u0000${category}`
        const existing = comboCounts.get(key)
        comboCounts.set(key, { city, category, count: (existing?.count || 0) + 1 })
      }
    }
  }

  const cities: SeoFacet[] = [...cityCounts.entries()]
    .map(([label, count]) => ({ label, slug: seoSlug(label), count }))
    .filter(item => item.slug)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'))

  const categories: SeoFacet[] = [...categoryCounts.entries()]
    .map(([label, count]) => ({ label, slug: seoSlug(label), count }))
    .filter(item => item.slug)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'))

  const combinations: SeoCombination[] = [...comboCounts.values()]
    .map(item => ({ ...item, citySlug: seoSlug(item.city), categorySlug: seoSlug(item.category) }))
    .filter(item => item.citySlug && item.categorySlug)
    .sort((a, b) => b.count - a.count)

  return { cities, categories, combinations }
}

export async function resolveCitySlug(slug: string) {
  const { cities } = buildSeoFacets(await getApprovedAuthors())
  return cities.find(item => item.slug === slug) || null
}

export async function resolveCategorySlug(slug: string) {
  const { categories } = buildSeoFacets(await getApprovedAuthors())
  return categories.find(item => item.slug === slug) || null
}
