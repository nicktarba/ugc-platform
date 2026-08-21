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
    if (!email || !email.includes('@')) return authJson({ ok: false, error: 'Проверьте email.' }, 400)

    const supabase = authServerClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: 'https://svoi-ugc.ru/login?confirmed=1' },
    })

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('rate limit') || message.includes('seconds')) {
        return authJson({ ok: false, error: 'Письмо уже отправлялось недавно. Подождите немного и попробуйте снова.' }, 429)
      }
      // Не раскрываем состояние аккаунта по email.
      console.error('[auth/resend-confirmation]', error)
    }

    return authJson({ ok: true })
  } catch (error) {
    console.error('[auth/resend-confirmation]', error)
    return authJson({ ok: false, error: 'Не удалось отправить письмо. Попробуйте ещё раз.' }, 500)
  }
}
