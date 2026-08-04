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
}

type RateEntry = { count: number; resetAt: number }

declare global {
  // eslint-disable-next-line no-var
  var __svoiAdminRateLimits: Map<string, RateEntry> | undefined
}

const rateLimits = globalThis.__svoiAdminRateLimits ?? new Map<string, RateEntry>()
globalThis.__svoiAdminRateLimits = rateLimits

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  Vary: 'Authorization',
}

export class AdminApiError extends Error {
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
  if (!value) throw new AdminApiError(503, 'ADMIN_NOT_CONFIGURED', `Не задана серверная переменная ${name}.`)
  return value
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
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match?.[1]) throw new AdminApiError(401, 'UNAUTHENTICATED', 'Необходимо войти в аккаунт администратора.')
  return match[1]
}

function decodeAal(token: string): 'aal1' | 'aal2' {
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return 'aal1'
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as { aal?: string }
    return payload.aal === 'aal2' ? 'aal2' : 'aal1'
  } catch {
    return 'aal1'
  }
}

function adminAllowlist() {
  return new Set(
    requiredEnv('ADMIN_USER_IDS')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean),
  )
}

export function isAdminUserId(userId: string) {
  return adminAllowlist().has(userId)
}

function getIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || null
}

function enforceRateLimit(request: NextRequest, userId: string) {
  const ip = getIp(request) || 'unknown'
  const isWrite = request.method !== 'GET' && request.method !== 'HEAD'
  const windowMs = 60_000
  const max = isWrite ? 30 : 180
  const key = `${userId}:${ip}:${isWrite ? 'write' : 'read'}`
  const now = Date.now()
  const current = rateLimits.get(key)

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (current.count >= max) {
    throw new AdminApiError(429, 'RATE_LIMITED', 'Слишком много запросов. Повторите через минуту.')
  }

  current.count += 1
}

function enforceRequestOrigin(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD') return

  const origin = request.headers.get('origin')
  if (!origin) return

  const expectedHost = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (!expectedHost) throw new AdminApiError(403, 'ORIGIN_REJECTED', 'Не удалось проверить источник запроса.')

  try {
    if (new URL(origin).host !== expectedHost) {
      throw new AdminApiError(403, 'ORIGIN_REJECTED', 'Запрос отправлен с недоверенного источника.')
    }
  } catch (error) {
    if (error instanceof AdminApiError) throw error
    throw new AdminApiError(403, 'ORIGIN_REJECTED', 'Некорректный источник запроса.')
  }
}

export async function requireAdmin(request: NextRequest): Promise<AdminContext> {
  enforceRequestOrigin(request)

  const accessToken = bearerToken(request)
  const auth = createAuthClient()
  const { data, error } = await auth.auth.getUser(accessToken)

  if (error || !data.user) {
    throw new AdminApiError(401, 'INVALID_SESSION', 'Сессия истекла. Войдите снова.')
  }

  const admin = createAdminClient()

  // Админское право отделено от основной роли пользователя.
  // Аккаунт может оставаться business/author и одновременно входить в серверный allowlist.
  if (!isAdminUserId(data.user.id)) {
    throw new AdminApiError(403, 'FORBIDDEN', 'У этого аккаунта нет доступа к админ-панели.')
  }

  const aal = decodeAal(accessToken)
  const { data: securityRow, error: securityError } = await admin
    .from('admin_security')
    .select('mfa_required')
    .eq('admin_id', data.user.id)
    .maybeSingle()

  if (securityError) throw new AdminApiError(500, 'ADMIN_SECURITY_CHECK_FAILED', 'Не удалось проверить настройки безопасности администратора.')

  const mfaRequired = process.env.ADMIN_REQUIRE_MFA?.trim().toLowerCase() === 'true'
    || securityRow?.mfa_required === true

  if (mfaRequired && aal !== 'aal2') {
    throw new AdminApiError(403, 'MFA_REQUIRED', 'Для входа в админ-панель необходимо подтвердить второй фактор.')
  }

  enforceRateLimit(request, data.user.id)

  return {
    user: data.user,
    admin,
    accessToken,
    aal,
    mfaRequired,
    ipAddress: getIp(request),
    userAgent: request.headers.get('user-agent'),
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
    return adminJson({ ok: false, code: error.code, error: error.message }, { status: error.status })
  }

  console.error('[admin-api]', error)
  return adminJson({ ok: false, code: 'INTERNAL_ERROR', error: 'Внутренняя ошибка админ-панели.' }, { status: 500 })
}

export async function readJsonBody(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 64_000) throw new AdminApiError(413, 'PAYLOAD_TOO_LARGE', 'Слишком большой запрос.')

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
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
    metadata,
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
    metadata,
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
  })

  if (error) {
    console.error('[admin-audit-strict]', error)
    throw new AdminApiError(500, 'AUDIT_REQUIRED', 'Не удалось зафиксировать доступ в журнале. Переписка не открыта.')
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
