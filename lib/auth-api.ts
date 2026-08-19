import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

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
  if (!contentType.includes('application/json')) {
    throw new Error('INVALID_CONTENT_TYPE')
  }
  return await request.json() as Record<string, unknown>
}

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function validPassword(value: unknown) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128
}
