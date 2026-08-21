import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AUTHOR_PUBLICATION_CONSENT_VERSION, AUTHOR_PUBLICATION_FIELD_KEYS, AUTHOR_PUBLICATION_REQUIRED_FIELD_KEYS } from '@/lib/legal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PUBLICATION_FIELD_SET = new Set<string>(AUTHOR_PUBLICATION_FIELD_KEYS)
const REQUIRED_PUBLICATION_FIELDS = new Set<string>(AUTHOR_PUBLICATION_REQUIRED_FIELD_KEYS)

function normalizePublicFields(value: unknown) {
  if (!Array.isArray(value)) return null
  const fields = Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && PUBLICATION_FIELD_SET.has(item))))
  if (fields.length === 0) return null
  for (const field of REQUIRED_PUBLICATION_FIELDS) {
    if (!fields.includes(field)) return null
  }
  return fields.sort()
}

function publicFieldsFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [] as string[]
  const publicFields = (metadata as { public_fields?: unknown }).public_fields
  return Array.isArray(publicFields) ? publicFields.filter((item): item is string => typeof item === 'string') : []
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceRoleKey) throw new Error('Legal consent API is not configured')
  return {
    auth: createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    admin: createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  }
}

async function currentUser(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) return null
  const { auth } = clients()
  const { data, error } = await auth.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

async function ensureAuthor(admin: ReturnType<typeof clients>['admin'], userId: string) {
  const { data, error } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw error
  return data?.role === 'author'
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request)
    if (!user) return json({ ok: false, error: 'Требуется авторизация.' }, 401)

    const type = request.nextUrl.searchParams.get('type')
    if (type !== 'author_publication') return json({ ok: false, error: 'Неизвестный тип согласия.' }, 400)

    const { admin } = clients()
    if (!(await ensureAuthor(admin, user.id))) return json({ ok: false, error: 'Согласие доступно только автору.' }, 403)

    const { data, error } = await admin
      .from('legal_consent_events')
      .select('action, created_at, metadata')
      .eq('user_id', user.id)
      .eq('consent_type', 'author_publication')
      .eq('document_version', AUTHOR_PUBLICATION_CONSENT_VERSION)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return json({
      ok: true,
      granted: data?.action === 'granted',
      version: AUTHOR_PUBLICATION_CONSENT_VERSION,
      publicFields: data?.action === 'granted' ? publicFieldsFromMetadata(data.metadata) : [],
    })
  } catch (error) {
    console.error('[legal-consent][GET]', error)
    return json({ ok: false, error: 'Не удалось проверить согласие.' }, 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser(request)
    if (!user || !user.email) return json({ ok: false, error: 'Требуется авторизация.' }, 401)

    const body = await request.json().catch(() => null) as { type?: unknown; subjectName?: unknown; publicFields?: unknown } | null
    if (body?.type !== 'author_publication') return json({ ok: false, error: 'Неизвестный тип согласия.' }, 400)

    const subjectName = typeof body.subjectName === 'string' ? body.subjectName.trim().replace(/\s+/g, ' ') : ''
    const publicFields = normalizePublicFields(body.publicFields)
    const nameParts = subjectName.split(' ').filter(Boolean)
    if (subjectName.length < 3 || subjectName.length > 200 || nameParts.length < 2) {
      return json({ ok: false, error: 'Укажите фамилию и имя для оформления согласия.' }, 400)
    }
    if (!publicFields) {
      return json({ ok: false, error: 'Не удалось определить перечень данных для публикации.' }, 400)
    }

    const { admin } = clients()
    if (!(await ensureAuthor(admin, user.id))) return json({ ok: false, error: 'Согласие доступно только автору.' }, 403)

    const { data: latest, error: latestError } = await admin
      .from('legal_consent_events')
      .select('action, metadata')
      .eq('user_id', user.id)
      .eq('consent_type', 'author_publication')
      .eq('document_version', AUTHOR_PUBLICATION_CONSENT_VERSION)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestError) throw latestError

    if (latest?.action === 'granted') {
      const existingFields = publicFieldsFromMetadata(latest.metadata)
      const coversRequestedFields = publicFields.every((field) => existingFields.includes(field))
      if (coversRequestedFields) {
        return json({ ok: true, granted: true, version: AUTHOR_PUBLICATION_CONSENT_VERSION, publicFields: existingFields })
      }
    }

    const { error } = await admin.from('legal_consent_events').insert({
      user_id: user.id,
      consent_type: 'author_publication',
      document_version: AUTHOR_PUBLICATION_CONSENT_VERSION,
      action: 'granted',
      subject_name: subjectName,
      subject_contact: user.email,
      source: 'author_profile',
      metadata: {
        document: '/distribution-consent',
        user_agent: request.headers.get('user-agent') || null,
        public_fields: publicFields,
        restrictions: 'none',
      },
    })
    if (error) throw error

    return json({ ok: true, granted: true, version: AUTHOR_PUBLICATION_CONSENT_VERSION, publicFields })
  } catch (error) {
    console.error('[legal-consent][POST]', error)
    return json({ ok: false, error: 'Не удалось зафиксировать согласие.' }, 500)
  }
}
