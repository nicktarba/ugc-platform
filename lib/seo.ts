export const SITE_URL = 'https://svoi-ugc.ru'
export const SITE_NAME = 'СВОИ UGC'
export const SITE_DESCRIPTION = 'Платформа для поиска UGC-авторов и сотрудничества бизнеса с создателями UGC-контента: каталог, предложения, чат и сделки в одном месте.'
export const SEO_RELEASE_DATE = '2026-08-21'

export const CORE_SEO_ROUTES = [
  '/',
  '/ugc',
  '/ugc-avtory',
  '/ugc-dlya-biznesa',
  '/ugc-kreator',
  '/kak-nayti-ugc-avtora',
  '/kak-stat-ugc-avtorom',
  '/ugc-video',
  '/ugc-dlya-marketpleysov',
  '/ugc-v-reklame',
  '/ugc-i-blogery',
  '/ugc-dlya-lokalnogo-biznesa',
  '/o-servise',
  '/support',
] as const

const RU_TO_LAT: Record<string, string> = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'y', к:'k', л:'l', м:'m',
  н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'c', ч:'ch', ш:'sh', щ:'sch', ъ:'',
  ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
}

export function seoSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split('')
    .map(char => RU_TO_LAT[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString()
}

export function compactText(value: string | null | undefined, max = 155) {
  const normalized = (value || '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1).trimEnd()}…`
}

export function authorTitle(name: string, city?: string | null) {
  return city
    ? `${name} — UGC-автор · ${city} | СВОИ UGC`
    : `${name} — UGC-автор | СВОИ UGC`
}

export function authorDescription(input: { name: string; city?: string | null; occupation?: string | null; lifestyle?: string[] | null; bio?: string | null }) {
  const topics = (input.lifestyle || []).slice(0, 3).join(', ')
  const parts = [
    `${input.name} — UGC-автор${input.city ? `, ${input.city}` : ''}.`,
    input.occupation ? `Профиль: ${input.occupation}.` : '',
    topics ? `Тематики: ${topics}.` : '',
    input.bio ? compactText(input.bio, 80) : '',
    'Посмотреть профиль и предложить сотрудничество на СВОИ UGC.',
  ].filter(Boolean)
  return compactText(parts.join(' '), 158)
}
