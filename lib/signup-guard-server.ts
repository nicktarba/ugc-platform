import { readFileSync } from 'node:fs'

const AUTH_ENV_PATH = '/etc/svoi-ugc-auth.env'
let cachedGuard: string | null = null

export function readSignupGuard() {
  if (cachedGuard) return cachedGuard
  const text = readFileSync(AUTH_ENV_PATH, 'utf8')
  const line = text.split(/\r?\n/).find((item) => item.startsWith('SIGNUP_GUARD='))
  const guard = line?.slice('SIGNUP_GUARD='.length).trim()
  if (!guard || guard.length < 32) throw new Error('SIGNUP_GUARD is not configured')
  cachedGuard = guard
  return guard
}
