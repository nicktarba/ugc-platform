import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Authorization',
}

const DEFAULTS = {
  enabled: true,
  account: true,
  messages: true,
  requests: true,
  deals: true,
  reviews: true,
  moderation: true,
  complaints: true,
}

type Preferences = typeof DEFAULTS

type Context = {
  user: User
  admin: SupabaseClient
}

class ApiError extends Error {
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
  if (!value) {
    throw new ApiError(503, 'EMAIL_NOT_CONFIGURED', `Не задана переменная ${name}.`)
  }
  return value
}

function authClient() {
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

function adminClient() {
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

  if (!match?.[1]) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Сессия истекла. Войдите снова.')
  }

  return match[1]
}

function enforceOrigin(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD') return

  const origin = request.headers.get('origin')
  if (!origin) return

  const expectedHost = request.headers.get('x-forwarded-host')
    || request.headers.get('host')

  if (!expectedHost) {
    throw new ApiError(403, 'ORIGIN_REJECTED', 'Не удалось проверить источник запроса.')
  }

  try {
    if (new URL(origin).host !== expectedHost) {
      throw new ApiError(403, 'ORIGIN_REJECTED', 'Запрос отправлен с недоверенного источника.')
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(403, 'ORIGIN_REJECTED', 'Некорректный источник запроса.')
  }
}

async function requireUser(request: NextRequest): Promise<Context> {
  enforceOrigin(request)

  const token = bearerToken(request)
  const auth = authClient()
  const { data, error } = await auth.auth.getUser(token)

  if (error || !data.user) {
    throw new ApiError(401, 'INVALID_SESSION', 'Сессия истекла. Войдите снова.')
  }

  return {
    user: data.user,
    admin: adminClient(),
  }
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...(init?.headers || {}),
    },
  })
}

function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return json(
      { ok: false, code: error.code, error: error.message },
      { status: error.status },
    )
  }

  console.error('[email-preferences-api]', error)
  return json(
    {
      ok: false,
      code: 'INTERNAL_ERROR',
      error: 'Не удалось обработать настройки email.',
    },
    { status: 500 },
  )
}

async function readBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new ApiError(415, 'INVALID_CONTENT_TYPE', 'Ожидался JSON-запрос.')
  }

  try {
    return await request.json() as Record<string, unknown>
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Не удалось прочитать запрос.')
  }
}

function parsePreferences(body: Record<string, unknown>): Preferences {
  const result = { ...DEFAULTS }

  for (const key of Object.keys(DEFAULTS) as Array<keyof Preferences>) {
    if (typeof body[key] !== 'boolean') {
      throw new ApiError(400, 'INVALID_PREFERENCES', 'Все настройки должны быть включены или выключены.')
    }
    result[key] = body[key] as boolean
  }

  return result
}

export async function GET(request: NextRequest) {
  try {
    const { user, admin } = await requireUser(request)
    const { data, error } = await admin
      .from('email_notification_preferences')
      .select('enabled, account, messages, requests, deals, reviews, moderation, complaints')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    return json({
      ok: true,
      preferences: data ? { ...DEFAULTS, ...data } : DEFAULTS,
    })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, admin } = await requireUser(request)
    const preferences = parsePreferences(await readBody(request))

    const { data, error } = await admin
      .from('email_notification_preferences')
      .upsert(
        {
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('enabled, account, messages, requests, deals, reviews, moderation, complaints')
      .single()

    if (error) throw error

    return json({ ok: true, preferences: data })
  } catch (error) {
    return apiError(error)
  }
}
