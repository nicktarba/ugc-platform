import type { MetadataRoute } from 'next'
import { absoluteUrl, CORE_SEO_ROUTES, SEO_RELEASE_DATE } from '@/lib/seo'
import { buildSeoFacets, getApprovedAuthors } from '@/lib/public-authors-server'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const authors = await getApprovedAuthors()
  const { cities, categories, combinations } = buildSeoFacets(authors)
  const releaseDate = new Date(`${SEO_RELEASE_DATE}T00:00:00+10:00`)

  const core: MetadataRoute.Sitemap = CORE_SEO_ROUTES.map((path, index) => ({
    url: absoluteUrl(path),
    lastModified: releaseDate,
    changeFrequency: path === '/' || path === '/ugc-avtory' ? 'daily' : 'monthly',
    priority: path === '/' ? 1 : index <= 3 ? 0.9 : 0.7,
  }))

  const profileUrls: MetadataRoute.Sitemap = authors.map(author => ({
    url: absoluteUrl(`/author/${author.id}`),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const cityUrls: MetadataRoute.Sitemap = cities
    .filter(city => city.count >= 2)
    .map(city => ({ url: absoluteUrl(`/ugc-avtory/${city.slug}`), changeFrequency: 'weekly', priority: 0.75 }))

  const categoryUrls: MetadataRoute.Sitemap = categories
    .filter(category => category.count >= 2)
    .map(category => ({ url: absoluteUrl(`/ugc-dlya-biznesa/${category.slug}`), changeFrequency: 'weekly', priority: 0.75 }))

  const comboUrls: MetadataRoute.Sitemap = combinations
    .filter(combo => combo.count >= 3)
    .map(combo => ({ url: absoluteUrl(`/ugc-avtory/${combo.citySlug}/${combo.categorySlug}`), changeFrequency: 'weekly', priority: 0.65 }))

  return [...core, ...profileUrls, ...cityUrls, ...categoryUrls, ...comboUrls]
}
