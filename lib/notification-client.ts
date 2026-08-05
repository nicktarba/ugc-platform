'use client'

import { supabase } from '@/lib/supabase'
import type { NotificationData } from '@/lib/notifications'

export type NotificationRecord = {
  id: string
  type: string
  title: string
  body: string | null
  data: NotificationData | null
  read: boolean
  created_at: string
}

type ApiErrorBody = {
  error?: string
  code?: string
}

async function accessToken() {
  const { data, error } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (error || !token) {
    throw new Error('Сессия истекла. Войдите снова.')
  }

  return token
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken()
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })

  const body = await response.json().catch(() => ({})) as ApiErrorBody & T

  if (!response.ok) {
    throw new Error(body.error || 'Не удалось выполнить запрос уведомлений.')
  }

  return body
}

export async function getNotifications(limit = 100) {
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)))
  const result = await requestJson<{ items: NotificationRecord[] }>(
    `/api/notifications?limit=${safeLimit}`,
  )

  return result.items || []
}

export async function getUnreadNotificationCount() {
  const result = await requestJson<{ count: number }>(
    '/api/notifications?mode=count',
  )

  return Number(result.count || 0)
}

export async function markNotificationRead(id: string) {
  await requestJson<{ ok: true }>('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'read_one', id }),
  })
}

export async function markAllNotificationsRead() {
  await requestJson<{ ok: true }>('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'read_all' }),
  })
}

export async function markRequestNotificationsRead(requestId: string) {
  await requestJson<{ ok: true }>('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'read_request', requestId }),
  })
}
