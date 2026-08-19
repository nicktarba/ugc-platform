import { readFileSync } from 'node:fs'
import type { NextRequest } from 'next/server'

const CAPTCHA_ENV_PATH = '/etc/svoi-ugc-smartcaptcha.env'
const VALIDATE_URL = 'https://smartcaptcha.cloud.yandex.ru/validate'
const EXPECTED_HOST = 'svoi-ugc.ru'

let cachedSecret: string | null = null

function readSecret() {
  if (cachedSecret) return cachedSecret
  const text = readFileSync(CAPTCHA_ENV_PATH, 'utf8')
  const line = text.split(/\r?\n/).find((item) => item.startsWith('SMARTCAPTCHA_SERVER_KEY='))
  const secret = line?.slice('SMARTCAPTCHA_SERVER_KEY='.length).trim()
  if (!secret) throw new Error('SMARTCAPTCHA_SERVER_KEY is not configured')
  cachedSecret = secret
  return secret
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || ''
  return request.headers.get('x-real-ip') || ''
}

export async function verifySmartCaptcha(request: NextRequest, token: unknown) {
  if (typeof token !== 'string' || token.length < 10 || token.length > 8192) {
    return { ok: false as const, error: 'Подтвердите, что вы не робот.' }
  }

  const secret = readSecret()
  const body = new URLSearchParams({ secret, token })
  const ip = clientIp(request)
  if (ip) body.set('ip', ip)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const response = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      console.error('[smartcaptcha] validate http', response.status)
      return { ok: false as const, error: 'Не удалось проверить защиту. Попробуйте ещё раз.' }
    }

    const result = await response.json() as { status?: string; message?: string; host?: string }
    if (result.status !== 'ok') {
      return { ok: false as const, error: 'Проверка не пройдена. Попробуйте ещё раз.' }
    }

    if (result.host && result.host !== EXPECTED_HOST) {
      console.error('[smartcaptcha] unexpected host', result.host)
      return { ok: false as const, error: 'Проверка выполнена для другого сайта.' }
    }

    return { ok: true as const }
  } catch (error) {
    console.error('[smartcaptcha] validate error', error)
    return { ok: false as const, error: 'Не удалось проверить защиту. Попробуйте ещё раз.' }
  } finally {
    clearTimeout(timeout)
  }
}
