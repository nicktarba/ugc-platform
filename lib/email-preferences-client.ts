'use client'

import { supabase } from '@/lib/supabase'

export type EmailPreferences = {
  enabled: boolean
  messages: boolean
  requests: boolean
  deals: boolean
  reviews: boolean
  moderation: boolean
}

type ApiErrorBody = {
  error?: string
}

async function accessToken() {
  const { data, error } = await supabase.auth.getSession()
  const token = data.session?.access_token

  if (error || !token) {
    throw new Error('Сессия истекла. Войдите снова.')
  }

  return token
}

async function requestJson<T>(init: RequestInit = {}): Promise<T> {
  const token = await accessToken()
  const response = await fetch('/api/email-preferences', {
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
    throw new Error(body.error || 'Не удалось сохранить настройки email.')
  }

  return body
}

export async function getEmailPreferences() {
  const result = await requestJson<{ preferences: EmailPreferences }>()
  return result.preferences
}

export async function saveEmailPreferences(preferences: EmailPreferences) {
  const result = await requestJson<{ preferences: EmailPreferences }>({
    method: 'PATCH',
    body: JSON.stringify(preferences),
  })

  return result.preferences
}
