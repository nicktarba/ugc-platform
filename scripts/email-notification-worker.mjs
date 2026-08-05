#!/usr/bin/env node

import crypto from 'node:crypto'
import os from 'node:os'
import process from 'node:process'
import tls from 'node:tls'
import WebSocket from 'ws'
import { createClient } from '@supabase/supabase-js'

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'EMAIL_FROM',
]

for (const name of REQUIRED) {
  if (!process.env[name]?.trim()) {
    console.error(`[email-worker] Missing environment variable: ${name}`)
    process.exit(1)
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
const smtpHost = process.env.SMTP_HOST.trim()
const smtpPort = Number(process.env.SMTP_PORT || 465)
const smtpUser = process.env.SMTP_USER.trim()
const smtpPassword = process.env.SMTP_PASSWORD
const emailFrom = process.env.EMAIL_FROM.trim()
const emailReplyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined
const siteUrl = (process.env.SITE_URL?.trim() || 'https://svoi-ugc.ru').replace(/\/$/, '')
const batchLimit = Math.min(500, Math.max(1, Number(process.env.EMAIL_BATCH_LIMIT || 200)))

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    transport: WebSocket,
  },
})

const htmlEscape = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const cleanText = value => String(value ?? '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 500)

function emailCategory(type) {
  if (type === 'new_message') return 'messages'
  if (['new_request', 'request_viewed'].includes(type)) return 'requests'
  if ([
    'request_accepted',
    'request_declined',
    'request_cancelled',
    'request_completed',
    'work_done',
  ].includes(type)) return 'deals'
  if (type === 'new_review') return 'reviews'
  if (['author_approved', 'author_rejected'].includes(type)) return 'moderation'
  return null
}

function destination(type, data = {}) {
  const requestId = typeof data?.request_id === 'string' ? data.request_id : ''

  if (type === 'new_message' && requestId) {
    return `${siteUrl}/dashboard/chat/${encodeURIComponent(requestId)}`
  }

  if (requestId) {
    return `${siteUrl}/dashboard/request/${encodeURIComponent(requestId)}`
  }

  if (['author_approved', 'author_rejected'].includes(type)) {
    return `${siteUrl}/dashboard/author/profile`
  }

  return `${siteUrl}/dashboard/notifications`
}

function renderEmail({ subject, heading, body, buttonText, href, preview }) {
  const safeSubject = htmlEscape(subject)
  const safeHeading = htmlEscape(heading)
  const safeBody = htmlEscape(body)
  const safeButton = htmlEscape(buttonText)
  const safeHref = htmlEscape(href)
  const safePreview = htmlEscape(preview || body)

  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fafaf9;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e8e6e1;border-radius:22px;overflow:hidden;box-shadow:0 16px 45px rgba(24,22,20,.06);">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #eeeae6;">
              <div style="font-size:21px;font-weight:800;letter-spacing:-.04em;">СВОИ <span style="color:#ee6551;font-size:14px;letter-spacing:0;">UGC</span></div>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 28px 30px;">
              <div style="margin-bottom:10px;color:#c65343;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;">Новое событие</div>
              <h1 style="margin:0;font-size:28px;line-height:1.14;letter-spacing:-.035em;">${safeHeading}</h1>
              <p style="margin:16px 0 0;color:#69645f;font-size:15px;line-height:1.65;">${safeBody}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:26px;">
                <tr>
                  <td style="border-radius:999px;background:#ee6551;">
                    <a href="${safeHref}" style="display:inline-block;padding:13px 21px;color:#ffffff;font-size:14px;font-weight:750;text-decoration:none;">${safeButton}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f7f5f2;color:#8b8580;font-size:12px;line-height:1.5;">
              Письмо отправлено платформой СВОИ UGC. Настройки email можно изменить в разделе «Уведомления».
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${heading}\n\n${body}\n\n${buttonText}: ${href}\n\nНастройки email: ${siteUrl}/dashboard/notifications`
  return { html, text }
}

function parseMailbox(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/^(.*?)\s*<([^<>\s]+@[^<>\s]+)>$/)

  if (match) {
    return {
      name: match[1].trim().replace(/^['"]|['"]$/g, ''),
      email: match[2].trim().toLowerCase(),
    }
  }

  return { name: '', email: raw.toLowerCase() }
}

function encodeHeader(value) {
  const text = String(value || '')
  if (/^[\x20-\x7E]*$/.test(text)) return text
  return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`
}

function wrapBase64(value) {
  const encoded = Buffer.from(String(value || ''), 'utf8').toString('base64')
  return encoded.match(/.{1,76}/g)?.join('\r\n') || ''
}

function sanitizeHeader(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim()
}

function buildMimeMessage({ to, subject, html, text, messageId }) {
  const from = parseMailbox(emailFrom)
  const boundary = `svoi-${crypto.randomBytes(18).toString('hex')}`
  const fromHeader = from.name
    ? `${encodeHeader(from.name)} <${from.email}>`
    : from.email

  const headers = [
    `From: ${fromHeader}`,
    `To: <${sanitizeHeader(to)}>`,
    ...(emailReplyTo ? [`Reply-To: <${sanitizeHeader(emailReplyTo)}>`] : []),
    `Subject: ${encodeHeader(sanitizeHeader(subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${messageId}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    'Auto-Submitted: auto-generated',
    'X-Auto-Response-Suppress: All',
  ]

  return [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(html),
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

class SmtpConnection {
  constructor(socket) {
    this.socket = socket
    this.buffer = ''
    this.waiters = []

    socket.setEncoding('utf8')
    socket.on('data', chunk => {
      this.buffer += chunk
      this.flush()
    })
    socket.on('error', error => this.rejectAll(error))
    socket.on('close', () => {
      if (this.waiters.length > 0) {
        this.rejectAll(new Error('SMTP connection closed unexpectedly'))
      }
    })
  }

  rejectAll(error) {
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift()
      waiter.reject(error)
    }
  }

  flush() {
    while (this.waiters.length > 0) {
      const lines = this.buffer.split('\r\n')
      if (lines.length < 2) return

      let endIndex = -1
      for (let index = 0; index < lines.length - 1; index += 1) {
        if (/^\d{3} /.test(lines[index])) {
          endIndex = index
          break
        }
      }

      if (endIndex < 0) return

      const responseLines = lines.slice(0, endIndex + 1)
      this.buffer = lines.slice(endIndex + 1).join('\r\n')
      const waiter = this.waiters.shift()
      waiter.resolve(responseLines.join('\n'))
    }
  }

  readResponse() {
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject })
      this.flush()
    })
  }

  async command(command, expectedCodes) {
    if (command !== null) this.socket.write(`${command}\r\n`)
    const response = await this.readResponse()
    const code = Number(response.slice(0, 3))

    if (!expectedCodes.includes(code)) {
      throw new Error(`SMTP ${code || 'error'}: ${response}`)
    }

    return response
  }
}

async function sendSmtp({ to, subject, html, text, messageKey }) {
  const from = parseMailbox(emailFrom)
  if (!from.email || from.email !== smtpUser.toLowerCase()) {
    throw new Error('EMAIL_FROM must use the same address as SMTP_USER')
  }

  const recipient = sanitizeHeader(to)
  if (!/^\S+@\S+\.\S+$/.test(recipient)) {
    throw new Error('Invalid recipient email')
  }

  const domain = smtpUser.split('@')[1] || 'svoi-ugc.ru'
  const messageId = `${messageKey}.${Date.now()}@${domain}`
  const message = buildMimeMessage({ to: recipient, subject, html, text, messageId })
  const timeoutMs = Math.min(120000, Math.max(5000, Number(process.env.SMTP_TIMEOUT_MS || 30000)))

  const socket = tls.connect({
    host: smtpHost,
    port: smtpPort,
    servername: smtpHost,
    rejectUnauthorized: true,
  })

  socket.setTimeout(timeoutMs)

  const timeoutPromise = new Promise((_, reject) => {
    socket.once('timeout', () => reject(new Error('SMTP connection timed out')))
  })

  const smtp = new SmtpConnection(socket)

  const smtpPromise = (async () => {
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve)
      socket.once('error', reject)
    })

    await smtp.command(null, [220])
    await smtp.command(`EHLO ${os.hostname().replace(/[^a-zA-Z0-9.-]/g, '-') || 'svoi-ugc'}`, [250])
    await smtp.command('AUTH LOGIN', [334])
    await smtp.command(Buffer.from(smtpUser, 'utf8').toString('base64'), [334])
    await smtp.command(Buffer.from(smtpPassword, 'utf8').toString('base64'), [235])
    await smtp.command(`MAIL FROM:<${from.email}>`, [250])
    await smtp.command(`RCPT TO:<${recipient}>`, [250, 251])
    await smtp.command('DATA', [354])

    socket.write(`${message}\r\n.\r\n`)
    await smtp.command(null, [250])
    await smtp.command('QUIT', [221])
    socket.end()

    return messageId
  })()

  try {
    return await Promise.race([smtpPromise, timeoutPromise])
  } finally {
    socket.destroy()
  }
}

async function updateNotifications(ids, patch) {
  const { error } = await admin
    .from('notifications')
    .update(patch)
    .in('id', ids)

  if (error) throw error
}

async function writeDeliveryLog({ ids, userId, email, type, subject, status, providerId = null, error = null }) {
  const { error: logError } = await admin
    .from('email_delivery_log')
    .insert({
      notification_ids: ids,
      user_id: userId,
      recipient_email: email,
      notification_type: type,
      subject,
      provider_message_id: providerId,
      status,
      error,
      updated_at: new Date().toISOString(),
    })

  if (logError) {
    console.error('[email-worker] Failed to write delivery log:', logError.message)
  }
}

function groupNotifications(items) {
  const groups = []
  const messageGroups = new Map()

  for (const item of items) {
    if (item.type !== 'new_message') {
      groups.push([item])
      continue
    }

    const requestId = typeof item.data?.request_id === 'string'
      ? item.data.request_id
      : 'unknown'
    const key = `${item.user_id}:${requestId}`
    const existing = messageGroups.get(key) || []
    existing.push(item)
    messageGroups.set(key, existing)
  }

  for (const group of messageGroups.values()) {
    group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    groups.push(group)
  }

  return groups
}

async function getUserBundle(userId, cache) {
  if (cache.has(userId)) return cache.get(userId)

  const [{ data: authData, error: authError }, { data: prefData, error: prefError }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from('email_notification_preferences')
      .select('enabled, messages, requests, deals, reviews, moderation')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (authError) throw authError
  if (prefError) throw prefError

  const bundle = {
    email: authData.user?.email?.trim().toLowerCase() || '',
    preferences: {
      enabled: true,
      messages: true,
      requests: true,
      deals: true,
      reviews: true,
      moderation: true,
      ...(prefData || {}),
    },
  }

  cache.set(userId, bundle)
  return bundle
}

async function isSuppressed(email) {
  const { data, error } = await admin
    .from('email_suppressions')
    .select('email')
    .eq('email', email)
    .eq('active', true)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

async function processGroup(group, userCache) {
  const ids = group.map(item => item.id)
  const first = group[0]
  const latest = group[group.length - 1]
  const category = emailCategory(first.type)

  if (!category) {
    await updateNotifications(ids, {
      email_status: 'skipped',
      email_processed_at: new Date().toISOString(),
      email_claimed_at: null,
      email_last_error: 'UNSUPPORTED_TYPE',
    })
    return { status: 'skipped' }
  }

  const bundle = await getUserBundle(first.user_id, userCache)
  const email = bundle.email
  const preferences = bundle.preferences

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    await updateNotifications(ids, {
      email_status: 'skipped',
      email_processed_at: new Date().toISOString(),
      email_claimed_at: null,
      email_last_error: 'NO_VALID_EMAIL',
    })
    return { status: 'skipped' }
  }

  if (!preferences.enabled || !preferences[category]) {
    await updateNotifications(ids, {
      email_status: 'skipped',
      email_processed_at: new Date().toISOString(),
      email_claimed_at: null,
      email_last_error: 'DISABLED_BY_USER',
    })
    return { status: 'skipped' }
  }

  if (await isSuppressed(email)) {
    await updateNotifications(ids, {
      email_status: 'suppressed',
      email_processed_at: new Date().toISOString(),
      email_claimed_at: null,
      email_last_error: 'SUPPRESSION_LIST',
    })
    return { status: 'suppressed' }
  }

  const isMessageDigest = first.type === 'new_message'
  const count = group.length
  const heading = isMessageDigest && count > 1
    ? `У вас ${count} новых сообщений`
    : cleanText(latest.title || 'Новое уведомление')
  const body = isMessageDigest && count > 1
    ? `${cleanText(latest.body || 'Откройте чат, чтобы прочитать сообщения.')} Ещё сообщений: ${count - 1}.`
    : cleanText(latest.body || 'Откройте платформу, чтобы посмотреть подробности.')
  const href = destination(first.type, latest.data || {})
  const buttonText = first.type === 'new_message' ? 'Открыть чат' : 'Посмотреть событие'
  const subject = `СВОИ UGC — ${heading}`
  const rendered = renderEmail({ subject, heading, body, buttonText, href, preview: body })
  const hash = crypto.createHash('sha256').update(ids.slice().sort().join(',')).digest('hex')
  const idempotencyKey = `svoi-notification-${hash}`

  try {
    const providerId = await sendSmtp({
      to: email,
      subject,
      html: rendered.html,
      text: rendered.text,
      messageKey: idempotencyKey,
    })

    await updateNotifications(ids, {
      email_status: 'sent',
      email_provider_id: providerId,
      email_processed_at: new Date().toISOString(),
      email_claimed_at: null,
      email_last_error: null,
    })

    await writeDeliveryLog({
      ids,
      userId: first.user_id,
      email,
      type: first.type,
      subject,
      status: 'sent',
      providerId,
    })

    return { status: 'sent' }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await updateNotifications(ids, {
      email_status: 'failed',
      email_claimed_at: null,
      email_last_error: message.slice(0, 1000),
    })

    await writeDeliveryLog({
      ids,
      userId: first.user_id,
      email,
      type: first.type,
      subject,
      status: 'failed',
      error: message.slice(0, 1000),
    })

    console.error(`[email-worker] Failed for ${email}:`, message)
    return { status: 'failed' }
  }
}

async function sendTest(to) {
  const subject = 'СВОИ UGC — тест email-уведомлений'
  const heading = 'Email-уведомления подключены'
  const body = 'Это тестовое письмо. Новые предложения, сообщения и изменения по сделкам теперь смогут приходить на email.'
  const href = `${siteUrl}/dashboard/notifications`
  const rendered = renderEmail({
    subject,
    heading,
    body,
    buttonText: 'Открыть уведомления',
    href,
    preview: body,
  })

  const id = await sendSmtp({
    to,
    subject,
    html: rendered.html,
    text: rendered.text,
    messageKey: `svoi-test-${crypto.randomUUID()}`,
  })

  console.log(`[email-worker] Test email accepted by Mail.ru SMTP: ${id}`)
}

async function main() {
  const testIndex = process.argv.indexOf('--test-to')
  if (testIndex >= 0) {
    const email = process.argv[testIndex + 1]?.trim()
    if (!email) throw new Error('Укажите email после --test-to')
    await sendTest(email)
    return
  }

  const { data, error } = await admin.rpc('claim_email_notifications', {
    p_limit: batchLimit,
  })

  if (error) throw error

  const items = Array.isArray(data) ? data : []
  if (items.length === 0) {
    console.log('[email-worker] Queue is empty')
    return
  }

  const groups = groupNotifications(items)
  const userCache = new Map()
  const totals = { sent: 0, skipped: 0, suppressed: 0, failed: 0 }

  for (const group of groups) {
    const result = await processGroup(group, userCache)
    totals[result.status] = (totals[result.status] || 0) + 1
  }

  console.log('[email-worker] Done', totals)
}

main().catch(error => {
  console.error('[email-worker] Fatal:', error)
  process.exit(1)
})
