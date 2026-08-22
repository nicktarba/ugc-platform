import exclusions from '@/config/seo-excluded-authors.json'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const excludedIds = new Set(
  (exclusions.excludedAuthorIds || [])
    .filter((id): id is string => typeof id === 'string' && UUID_RE.test(id))
    .map(id => id.toLowerCase()),
)

export function isSeoExcludedAuthor(id: string) {
  return excludedIds.has(id.toLowerCase())
}

export function filterSeoAuthors<T extends { id: string }>(authors: T[]) {
  return authors.filter(author => !isSeoExcludedAuthor(author.id))
}

export function getSeoExcludedAuthorIds() {
  return [...excludedIds]
}
