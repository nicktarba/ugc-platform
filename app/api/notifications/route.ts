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

class NotificationApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type Context = {
  user: User
  admin: SupabaseClient
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new NotificationApiError(
      503,
      'NOTIFICATIONS_NOT_CONFIGURED',
      `Не задана серверная переменная ${name}.`,
    )
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
    throw new NotificationApiError(
      401,
      'UNAUTHENTICATED',
      'Сессия истекла. Войдите снова.',
    )
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
    throw new NotificationApiError(
      403,
      'ORIGIN_REJECTED',
      'Не удалось проверить источник запроса.',
    )
  }

  try {
    if (new URL(origin).host !== expectedHost) {
      throw new NotificationApiError(
        403,
        'ORIGIN_REJECTED',
        'Запрос отправлен с недоверенного источника.',
      )
    }
  } catch (error) {
    if (error instanceof NotificationApiError) throw error
    throw new NotificationApiError(
      403,
      'ORIGIN_REJECTED',
      'Некорректный источник запроса.',
    )
  }
}

async function requireUser(request: NextRequest): Promise<Context> {
  enforceOrigin(request)

  const token = bearerToken(request)
  const auth = authClient()
  const { data, error } = await auth.auth.getUser(token)

  if (error || !data.user) {
    throw new NotificationApiError(
      401,
      'INVALID_SESSION',
      'Сессия истекла. Войдите снова.',
    )
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
  if (error instanceof NotificationApiError) {
    return json(
      { ok: false, code: error.code, error: error.message },
      { status: error.status },
    )
  }

  console.error('[notifications-api]', error)
  return json(
    {
      ok: false,
      code: 'INTERNAL_ERROR',
      error: 'Не удалось обработать уведомления.',
    },
    { status: 500 },
  )
}

function safeLimit(raw: string | null) {
  const value = Number(raw || 100)
  if (!Number.isFinite(value)) return 100
  return Math.min(100, Math.max(1, Math.trunc(value)))
}

function validId(value: unknown) {
  return typeof value === 'string'
    && value.length >= 8
    && value.length <= 128
    && /^[a-zA-Z0-9_-]+$/.test(value)
}

async function readBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new NotificationApiError(
      415,
      'INVALID_CONTENT_TYPE',
      'Ожидался JSON-запрос.',
    )
  }

  try {
    return await request.json() as Record<string, unknown>
  } catch {
    throw new NotificationApiError(
      400,
      'INVALID_JSON',
      'Не удалось прочитать запрос.',
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, admin } = await requireUser(request)
    const mode = request.nextUrl.searchParams.get('mode')

    if (mode === 'count') {
      const { count, error } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error
      return json({ ok: true, count: count || 0 })
    }

    const { data, error } = await admin
      .from('notifications')
      .select('id, type, title, body, data, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(safeLimit(request.nextUrl.searchParams.get('limit')))

    if (error) throw error
    return json({ ok: true, items: data || [] })
  } catch (error) {
    return apiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, admin } = await requireUser(request)
    const body = await readBody(request)
    const action = body.action

    if (action === 'read_all') {
      const { error } = await admin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error
      return json({ ok: true })
    }

    if (action === 'read_one') {
      if (!validId(body.id)) {
        throw new NotificationApiError(
          400,
          'INVALID_NOTIFICATION_ID',
          'Некорректный идентификатор уведомления.',
        )
      }

      const { error } = await admin
        .from('notifications')
        .update({ read: true })
        .eq('id', body.id as string)
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error
      return json({ ok: true })
    }

    if (action === 'read_request') {
      if (!validId(body.requestId)) {
        throw new NotificationApiError(
          400,
          'INVALID_REQUEST_ID',
          'Некорректный идентификатор сделки.',
        )
      }

      const { error } = await admin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .contains('data', { request_id: body.requestId as string })
        .eq('read', false)

      if (error) throw error
      return json({ ok: true })
    }

    throw new NotificationApiError(
      400,
      'INVALID_ACTION',
      'Неизвестное действие с уведомлениями.',
    )
  } catch (error) {
    return apiError(error)
  }
}
