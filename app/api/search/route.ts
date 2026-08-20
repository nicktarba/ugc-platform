import { createHash } from 'node:crypto'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const cache = new Map<string, { result: SearchResponse; ts: number }>()
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const CACHE_TTL = 30 * 60 * 1000
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 30
const QUERY_MAX = 300
const MAX_AUTHORS = 300

type SearchAuthor = {
  id: string
  name: string
  city: string
  occupation: string | null
  bio: string | null
  lifestyle: string[] | null
  open_to_barter: boolean | null
}

type SearchResult = {
  id: string
  score: number
  match_type?: string
  reason: string
}

type SearchResponse = { results: SearchResult[] }

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing server env: ${name}`)
  return value
}

function authClient() {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  )
}

function adminClient() {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  )
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || null
}

function getIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown'
}

function enforceOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) return

  const expectedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (!expectedHost) throw new Error('ORIGIN_REJECTED')

  try {
    if (new URL(origin).host !== expectedHost) throw new Error('ORIGIN_REJECTED')
  } catch {
    throw new Error('ORIGIN_REJECTED')
  }
}

function enforceRateLimit(user: User, request: NextRequest) {
  const now = Date.now()
  const key = `${user.id}:${getIp(request)}`
  const current = rateLimits.get(key)

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return
  }

  if (current.count >= RATE_MAX) throw new Error('RATE_LIMITED')
  current.count += 1

  if (rateLimits.size > 2000) {
    for (const [entryKey, entry] of rateLimits.entries()) {
      if (entry.resetAt <= now) rateLimits.delete(entryKey)
    }
  }
}

async function requireBusiness(request: NextRequest, admin: SupabaseClient) {
  enforceOrigin(request)

  const token = bearerToken(request)
  if (!token) throw new Error('UNAUTHENTICATED')

  const auth = authClient()
  const { data, error } = await auth.auth.getUser(token)
  if (error || !data.user) throw new Error('UNAUTHENTICATED')

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (profile?.role !== 'business') throw new Error('BUSINESS_ONLY')

  enforceRateLimit(data.user, request)
  return data.user
}

function cleanQuery(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, QUERY_MAX)
}

function catalogFingerprint(authors: SearchAuthor[]) {
  const compact = authors.map(author => [
    author.id,
    author.city,
    author.occupation || '',
    (author.bio || '').slice(0, 500),
    (author.lifestyle || []).slice(0, 15),
    Boolean(author.open_to_barter),
  ])
  return createHash('sha256').update(JSON.stringify(compact)).digest('hex').slice(0, 20)
}

function sanitizeResults(raw: unknown, allowedIds: Set<string>): SearchResult[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: SearchResult[] = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const source = item as Record<string, unknown>
    const id = typeof source.id === 'string' ? source.id : ''
    if (!allowedIds.has(id) || seen.has(id)) continue

    const scoreNumber = Number(source.score)
    if (!Number.isFinite(scoreNumber)) continue
    const score = Math.max(0, Math.min(100, Math.round(scoreNumber)))
    if (score < 40) continue

    const reason = typeof source.reason === 'string'
      ? source.reason.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220)
      : ''
    if (!reason) continue

    const matchType = typeof source.match_type === 'string'
      ? source.match_type.replace(/[^a-z_]/gi, '').slice(0, 30)
      : undefined

    seen.add(id)
    out.push({ id, score, match_type: matchType, reason })
    if (out.length >= 10) break
  }

  return out.sort((a, b) => b.score - a.score)
}

function jsonError(status: number, code: string, error: string) {
  return NextResponse.json(
    { results: [], code, error },
    { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
  )
}

export async function POST(req: NextRequest) {
  try {
    const length = Number(req.headers.get('content-length') || 0)
    if (length > 8_000) return jsonError(413, 'PAYLOAD_TOO_LARGE', 'Слишком большой запрос.')

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return jsonError(415, 'INVALID_CONTENT_TYPE', 'Ожидался JSON-запрос.')
    }

    const admin = adminClient()
    const user = await requireBusiness(req, admin)
    const body = await req.json() as Record<string, unknown>
    const query = cleanQuery(body.query)

    if (query.length < 2) return NextResponse.json({ results: [] } satisfies SearchResponse)

    const { data: authorsData, error: authorsError } = await admin
      .from('authors')
      .select('id, name, city, occupation, bio, lifestyle, open_to_barter')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(MAX_AUTHORS)

    if (authorsError) throw authorsError
    const authors = (authorsData || []) as SearchAuthor[]
    if (authors.length === 0) return NextResponse.json({ results: [] } satisfies SearchResponse)

    const cacheKey = `${query.toLowerCase()}::${catalogFingerprint(authors)}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.result)
    }

    const authorsStr = authors.map(author => {
      const occupation = (author.occupation || '').slice(0, 160)
      const bio = (author.bio || '').slice(0, 600)
      const tags = (author.lifestyle || []).slice(0, 15).join(', ')
      return `[${author.id}] ${author.city}, ${occupation}. ${bio}. Теги: ${tags}. Бартер: ${author.open_to_barter ? 'да' : 'нет'}`
    }).join('\n')

    const systemPrompt = `Ты ранжируешь UGC-креаторов под запрос бизнеса.

Ищи не только прямое совпадение ниши, но и авторов с понятным мостом между продуктом и их жизнью, аудиторией или контентом.

Мост считается сильным, только если выполняется хотя бы одно:
1. автор — вероятный пользователь продукта (по своим данным в каталоге, не по домыслу)
2. продукт напрямую связан с конкретным фактом об авторе: дети, семья, дом, работа, хобби — а не с абстрактным "образом жизни"
3. аудитория автора по нише и тематике контента совпадает с покупателями продукта
4. для локальной услуги совпадает город

Типы совпадения:
- direct — ниша автора напрямую совпадает с продуктом
- scenario — продукт закономерно нужен в жизни автора, исходя из конкретных фактов о нём
- audience — аудитория автора по демографии совпадает с покупателями продукта
- content — формат контента автора подходит для демонстрации продукта
- geo — важен город для локальной услуги

Не притягивай за уши и не выдумывай факты об авторе. Используй только данные каталога.
Подписчики не влияют на score. Город обязателен только для локальных услуг или если бизнес указал город. Бартер учитывай только если указан в запросе.

Score:
- 85-100 — сильный direct/content/scenario с явным фактом-мостом
- 65-84 — нормальный direct/content/scenario или очень точный audience
- 40-64 — слабое, но объяснимое соответствие
- ниже 40 — не включать

Массив обязательно отсортирован по score от большего к меньшему.
reason объясняет связь с запросом, 8-12 слов, без имени автора.
Верни только чистый JSON-массив, без markdown, максимум 10:
[{"id":"uuid","score":85,"match_type":"scenario","reason":"мост в 8-12 слов"}]`

    const yandexApiKey = requiredEnv('YANDEX_API_KEY')
    const yandexFolderId = requiredEnv('YANDEX_FOLDER_ID')

    const resp = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${yandexApiKey}`,
        'x-folder-id': yandexFolderId,
      },
      body: JSON.stringify({
        modelUri: `gpt://${yandexFolderId}/yandexgpt/latest`,
        completionOptions: { stream: false, temperature: 0.3, maxTokens: '1200' },
        messages: [
          { role: 'system', text: systemPrompt },
          { role: 'user', text: `Запрос: "${query}"\n\nКреаторы:\n${authorsStr}` },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!resp.ok) {
      console.error('[ai-search] Yandex error', resp.status, await resp.text().catch(() => ''))
      return jsonError(502, 'AI_UNAVAILABLE', 'ИИ-поиск сейчас недоступен. Попробуйте обычный поиск.')
    }

    const data = await resp.json()
    const text = data.result?.alternatives?.[0]?.message?.text || '[]'
    const clean = String(text).replace(/```json|```/g, '').trim()

    let parsed: unknown = []
    try { parsed = JSON.parse(clean) } catch { parsed = [] }

    const results = sanitizeResults(parsed, new Set(authors.map(author => author.id)))
    const response: SearchResponse = { results }
    cache.set(cacheKey, { result: response, ts: Date.now() })

    void admin.from('search_logs').insert([{
      query: query.toLowerCase(),
      mode: 'ai',
      results_count: results.length,
      user_id: user.id,
    }]).then(({ error }) => {
      if (error) console.error('[ai-search] log failed', error.message)
    })

    if (cache.size > 500) {
      const now = Date.now()
      for (const [key, value] of cache.entries()) {
        if (now - value.ts > CACHE_TTL) cache.delete(key)
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'UNAUTHENTICATED') return jsonError(401, 'UNAUTHENTICATED', 'Войдите в аккаунт бизнеса для ИИ-поиска.')
    if (message === 'BUSINESS_ONLY') return jsonError(403, 'BUSINESS_ONLY', 'ИИ-поиск доступен бизнес-аккаунтам.')
    if (message === 'RATE_LIMITED') return jsonError(429, 'RATE_LIMITED', 'Слишком много ИИ-поисков подряд. Подождите несколько минут.')
    if (message === 'ORIGIN_REJECTED') return jsonError(403, 'ORIGIN_REJECTED', 'Запрос отклонён.')

    console.error('[ai-search]', error)
    return jsonError(500, 'INTERNAL_ERROR', 'ИИ-поиск сейчас недоступен. Попробуйте обычный поиск.')
  }
}
