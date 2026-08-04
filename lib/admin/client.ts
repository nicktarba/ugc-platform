'use client'

import { supabase } from '@/lib/supabase'

export class AdminClientError extends Error {
  code: string
  status: number

  constructor(message: string, code = 'ADMIN_REQUEST_FAILED', status = 500) {
    super(message)
    this.code = code
    this.status = status
  }
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    throw new AdminClientError('Сессия истекла. Войдите снова.', 'UNAUTHENTICATED', 401)
  }

  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })

  const payload = await response.json().catch(() => null) as { error?: string; code?: string } | null
  if (!response.ok) {
    throw new AdminClientError(
      payload?.error || 'Не удалось выполнить запрос.',
      payload?.code || 'ADMIN_REQUEST_FAILED',
      response.status,
    )
  }

  return payload as T
}
