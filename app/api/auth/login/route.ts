import type { NextRequest } from 'next/server'
import { authJson, normalizeEmail, readAuthBody } from '@/lib/auth-api'
import { authServerClient } from '@/lib/auth-server'
import { verifySmartCaptcha } from '@/lib/smartcaptcha-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await readAuthBody(request)
    const captcha = await verifySmartCaptcha(request, body.captchaToken)
    if (!captcha.ok) return authJson({ ok: false, error: captcha.error }, 400)

    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) return authJson({ ok: false, error: 'Введите email и пароль.' }, 400)

    const supabase = authServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.session) {
      const message = error?.message.toLowerCase() || ''
      if (message.includes('email not confirmed')) return authJson({ ok: false, error: 'Email ещё не подтверждён. Проверьте почту.' }, 403)
      if (message.includes('rate limit')) return authJson({ ok: false, error: 'Слишком много попыток. Подождите немного и попробуйте снова.' }, 429)
      return authJson({ ok: false, error: 'Неверный email или пароль.' }, 401)
    }

    return authJson({
      ok: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    })
  } catch (error) {
    console.error('[auth/login]', error)
    return authJson({ ok: false, error: 'Не удалось войти. Попробуйте ещё раз.' }, 500)
  }
}
