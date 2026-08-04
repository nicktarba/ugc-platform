import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

type RateEntry = { count: number; resetAt: number }

declare global {
  // eslint-disable-next-line no-var
  var __svoiComplaintRateLimits: Map<string, RateEntry> | undefined
}

const rateLimits = globalThis.__svoiComplaintRateLimits ?? new Map<string, RateEntry>()
globalThis.__svoiComplaintRateLimits = rateLimits

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  Vary: 'Authorization',
}

export type ComplaintContext = {
  user: User
  admin: SupabaseClient
  ipAddress: string | null
}

export class ComplaintApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new ComplaintApiError(503, 'COMPLAINTS_NOT_CONFIGURED', `Не задана серверная переменная ${name}.`)
  return value
}

function createAuthClient() {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  )
}

function createAdminClient() {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  )
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) throw new ComplaintApiError(401, 'UNAUTHENTICATED', 'Необходимо войти в аккаунт.')
  return match[1]
}

function getIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || null
}

function enforceOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  const expectedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')

  if (!origin) {
    if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
      throw new ComplaintApiError(403, 'ORIGIN_REJECTED', 'Запрос отправлен с недоверенного источника.')
    }
    return
  }

  if (!expectedHost) throw new ComplaintApiError(403, 'ORIGIN_REJECTED', 'Не удалось проверить источник запроса.')

  try {
    if (new URL(origin).host !== expectedHost) {
      throw new ComplaintApiError(403, 'ORIGIN_REJECTED', 'Запрос отправлен с недоверенного источника.')
    }
  } catch (error) {
    if (error instanceof ComplaintApiError) throw error
    throw new ComplaintApiError(403, 'ORIGIN_REJECTED', 'Некорректный источник запроса.')
  }
}

function enforceRateLimit(request: NextRequest, userId: string) {
  const ip = getIp(request) || 'unknown'
  const key = `${userId}:${ip}`
  const now = Date.now()
  const windowMs = 10 * 60_000
  const max = 6
  const current = rateLimits.get(key)

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (current.count >= max) {
    throw new ComplaintApiError(429, 'RATE_LIMITED', 'Слишком много обращений. Повторите позже.')
  }

  current.count += 1
}

export async function requireComplaintUser(request: NextRequest): Promise<ComplaintContext> {
  enforceOrigin(request)

  const token = bearerToken(request)
  const auth = createAuthClient()
  const { data, error } = await auth.auth.getUser(token)
  if (error || !data.user) throw new ComplaintApiError(401, 'INVALID_SESSION', 'Сессия истекла. Войдите снова.')

  enforceRateLimit(request, data.user.id)

  return {
    user: data.user,
    admin: createAdminClient(),
    ipAddress: getIp(request),
  }
}

export async function readComplaintBody(request: NextRequest) {
  const length = Number(request.headers.get('content-length') || 0)
  if (length > 8_000) throw new ComplaintApiError(413, 'PAYLOAD_TOO_LARGE', 'Слишком большой запрос.')

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new ComplaintApiError(415, 'INVALID_CONTENT_TYPE', 'Ожидался JSON-запрос.')
  }

  try {
    return await request.json() as Record<string, unknown>
  } catch {
    throw new ComplaintApiError(400, 'INVALID_JSON', 'Не удалось прочитать обращение.')
  }
}

export function cleanComplaintUuid(value: unknown, field = 'ID') {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ComplaintApiError(400, 'INVALID_ID', `${field} указан неверно.`)
  }
  return value
}

export function cleanComplaintText(value: unknown, max: number, required = false) {
  if (value === null || value === undefined) {
    if (required) throw new ComplaintApiError(400, 'REQUIRED_FIELD', 'Обязательное поле не заполнено.')
    return null
  }
  if (typeof value !== 'string') throw new ComplaintApiError(400, 'INVALID_FIELD', 'Поле должно быть текстом.')
  const text = value.trim()
  if (required && !text) throw new ComplaintApiError(400, 'REQUIRED_FIELD', 'Обязательное поле не заполнено.')
  if (text.length > max) throw new ComplaintApiError(400, 'INVALID_FIELD', `Максимальная длина: ${max} символов.`)
  return text || null
}

export function complaintJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: { ...noStoreHeaders, ...(init?.headers || {}) },
  })
}

export function complaintError(error: unknown) {
  if (error instanceof ComplaintApiError) {
    return complaintJson({ ok: false, code: error.code, error: error.message }, { status: error.status })
  }

  console.error('[complaints-api]', error)
  return complaintJson({ ok: false, code: 'INTERNAL_ERROR', error: 'Не удалось отправить жалобу. Попробуйте ещё раз.' }, { status: 500 })
}
