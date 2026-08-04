import { NextRequest } from 'next/server'
import {
  AdminApiError,
  adminError,
  adminJson,
  cleanInteger,
  cleanText,
  cleanUuid,
  readJsonBody,
  requireAdmin,
  isAdminUserId,
  writeAudit,
  writeAuditStrict,
} from '@/lib/admin/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AUTHOR_STATUSES = new Set(['pending', 'approved', 'rejected'])
const COMPLAINT_STATUSES = new Set(['new', 'in_progress', 'waiting_user', 'resolved', 'closed'])

function cleanLifestyle(value: unknown) {
  if (!Array.isArray(value)) throw new AdminApiError(400, 'INVALID_FIELD', 'Тематики должны быть массивом.')
  if (value.length > 15) throw new AdminApiError(400, 'INVALID_FIELD', 'Можно указать не больше 15 тематик.')
  return value.map(item => {
    const text = cleanText(item, 60, false)
    if (!text) throw new AdminApiError(400, 'INVALID_FIELD', 'Пустая тематика недопустима.')
    return text
  })
}

async function updateAuthor(context: Awaited<ReturnType<typeof requireAdmin>>, body: Record<string, unknown>) {
  const authorId = cleanUuid(body.authorId, 'ID автора')
  const fields = body.fields
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new AdminApiError(400, 'INVALID_FIELDS', 'Не переданы поля автора.')
  }

  const source = fields as Record<string, unknown>
  const update: Record<string, unknown> = {}

  if ('name' in source) update.name = cleanText(source.name, 100, false)
  if ('city' in source) update.city = cleanText(source.city, 100, false)
  if ('instagram_url' in source) update.instagram_url = cleanText(source.instagram_url, 500) || ''
  if ('telegram_url' in source) update.telegram_url = cleanText(source.telegram_url, 500)
  if ('followers_count' in source) update.followers_count = cleanInteger(source.followers_count, 0, 1_000_000_000)
  if ('telegram_followers' in source) update.telegram_followers = cleanInteger(source.telegram_followers, 0, 1_000_000_000)
  if ('stories_views' in source) update.stories_views = cleanInteger(source.stories_views, 0, 1_000_000_000)
  if ('occupation' in source) update.occupation = cleanText(source.occupation, 200)
  if ('lifestyle' in source) update.lifestyle = cleanLifestyle(source.lifestyle)
  if ('hobbies' in source) update.hobbies = cleanText(source.hobbies, 500)
  if ('bio' in source) update.bio = cleanText(source.bio, 2000)
  if ('open_to_barter' in source) {
    if (typeof source.open_to_barter !== 'boolean') throw new AdminApiError(400, 'INVALID_FIELD', 'Некорректное значение бартера.')
    update.open_to_barter = source.open_to_barter
  }
  if ('avatar_url' in source) update.avatar_url = cleanText(source.avatar_url, 1000)
  if ('status' in source) {
    if (typeof source.status !== 'string' || !AUTHOR_STATUSES.has(source.status)) {
      throw new AdminApiError(400, 'INVALID_STATUS', 'Некорректный статус автора.')
    }
    update.status = source.status
  }
  if ('rejection_reason' in source) update.rejection_reason = cleanText(source.rejection_reason, 1000)

  if (!Object.keys(update).length) throw new AdminApiError(400, 'EMPTY_UPDATE', 'Нет изменений для сохранения.')

  const { data: before, error: beforeError } = await context.admin.from('authors').select('*').eq('id', authorId).maybeSingle()
  if (beforeError) throw beforeError
  if (!before) throw new AdminApiError(404, 'AUTHOR_NOT_FOUND', 'Автор не найден.')

  const { data, error } = await context.admin.from('authors').update(update).eq('id', authorId).select().single()
  if (error) throw error

  await writeAudit(context, 'author.update', 'author', authorId, cleanText(body.reason, 500), {
    changedFields: Object.keys(update),
    beforeStatus: before.status,
    afterStatus: data.status,
  })

  return { ok: true, author: data }
}

async function updateBusiness(context: Awaited<ReturnType<typeof requireAdmin>>, body: Record<string, unknown>) {
  const userId = cleanUuid(body.userId, 'ID бизнеса')
  const fields = body.fields
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) throw new AdminApiError(400, 'INVALID_FIELDS', 'Не переданы данные бизнеса.')
  const source = fields as Record<string, unknown>

  const update: Record<string, unknown> = { id: userId }
  if ('company_name' in source) update.company_name = cleanText(source.company_name, 200)
  if ('website_url' in source) update.website_url = cleanText(source.website_url, 500)
  if ('niche' in source) update.niche = cleanText(source.niche, 200)
  if ('description' in source) update.description = cleanText(source.description, 2000)
  if ('inn' in source) update.inn = cleanText(source.inn, 20)
  if ('avatar_url' in source) update.avatar_url = cleanText(source.avatar_url, 1000)
  update.updated_at = new Date().toISOString()

  const [{ data: profile }, { data: existingBusiness }] = await Promise.all([
    context.admin.from('profiles').select('role').eq('id', userId).maybeSingle(),
    context.admin.from('business_profiles').select('id').eq('id', userId).maybeSingle(),
  ])
  if (profile?.role !== 'business' && profile?.role !== 'admin' && !existingBusiness) {
    throw new AdminApiError(400, 'NOT_BUSINESS', 'Выбранный аккаунт не является бизнесом.')
  }

  const { data, error } = await context.admin.from('business_profiles').upsert(update).select().single()
  if (error) throw error

  await writeAudit(context, 'business.update', 'user', userId, cleanText(body.reason, 500), {
    changedFields: Object.keys(update).filter(key => !['id', 'updated_at'].includes(key)),
  })

  return { ok: true, business: data }
}

async function updateComplaint(context: Awaited<ReturnType<typeof requireAdmin>>, body: Record<string, unknown>) {
  const complaintId = cleanUuid(body.complaintId, 'ID жалобы')
  const status = body.status
  if (typeof status !== 'string' || !COMPLAINT_STATUSES.has(status)) {
    throw new AdminApiError(400, 'INVALID_STATUS', 'Некорректный статус жалобы.')
  }

  const adminNote = cleanText(body.adminNote, 2000)
  const { data: before, error: beforeError } = await context.admin
    .from('complaints')
    .select('id, status, assigned_admin_id')
    .eq('id', complaintId)
    .maybeSingle()

  if (beforeError) throw beforeError
  if (!before) throw new AdminApiError(404, 'COMPLAINT_NOT_FOUND', 'Жалоба не найдена.')

  const { data, error } = await context.admin.from('complaints').update({
    status,
    admin_note: adminNote,
    assigned_admin_id: context.user.id,
    updated_at: new Date().toISOString(),
  }).eq('id', complaintId).select().single()
  if (error) throw error

  await writeAudit(context, 'complaint.update', 'complaint', complaintId, adminNote, {
    beforeStatus: before.status,
    afterStatus: status,
  })
  return { ok: true, complaint: data }
}

async function openComplaintChat(context: Awaited<ReturnType<typeof requireAdmin>>, body: Record<string, unknown>) {
  const complaintId = cleanUuid(body.complaintId, 'ID жалобы')
  const reason = cleanText(body.reason, 500, false)
  if (!reason || reason.length < 10) {
    throw new AdminApiError(400, 'REASON_REQUIRED', 'Укажите причину просмотра переписки минимум в 10 символах.')
  }

  const { data: complaint, error: complaintError } = await context.admin
    .from('complaints')
    .select('id, request_id, reason, status, assigned_admin_id')
    .eq('id', complaintId)
    .maybeSingle()
  if (complaintError) throw complaintError
  if (!complaint) throw new AdminApiError(404, 'COMPLAINT_NOT_FOUND', 'Жалоба не найдена.')
  if (!complaint.request_id) throw new AdminApiError(400, 'NO_LINKED_CHAT', 'Эта жалоба не привязана к переписке.')

  const [requestResult, messagesResult, profilesResult, authorsResult] = await Promise.all([
    context.admin.from('requests').select('id, business_id, business_email, author_id, message, budget, deadline, status, created_at').eq('id', complaint.request_id).maybeSingle(),
    context.admin.from('messages').select('id, request_id, sender_id, sender_role, text, created_at, read').eq('request_id', complaint.request_id).order('created_at', { ascending: false }).limit(1000),
    context.admin.from('profiles').select('id, email').range(0, 4999),
    context.admin.from('authors').select('id, name, user_id').range(0, 4999),
  ])

  if (requestResult.error) throw requestResult.error
  if (messagesResult.error) throw messagesResult.error
  if (profilesResult.error) throw profilesResult.error
  if (authorsResult.error) throw authorsResult.error
  if (!requestResult.data) throw new AdminApiError(404, 'REQUEST_NOT_FOUND', 'Связанная сделка не найдена.')

  const emailById = new Map((profilesResult.data || []).map(item => [item.id, item.email]))
  const authorByUserId = new Map((authorsResult.data || []).filter(item => item.user_id).map(item => [item.user_id, item]))
  const rawMessages = messagesResult.data || []

  // Для чтения личной переписки запись в журнал обязательна.
  // Если журнал недоступен, сообщения не возвращаются в браузер.
  await writeAuditStrict(context, 'complaint.chat_open', 'complaint', complaintId, reason, {
    requestId: complaint.request_id,
    messageCount: rawMessages.length,
    complaintStatus: complaint.status,
  })

  const nextStatus = complaint.status === 'new' ? 'in_progress' : complaint.status
  const { data: updatedComplaint, error: updateError } = await context.admin
    .from('complaints')
    .update({
      status: nextStatus,
      assigned_admin_id: context.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', complaintId)
    .select('id, status, assigned_admin_id, updated_at')
    .single()

  if (updateError) throw updateError

  return {
    ok: true,
    complaint: updatedComplaint,
    request: requestResult.data,
    truncated: rawMessages.length === 1000,
    messages: rawMessages.reverse().map(message => ({
      id: message.id,
      sender_id: message.sender_id,
      sender_role: message.sender_role,
      text: message.text,
      created_at: message.created_at,
      sender_name: message.sender_role === 'author'
        ? (authorByUserId.get(message.sender_id)?.name || 'Автор')
        : (emailById.get(message.sender_id) || 'Бизнес'),
    })),
  }
}

async function setUserBlock(context: Awaited<ReturnType<typeof requireAdmin>>, body: Record<string, unknown>, blocked: boolean) {
  const userId = cleanUuid(body.userId, 'ID пользователя')
  const reason = cleanText(body.reason, 500, blocked)
  if (userId === context.user.id) throw new AdminApiError(400, 'CANNOT_BLOCK_SELF', 'Нельзя заблокировать собственный аккаунт.')

  const { data: profile, error: profileError } = await context.admin.from('profiles').select('role, email').eq('id', userId).maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new AdminApiError(404, 'USER_NOT_FOUND', 'Пользователь не найден.')
  if (profile.role === 'admin' || isAdminUserId(userId)) {
    throw new AdminApiError(403, 'ADMIN_PROTECTED', 'Администраторов нельзя блокировать из интерфейса.')
  }

  const { data, error } = await context.admin.auth.admin.updateUserById(userId, {
    ban_duration: blocked ? '876000h' : 'none',
  })
  if (error) throw error

  await writeAudit(context, blocked ? 'user.block' : 'user.unblock', 'user', userId, reason, {
    email: profile.email,
    bannedUntil: data.user?.banned_until || null,
  })

  return { ok: true, userId, blocked, banned_until: data.user?.banned_until || null }
}

async function enableAdminMfa(context: Awaited<ReturnType<typeof requireAdmin>>) {
  if (context.aal !== 'aal2') {
    throw new AdminApiError(403, 'MFA_NOT_VERIFIED', 'Сначала подтвердите код из приложения-аутентификатора.')
  }

  const { error } = await context.admin.from('admin_security').upsert({
    admin_id: context.user.id,
    mfa_required: true,
    enabled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) throw error

  await writeAudit(context, 'admin.mfa_enable', 'user', context.user.id, 'Администратор включил обязательную двухфакторную аутентификацию')
  return { ok: true, mfaRequired: true }
}

async function addNote(context: Awaited<ReturnType<typeof requireAdmin>>, body: Record<string, unknown>) {
  const targetType = body.targetType
  if (typeof targetType !== 'string' || !['user', 'author', 'request', 'complaint'].includes(targetType)) {
    throw new AdminApiError(400, 'INVALID_TARGET', 'Некорректный тип заметки.')
  }
  const targetId = cleanUuid(body.targetId, 'ID объекта')
  const note = cleanText(body.note, 2000, false)
  if (!note) throw new AdminApiError(400, 'EMPTY_NOTE', 'Введите текст заметки.')

  const { data, error } = await context.admin.from('admin_notes').insert({
    target_type: targetType,
    target_id: targetId,
    note,
    created_by: context.user.id,
  }).select().single()
  if (error) throw error

  await writeAudit(context, 'note.create', targetType, targetId, null, { noteId: data.id })
  return { ok: true, note: data }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireAdmin(request)
    const body = await readJsonBody(request)
    const action = body.action

    const result = action === 'update_author' ? await updateAuthor(context, body)
      : action === 'update_business' ? await updateBusiness(context, body)
      : action === 'update_complaint' ? await updateComplaint(context, body)
      : action === 'open_complaint_chat' ? await openComplaintChat(context, body)
      : action === 'block_user' ? await setUserBlock(context, body, true)
      : action === 'unblock_user' ? await setUserBlock(context, body, false)
      : action === 'add_note' ? await addNote(context, body)
      : action === 'enable_admin_mfa' ? await enableAdminMfa(context)
      : (() => { throw new AdminApiError(400, 'UNKNOWN_ACTION', 'Неизвестное действие администратора.') })()

    return adminJson(result)
  } catch (error) {
    return adminError(error)
  }
}
