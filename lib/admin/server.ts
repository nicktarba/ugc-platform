import { createHmac, randomUUID } from 'crypto'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export type AdminContext = {
  user: User
  admin: SupabaseClient
  accessToken: string
  aal: 'aal1' | 'aal2'
  mfaRequired: boolean
  ipAddress: string | null
  userAgent: string | null
  requestId: string
}

type RateEntry = { count: number; resetAt: number }
type TokenClaims = { aal: 'aal1' | 'aal2'; iat: number | null; exp: number | null }

declare global {
  // eslint-disable-next-line no-var
  var __svoiAdminPreAuthRateLimits: Map<string, RateEntry> | undefined
}

const preAuthRateLimits = globalThis.__svoiAdminPreAuthRateLimits ?? new Map<string, RateEntry>()
globalThis.__svoiAdminPreAuthRateLimits = preAuthRateLimits

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
  Expires: '0',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  Vary: 'Authorization, Origin',
}

export class AdminApiError extends Error {
  status: number
  code: string
  retryAfter?: number

  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message)
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new AdminApiError(503, 'ADMIN_NOT_CONFIGURED', `Не задана серверная переменная ${name}.`)
  return value
}

function booleanEnv(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase()
  if (!value) return fallback
  return value === 'true' || value === '1' || value === 'yes'
}

function createAuthClient() {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  )
}

function createAdminClient() {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  )
}

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+([^\s]+)$/i)
  if (!match?.[1] || match[1].length > 8192) {
    throw new AdminApiError(401, 'UNAUTHENTICATED', 'Необходимо войти в аккаунт администратора.')
  }
  return match[1]
}

function decodeClaims(token: string): TokenClaims {
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return { aal: 'aal1', iat: null, exp: null }
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as {
      aal?: string
      iat?: number
      exp?: number
    }
    return {
      aal: payload.aal === 'aal2' ? 'aal2' : 'aal1',
      iat: Number.isFinite(payload.iat) ? Number(payload.iat) : null,
      exp: Number.isFinite(payload.exp) ? Number(payload.exp) : null,
    }
  } catch {
    return { aal: 'aal1', iat: null, exp: null }
  }
}

function adminAllowlist() {
  const ids = requiredEnv('ADMIN_USER_IDS')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)

  if (!ids.length || ids.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))) {
    throw new AdminApiError(503, 'ADMIN_ALLOWLIST_INVALID', 'Список администраторов настроен неверно.')
  }

  return new Set(ids)
}

export function isAdminUserId(userId: string) {
  return adminAllowlist().has(userId.toLowerCase())
}

function getIp(request: NextRequest) {
  if (!booleanEnv('ADMIN_TRUST_PROXY', false)) return null

  const candidate = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || null

  if (!candidate || candidate.length > 64 || !/^[0-9a-f:.]+$/i.test(candidate)) return null
  return candidate
}

function subjectHash(value: string) {
  return createHmac('sha256', requiredEnv('ADMIN_RATE_LIMIT_SECRET'))
    .update(value)
    .digest('hex')
}

function enforcePreAuthRateLimit(request: NextRequest) {
  const now = Date.now()
  const windowMs = 60_000
  const max = 90
  const ip = getIp(request) || 'unknown'
  const key = subjectHash(`preauth:${ip}`)
  const current = preAuthRateLimits.get(key)

  if (preAuthRateLimits.size > 5000) {
    for (const [entryKey, entry] of preAuthRateLimits) {
      if (entry.resetAt <= now) preAuthRateLimits.delete(entryKey)
    }
  }

  if (!current || current.resetAt <= now) {
    preAuthRateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (current.count >= max) {
    throw new AdminApiError(429, 'RATE_LIMITED', 'Слишком много запросов. Повторите через минуту.', Math.ceil((current.resetAt - now) / 1000))
  }

  current.count += 1
}

function allowedOrigins(request: NextRequest) {
  const configured = (process.env.ADMIN_ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  if (configured.length) return new Set(configured.map(value => new URL(value).origin))
  if (process.env.NODE_ENV !== 'production') return new Set([request.nextUrl.origin])
  throw new AdminApiError(503, 'ADMIN_ORIGIN_NOT_CONFIGURED', 'Не настроен доверенный адрес админ-панели.')
}

function enforceRequestOrigin(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return

  const origin = request.headers.get('origin')
  if (!origin) throw new AdminApiError(403, 'ORIGIN_REQUIRED', 'Не удалось подтвердить источник запроса.')

  let normalized: string
  try {
    normalized = new URL(origin).origin
  } catch {
    throw new AdminApiError(403, 'ORIGIN_REJECTED', 'Некорректный источник запроса.')
  }

  if (!allowedOrigins(request).has(normalized)) {
    throw new AdminApiError(403, 'ORIGIN_REJECTED', 'Запрос отправлен с недоверенного источника.')
  }
}

async function recordSecurityEvent(
  admin: SupabaseClient,
  eventType: string,
  subject: string,
  userId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await admin.rpc('record_admin_security_event', {
    p_event_type: eventType,
    p_subject_hash: subjectHash(subject),
    p_admin_id: userId,
    p_metadata: metadata,
  })

  if (error) console.error('[admin-security-event]', error.message)
}

async function enforcePersistentRateLimit(
  admin: SupabaseClient,
  request: NextRequest,
  userId: string,
) {
  const isWrite = request.method !== 'GET' && request.method !== 'HEAD'
  const limit = isWrite ? 45 : 240
  const ip = getIp(request) || 'unknown'
  const key = subjectHash(`${userId}:${ip}:${isWrite ? 'write' : 'read'}`)

  const { data, error } = await admin.rpc('consume_admin_rate_limit', {
    p_rate_key: key,
    p_limit: limit,
    p_window_seconds: 60,
  })

  if (error) {
    console.error('[admin-rate-limit]', error.message)
    throw new AdminApiError(503, 'SECURITY_CHECK_FAILED', 'Не удалось проверить ограничение запросов.')
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result?.allowed) {
    const retryAfter = Math.max(1, Number(result?.retry_after_seconds || 60))
    throw new AdminApiError(429, 'RATE_LIMITED', 'Слишком много запросов. Повторите позже.', retryAfter)
  }
}

function enforceTokenFreshness(claims: TokenClaims) {
  const now = Math.floor(Date.now() / 1000)
  if (claims.exp !== null && claims.exp <= now) {
    throw new AdminApiError(401, 'INVALID_SESSION', 'Сессия истекла. Войдите снова.')
  }

  const maxAge = Number(process.env.ADMIN_MAX_TOKEN_AGE_SECONDS || 7200)
  if (claims.iat !== null && Number.isFinite(maxAge) && maxAge >= 300 && now - claims.iat > maxAge) {
    throw new AdminApiError(401, 'ADMIN_SESSION_TOO_OLD', 'Защищённая сессия устарела. Войдите снова.')
  }
}

export async function requireAdmin(request: NextRequest): Promise<AdminContext> {
  const requestId = randomUUID()
  enforcePreAuthRateLimit(request)
  enforceRequestOrigin(request)

  const accessToken = bearerToken(request)
  const claims = decodeClaims(accessToken)
  const auth = createAuthClient()
  const { data, error } = await auth.auth.getUser(accessToken)

  if (error || !data.user) {
    throw new AdminApiError(401, 'INVALID_SESSION', 'Сессия истекла. Войдите снова.')
  }

  enforceTokenFreshness(claims)
  const admin = createAdminClient()
  const ip = getIp(request) || 'unknown'

  if (!isAdminUserId(data.user.id)) {
    await recordSecurityEvent(admin, 'admin.access_denied', `${data.user.id}:${ip}`, data.user.id, {
      requestId,
      path: request.nextUrl.pathname,
      method: request.method,
    })
    throw new AdminApiError(403, 'FORBIDDEN', 'У этого аккаунта нет доступа к админ-панели.')
  }

  const { data: securityRow, error: securityError } = await admin
    .from('admin_security')
    .select('mfa_required')
    .eq('admin_id', data.user.id)
    .maybeSingle()

  if (securityError) throw new AdminApiError(500, 'ADMIN_SECURITY_CHECK_FAILED', 'Не удалось проверить настройки безопасности администратора.')

  // MFA включается только после успешного подключения пользователем.
  // Глобальная переменная остаётся аварийным флагом, но по умолчанию выключена.
  const mfaRequired = booleanEnv('ADMIN_REQUIRE_MFA', false) || securityRow?.mfa_required === true

  if (mfaRequired && claims.aal !== 'aal2') {
    await recordSecurityEvent(admin, 'admin.mfa_required', `${data.user.id}:${ip}`, data.user.id, {
      requestId,
      path: request.nextUrl.pathname,
    })
    throw new AdminApiError(403, 'MFA_REQUIRED', 'Для входа в админ-панель необходимо подтвердить второй фактор.')
  }

  await enforcePersistentRateLimit(admin, request, data.user.id)
  await recordSecurityEvent(admin, 'admin.access_granted', `${data.user.id}:${ip}`, data.user.id, {
    requestId,
    path: request.nextUrl.pathname,
    method: request.method,
    aal: claims.aal,
  })

  return {
    user: data.user,
    admin,
    accessToken,
    aal: claims.aal,
    mfaRequired,
    ipAddress: getIp(request),
    userAgent: request.headers.get('user-agent')?.slice(0, 500) || null,
    requestId,
  }
}

export function adminJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...(init?.headers || {}),
    },
  })
}

export function adminError(error: unknown) {
  if (error instanceof AdminApiError) {
    return adminJson(
      { ok: false, code: error.code, error: error.message },
      {
        status: error.status,
        headers: error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : undefined,
      },
    )
  }

  console.error('[admin-api]', error)
  return adminJson({ ok: false, code: 'INTERNAL_ERROR', error: 'Внутренняя ошибка админ-панели.' }, { status: 500 })
}

export async function readJsonBody(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (!Number.isFinite(contentLength) || contentLength < 0) {
    throw new AdminApiError(400, 'INVALID_CONTENT_LENGTH', 'Некорректный размер запроса.')
  }
  if (contentLength > 64_000) throw new AdminApiError(413, 'PAYLOAD_TOO_LARGE', 'Слишком большой запрос.')

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new AdminApiError(415, 'INVALID_CONTENT_TYPE', 'Ожидался JSON-запрос.')
  }

  try {
    return await request.json() as Record<string, unknown>
  } catch {
    throw new AdminApiError(400, 'INVALID_JSON', 'Не удалось прочитать данные запроса.')
  }
}

export async function writeAudit(
  context: AdminContext,
  action: string,
  entityType: string,
  entityId: string | null,
  reason: string | null = null,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await context.admin.from('admin_audit_log').insert({
    admin_id: context.user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    reason,
    metadata: { ...metadata, requestId: context.requestId },
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
  })

  if (error) console.error('[admin-audit]', error)
}

export async function writeAuditStrict(
  context: AdminContext,
  action: string,
  entityType: string,
  entityId: string | null,
  reason: string | null = null,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await context.admin.from('admin_audit_log').insert({
    admin_id: context.user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    reason,
    metadata: { ...metadata, requestId: context.requestId },
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
  })

  if (error) {
    console.error('[admin-audit-strict]', error)
    throw new AdminApiError(500, 'AUDIT_REQUIRED', 'Не удалось зафиксировать доступ в журнале. Действие отменено.')
  }
}

export function cleanText(value: unknown, maxLength: number, allowEmpty = true) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new AdminApiError(400, 'INVALID_FIELD', 'Поле должно быть текстом.')
  const text = value.trim()
  if (!allowEmpty && !text) throw new AdminApiError(400, 'INVALID_FIELD', 'Обязательное поле не заполнено.')
  if (text.length > maxLength) throw new AdminApiError(400, 'INVALID_FIELD', `Максимальная длина поля: ${maxLength} символов.`)
  return text || null
}

export function cleanUuid(value: unknown, field = 'ID') {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AdminApiError(400, 'INVALID_ID', `${field} указан неверно.`)
  }
  return value
}

export function cleanInteger(value: unknown, min: number, max: number) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new AdminApiError(400, 'INVALID_FIELD', `Число должно быть от ${min} до ${max}.`)
  }
  return number
}
