import type { NextRequest } from 'next/server'
import { authJson, normalizeEmail, readAuthBody, validPassword } from '@/lib/auth-api'
import { authServerClient } from '@/lib/auth-server'
import { verifySmartCaptcha } from '@/lib/smartcaptcha-server'
import { readSignupGuard } from '@/lib/signup-guard-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await readAuthBody(request)
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
    return authJson({ ok: true, email })
  } catch (error) {
    console.error('[auth/register]', error)
    return authJson({ ok: false, error: 'Не удалось создать аккаунт. Попробуйте ещё раз.' }, 500)
  }
}
