import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authJson, normalizeEmail, readAuthBody, validPassword } from '@/lib/auth-api'
import { authServerClient } from '@/lib/auth-server'
import { verifySmartCaptcha } from '@/lib/smartcaptcha-server'
import { readSignupGuard } from '@/lib/signup-guard-server'
import { PERSONAL_DATA_CONSENT_VERSION, TERMS_VERSION } from '@/lib/legal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function legalAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) throw new Error('Legal consent storage is not configured')
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function POST(request: NextRequest) {
  try {
    const body = await readAuthBody(request)
    const termsAccepted = request.headers.get('x-svoi-terms-consent') === '1'
    const personalDataAccepted = request.headers.get('x-svoi-pd-consent') === '1'
    if (!termsAccepted) return authJson({ ok: false, error: 'Примите Пользовательское соглашение.' }, 400)
    if (!personalDataAccepted) return authJson({ ok: false, error: 'Дайте отдельное согласие на обработку персональных данных.' }, 400)

    const captcha = await verifySmartCaptcha(request, body.captchaToken)
    if (!captcha.ok) return authJson({ ok: false, error: captcha.error }, 400)

    const email = normalizeEmail(body.email)
    const password = body.password
    const role = body.role

    if (!email || !email.includes('@')) return authJson({ ok: false, error: 'Проверьте email.' }, 400)
    if (!validPassword(password)) return authJson({ ok: false, error: 'Пароль должен содержать минимум 8 символов.' }, 400)
    if (role !== 'author' && role !== 'business') return authJson({ ok: false, error: 'Выберите тип аккаунта.' }, 400)

    const supabase = authServerClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: password as string,
      options: {
        data: { role, svoi_signup_guard: readSignupGuard() },
        emailRedirectTo: 'https://svoi-ugc.ru/login?confirmed=1',
      },
    })

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('password')) return authJson({ ok: false, error: 'Пароль должен содержать минимум 8 символов.' }, 400)
      if (message.includes('rate limit')) return authJson({ ok: false, error: 'Слишком много попыток. Подождите немного и попробуйте снова.' }, 429)
      console.error('[auth/register]', error)
      return authJson({ ok: false, error: 'Не удалось создать аккаунт. Попробуйте ещё раз.' }, 400)
    }

    if (!data.user) return authJson({ ok: false, error: 'Не удалось создать аккаунт.' }, 500)

    const admin = legalAdminClient()
    const common = {
      user_id: data.user.id,
      action: 'granted',
      subject_contact: email,
      source: 'registration',
      metadata: { role },
    }
    const { error: consentError } = await admin.from('legal_consent_events').insert([
      { ...common, consent_type: 'terms', document_version: TERMS_VERSION, metadata: { role, document: '/terms' } },
      { ...common, consent_type: 'personal_data', document_version: PERSONAL_DATA_CONSENT_VERSION, metadata: { role, document: '/personal-data-consent' } },
    ])

    if (consentError) {
      console.error('[auth/register][legal-consent]', consentError)
      const { error: rollbackError } = await admin.auth.admin.deleteUser(data.user.id)
      if (rollbackError) console.error('[auth/register][rollback-user]', rollbackError)
      return authJson({ ok: false, error: 'Не удалось зафиксировать согласия. Аккаунт не создан, попробуйте ещё раз.' }, 500)
    }

    return authJson({ ok: true, email })
  } catch (error) {
    console.error('[auth/register]', error)
    return authJson({ ok: false, error: 'Не удалось создать аккаунт. Попробуйте ещё раз.' }, 500)
  }
}
