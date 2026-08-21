import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const MAX_AUTH_BODY_BYTES = 32 * 1024

export function authJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  })
}

export async function readAuthBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) throw new Error('INVALID_CONTENT_TYPE')

  const declaredLength = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AUTH_BODY_BYTES) {
    throw new Error('BODY_TOO_LARGE')
  }

  const text = await request.text()
  if (Buffer.byteLength(text, 'utf8') > MAX_AUTH_BODY_BYTES) throw new Error('BODY_TOO_LARGE')
  return JSON.parse(text) as Record<string, unknown>
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return ''
  const email = value.trim().toLowerCase()
  return email.length <= 254 ? email : ''
}

export function validPassword(value: unknown) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128
}
