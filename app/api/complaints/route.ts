import { NextRequest } from 'next/server'
import {
  ComplaintApiError,
  cleanComplaintText,
  cleanComplaintUuid,
  complaintError,
  complaintJson,
  readComplaintBody,
  requireComplaintUser,
} from '@/lib/complaints/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEAL_REASONS = new Set([
  'Нарушение договорённостей',
  'Пользователь не отвечает',
  'Оскорбления или давление',
  'Подозрение на мошенничество',
  'Проблема с оплатой',
  'Спам или нежелательный контент',
  'Техническая проблема',
  'Другое',
])

const PROFILE_REASONS = new Set([
  'Спам или мошенничество',
  'Неадекватное поведение',
  'Фейковый профиль',
  'Неприемлемый контент',
  'Другое',
])

const OPEN_COMPLAINT_STATUSES = ['new', 'in_progress', 'waiting_user']

async function createDealComplaint(request: NextRequest, body: Record<string, unknown>) {
  const context = await requireComplaintUser(request)
  const requestId = cleanComplaintUuid(body.requestId, 'ID сделки')
  const reason = cleanComplaintText(body.reason, 120, true)
  const comment = cleanComplaintText(body.comment, 1000)

  if (!reason || !DEAL_REASONS.has(reason)) {
    throw new ComplaintApiError(400, 'INVALID_REASON', 'Выберите причину из списка.')
  }
  if (reason === 'Другое' && (!comment || comment.length < 10)) {
    throw new ComplaintApiError(400, 'COMMENT_REQUIRED', 'Для причины «Другое» опишите ситуацию минимум в 10 символах.')
  }

  const { data: deal, error: dealError } = await context.admin
    .from('requests')
    .select('id, business_id, author_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (dealError) throw dealError
  if (!deal) throw new ComplaintApiError(404, 'DEAL_NOT_FOUND', 'Сделка не найдена.')

  const { data: author, error: authorError } = await context.admin
    .from('authors')
    .select('id, user_id')
    .eq('id', deal.author_id)
    .maybeSingle()

  if (authorError) throw authorError
  if (!author) throw new ComplaintApiError(404, 'AUTHOR_NOT_FOUND', 'Автор сделки не найден.')

  const reporterIsBusiness = deal.business_id === context.user.id
  const reporterIsAuthor = author.user_id === context.user.id
  if (!reporterIsBusiness && !reporterIsAuthor) {
    throw new ComplaintApiError(403, 'NOT_DEAL_PARTICIPANT', 'Жалобу может отправить только участник этой сделки.')
  }

  const { data: existing, error: existingError } = await context.admin
    .from('complaints')
    .select('id, status')
    .eq('reporter_id', context.user.id)
    .eq('request_id', requestId)
    .in('status', OPEN_COMPLAINT_STATUSES)
    .limit(1)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) {
    throw new ComplaintApiError(409, 'COMPLAINT_ALREADY_OPEN', `По этой сделке уже есть открытая жалоба №${existing.id.slice(0, 8).toUpperCase()}.`)
  }

  const { data: complaint, error: insertError } = await context.admin
    .from('complaints')
    .insert({
      reporter_id: context.user.id,
      request_id: requestId,
      target_author_id: reporterIsBusiness ? deal.author_id : null,
      target_business_id: reporterIsAuthor ? deal.business_id : null,
      reason,
      comment,
      status: 'new',
    })
    .select('id, status, created_at')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      throw new ComplaintApiError(409, 'COMPLAINT_ALREADY_OPEN', 'По этой сделке уже есть открытая жалоба.')
    }
    throw insertError
  }

  return complaintJson({
    ok: true,
    complaint: { ...complaint, number: complaint.id.slice(0, 8).toUpperCase() },
  }, { status: 201 })
}

async function createProfileComplaint(request: NextRequest, body: Record<string, unknown>) {
  const context = await requireComplaintUser(request)
  const authorId = cleanComplaintUuid(body.authorId, 'ID автора')
  const reason = cleanComplaintText(body.reason, 120, true)
  const comment = cleanComplaintText(body.comment, 1000)

  if (!reason || !PROFILE_REASONS.has(reason)) {
    throw new ComplaintApiError(400, 'INVALID_REASON', 'Выберите причину из списка.')
  }
  if (reason === 'Другое' && (!comment || comment.length < 10)) {
    throw new ComplaintApiError(400, 'COMMENT_REQUIRED', 'Для причины «Другое» опишите ситуацию минимум в 10 символах.')
  }

  const { data: author, error: authorError } = await context.admin
    .from('authors')
    .select('id, user_id, status')
    .eq('id', authorId)
    .maybeSingle()

  if (authorError) throw authorError
  if (!author || author.status !== 'approved') {
    throw new ComplaintApiError(404, 'AUTHOR_NOT_FOUND', 'Профиль автора не найден.')
  }
  if (author.user_id === context.user.id) {
    throw new ComplaintApiError(400, 'SELF_REPORT', 'Нельзя пожаловаться на собственный профиль.')
  }

  const { data: existing, error: existingError } = await context.admin
    .from('complaints')
    .select('id, status')
    .eq('reporter_id', context.user.id)
    .is('request_id', null)
    .eq('target_author_id', authorId)
    .in('status', OPEN_COMPLAINT_STATUSES)
    .limit(1)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) {
    throw new ComplaintApiError(409, 'COMPLAINT_ALREADY_OPEN', `На этот профиль уже есть открытая жалоба №${existing.id.slice(0, 8).toUpperCase()}.`)
  }

  const { data: complaint, error: insertError } = await context.admin
    .from('complaints')
    .insert({
      reporter_id: context.user.id,
      request_id: null,
      target_author_id: authorId,
      target_business_id: null,
      reason,
      comment,
      status: 'new',
    })
    .select('id, status, created_at')
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      throw new ComplaintApiError(409, 'COMPLAINT_ALREADY_OPEN', 'На этот профиль уже есть открытая жалоба.')
    }
    throw insertError
  }

  return complaintJson({
    ok: true,
    complaint: { ...complaint, number: complaint.id.slice(0, 8).toUpperCase() },
  }, { status: 201 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await readComplaintBody(request)
    const kind = body.kind === 'profile' ? 'profile' : 'deal'
    return kind === 'profile'
      ? await createProfileComplaint(request, body)
      : await createDealComplaint(request, body)
  } catch (error) {
    return complaintError(error)
  }
}
