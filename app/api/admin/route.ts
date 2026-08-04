import type { User } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { adminError, adminJson, requireAdmin } from '@/lib/admin/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DAY = 86_400_000

function dateKey(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalize(value: string | null) {
  return (value || '').trim().toLowerCase()
}

async function listAuthUsers(admin: Awaited<ReturnType<typeof requireAdmin>>['admin']) {
  const users: User[] = []
  const perPage = 1000

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < perPage) break
  }

  return users
}

async function getOverview(admin: Awaited<ReturnType<typeof requireAdmin>>['admin']) {
  const since30 = new Date(Date.now() - 30 * DAY).toISOString()

  const [profilesResult, authorsResult, requestsResult, complaintsResult, viewsResult] = await Promise.all([
    admin.from('profiles').select('id, email, role, created_at').order('created_at', { ascending: false }),
    admin.from('authors').select('id, user_id, name, status, created_at').order('created_at', { ascending: false }),
    admin.from('requests').select('id, business_id, author_id, status, created_at').order('created_at', { ascending: false }),
    admin.from('complaints').select('id, reporter_id, target_author_id, target_business_id, request_id, reason, status, created_at').order('created_at', { ascending: false }),
    admin.from('profile_views').select('id, created_at').gte('created_at', since30),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (authorsResult.error) throw authorsResult.error
  if (requestsResult.error) throw requestsResult.error
  if (complaintsResult.error) throw complaintsResult.error

  const profiles = profilesResult.data || []
  const authors = authorsResult.data || []
  const requests = requestsResult.data || []
  const complaints = complaintsResult.data || []
  const profileViews30d = viewsResult.error ? 0 : (viewsResult.data?.length || 0)

  const now = Date.now()
  const inDays = (createdAt: string, days: number) => new Date(createdAt).getTime() >= now - days * DAY

  const registrationSeries = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now - (13 - index) * DAY)
    const key = date.toISOString().slice(0, 10)
    return {
      date: key,
      count: profiles.filter(item => dateKey(item.created_at) === key).length,
    }
  })

  const dealStatuses = ['new', 'viewed', 'accepted', 'declined', 'cancelled', 'completed']
    .map(status => ({ status, count: requests.filter(item => item.status === status).length }))

  return {
    ok: true,
    metrics: {
      users: profiles.length,
      authors: profiles.filter(item => item.role === 'author').length,
      businesses: profiles.filter(item => item.role === 'business').length,
      registrationsToday: profiles.filter(item => inDays(item.created_at, 1)).length,
      registrations7d: profiles.filter(item => inDays(item.created_at, 7)).length,
      registrations30d: profiles.filter(item => inDays(item.created_at, 30)).length,
      pendingAuthors: authors.filter(item => item.status === 'pending').length,
      testAuthors: authors.filter(item => !item.user_id && item.status === 'approved').length,
      deals: requests.length,
      activeDeals: requests.filter(item => ['new', 'viewed', 'accepted'].includes(item.status || '')).length,
      completedDeals: requests.filter(item => item.status === 'completed').length,
      newComplaints: complaints.filter(item => item.status === 'new').length,
      profileViews30d,
    },
    registrationSeries,
    dealStatuses,
    recentUsers: profiles.slice(0, 8),
    recentComplaints: complaints.slice(0, 6),
  }
}

async function getUsers(admin: Awaited<ReturnType<typeof requireAdmin>>['admin'], request: NextRequest) {
  const params = request.nextUrl.searchParams
  const search = normalize(params.get('search'))
  const role = normalize(params.get('role'))
  const page = clamp(Number(params.get('page') || 1) || 1, 1, 1000)
  const perPage = clamp(Number(params.get('perPage') || 50) || 50, 10, 100)

  const [profilesResult, authorsResult, businessesResult, requestsResult, notesResult, authUsers] = await Promise.all([
    admin.from('profiles').select('id, email, role, created_at').order('created_at', { ascending: false }).range(0, 4999),
    admin.from('authors').select('id, user_id, name, city, status, created_at').not('user_id', 'is', null).range(0, 4999),
    admin.from('business_profiles').select('id, company_name, niche, website_url, description, inn, avatar_url').range(0, 4999),
    admin.from('requests').select('id, business_id, author_id, status').range(0, 19999),
    admin.from('admin_notes').select('target_id').eq('target_type', 'user').range(0, 19999),
    listAuthUsers(admin),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (authorsResult.error) throw authorsResult.error
  if (businessesResult.error) throw businessesResult.error
  if (requestsResult.error) throw requestsResult.error

  const authors = authorsResult.data || []
  const businesses = businessesResult.data || []
  const deals = requestsResult.data || []
  const authById = new Map(authUsers.map(user => [user.id, user]))
  const authorByUserId = new Map(authors.map(author => [author.user_id, author]))
  const businessById = new Map(businesses.map(business => [business.id, business]))
  const noteCounts = new Map<string, number>()
  for (const note of notesResult.data || []) noteCounts.set(note.target_id, (noteCounts.get(note.target_id) || 0) + 1)

  const users = (profilesResult.data || []).map(profile => {
    const authUser = authById.get(profile.id)
    const author = authorByUserId.get(profile.id)
    const business = businessById.get(profile.id)
    const userDeals = deals.filter(item => item.business_id === profile.id || (author && item.author_id === author.id))
    const bannedUntil = authUser?.banned_until || null
    const isBlocked = !!bannedUntil && new Date(bannedUntil).getTime() > Date.now()

    return {
      id: profile.id,
      email: profile.email || authUser?.email || '',
      role: profile.role,
      created_at: profile.created_at || authUser?.created_at || '',
      last_sign_in_at: authUser?.last_sign_in_at || null,
      email_confirmed_at: authUser?.email_confirmed_at || null,
      banned_until: bannedUntil,
      is_blocked: isBlocked,
      author: author ? {
        id: author.id,
        name: author.name,
        city: author.city,
        status: author.status,
      } : null,
      business: business ? {
        company_name: business.company_name,
        niche: business.niche,
        website_url: business.website_url,
        description: business.description,
        inn: business.inn,
        avatar_url: business.avatar_url,
      } : null,
      deals_count: userDeals.length,
      active_deals_count: userDeals.filter(item => ['new', 'viewed', 'accepted'].includes(item.status || '')).length,
      notes_count: noteCounts.get(profile.id) || 0,
    }
  })

  const filtered = users.filter(user => {
    if (role && role !== 'all' && user.role !== role) return false
    if (!search) return true
    return [
      user.email,
      user.role,
      user.author?.name,
      user.author?.city,
      user.business?.company_name,
      user.business?.niche,
    ].some(value => normalize(value || '').includes(search))
  })

  const start = (page - 1) * perPage
  return {
    ok: true,
    items: filtered.slice(start, start + perPage),
    total: filtered.length,
    page,
    perPage,
  }
}

async function getAuthors(admin: Awaited<ReturnType<typeof requireAdmin>>['admin'], request: NextRequest) {
  const params = request.nextUrl.searchParams
  const search = normalize(params.get('search'))
  const status = normalize(params.get('status'))

  const [authorsResult, profilesResult, requestsResult, viewsResult] = await Promise.all([
    admin.from('authors').select('id, user_id, name, city, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, status, rejection_reason, avatar_url, completed_deals_count, avg_rating, reviews_count, created_at').order('created_at', { ascending: false }).range(0, 4999),
    admin.from('profiles').select('id, email').range(0, 4999),
    admin.from('requests').select('author_id, status').range(0, 19999),
    admin.from('profile_views').select('author_id').range(0, 49999),
  ])

  if (authorsResult.error) throw authorsResult.error
  if (profilesResult.error) throw profilesResult.error
  if (requestsResult.error) throw requestsResult.error

  const emailById = new Map((profilesResult.data || []).map(item => [item.id, item.email]))
  const dealCounts = new Map<string, { total: number; active: number; completed: number }>()
  for (const deal of requestsResult.data || []) {
    const counts = dealCounts.get(deal.author_id) || { total: 0, active: 0, completed: 0 }
    counts.total += 1
    if (['new', 'viewed', 'accepted'].includes(deal.status || '')) counts.active += 1
    if (deal.status === 'completed') counts.completed += 1
    dealCounts.set(deal.author_id, counts)
  }
  const viewCounts = new Map<string, number>()
  for (const view of viewsResult.data || []) viewCounts.set(view.author_id, (viewCounts.get(view.author_id) || 0) + 1)

  const items = (authorsResult.data || []).map(author => ({
    ...author,
    email: author.user_id ? (emailById.get(author.user_id) || null) : null,
    is_test: !author.user_id,
    profile_views: viewCounts.get(author.id) || 0,
    deal_stats: dealCounts.get(author.id) || { total: 0, active: 0, completed: 0 },
  })).filter(author => {
    if (status && status !== 'all' && author.status !== status) return false
    if (!search) return true
    return [author.name, author.city, author.email, author.occupation, author.bio, author.instagram_url]
      .some(value => normalize(value || '').includes(search))
  })

  return { ok: true, items, total: items.length }
}

async function getDeals(admin: Awaited<ReturnType<typeof requireAdmin>>['admin'], request: NextRequest) {
  const params = request.nextUrl.searchParams
  const search = normalize(params.get('search'))
  const status = normalize(params.get('status'))

  const [requestsResult, authorsResult, profilesResult, businessesResult, messagesResult, complaintsResult] = await Promise.all([
    admin.from('requests').select('id, business_id, business_email, author_id, message, budget, deadline, status, cancel_requested_by, created_at').order('created_at', { ascending: false }).range(0, 4999),
    admin.from('authors').select('id, name, city, user_id').range(0, 4999),
    admin.from('profiles').select('id, email').range(0, 4999),
    admin.from('business_profiles').select('id, company_name').range(0, 4999),
    admin.from('messages').select('request_id, created_at').order('created_at', { ascending: false }).range(0, 49999),
    admin.from('complaints').select('request_id, status').not('request_id', 'is', null).range(0, 19999),
  ])

  if (requestsResult.error) throw requestsResult.error
  if (authorsResult.error) throw authorsResult.error
  if (profilesResult.error) throw profilesResult.error

  const authorById = new Map((authorsResult.data || []).map(item => [item.id, item]))
  const profileById = new Map((profilesResult.data || []).map(item => [item.id, item]))
  const businessById = new Map((businessesResult.data || []).map(item => [item.id, item]))
  const messageStats = new Map<string, { count: number; last_at: string | null }>()
  for (const message of messagesResult.data || []) {
    const existing = messageStats.get(message.request_id) || { count: 0, last_at: null }
    existing.count += 1
    if (!existing.last_at) existing.last_at = message.created_at
    messageStats.set(message.request_id, existing)
  }
  const complaintCounts = new Map<string, number>()
  for (const complaint of complaintsResult.data || []) {
    if (!complaint.request_id) continue
    complaintCounts.set(complaint.request_id, (complaintCounts.get(complaint.request_id) || 0) + 1)
  }

  const items = (requestsResult.data || []).map(deal => {
    const author = authorById.get(deal.author_id)
    const business = businessById.get(deal.business_id)
    const businessProfile = profileById.get(deal.business_id)
    return {
      ...deal,
      author: author ? { id: author.id, name: author.name, city: author.city, is_test: !author.user_id } : null,
      business: {
        id: deal.business_id,
        name: business?.company_name || businessProfile?.email || deal.business_email || 'Бизнес',
        email: businessProfile?.email || deal.business_email || null,
      },
      messages_count: messageStats.get(deal.id)?.count || 0,
      last_message_at: messageStats.get(deal.id)?.last_at || null,
      complaints_count: complaintCounts.get(deal.id) || 0,
    }
  }).filter(deal => {
    if (status && status !== 'all' && deal.status !== status) return false
    if (!search) return true
    return [deal.author?.name, deal.business.name, deal.business.email, deal.message, deal.budget]
      .some(value => normalize(value || '').includes(search))
  })

  return { ok: true, items, total: items.length }
}

async function getComplaints(admin: Awaited<ReturnType<typeof requireAdmin>>['admin'], request: NextRequest) {
  const params = request.nextUrl.searchParams
  const search = normalize(params.get('search'))
  const status = normalize(params.get('status'))

  const [complaintsResult, profilesResult, authorsResult, businessesResult, requestsResult] = await Promise.all([
    admin.from('complaints').select('id, reporter_id, target_author_id, target_business_id, request_id, reason, comment, status, admin_note, assigned_admin_id, created_at, updated_at').order('created_at', { ascending: false }).range(0, 4999),
    admin.from('profiles').select('id, email, role').range(0, 4999),
    admin.from('authors').select('id, name, city').range(0, 4999),
    admin.from('business_profiles').select('id, company_name').range(0, 4999),
    admin.from('requests').select('id, business_id, author_id, status').range(0, 4999),
  ])

  if (complaintsResult.error) throw complaintsResult.error
  if (profilesResult.error) throw profilesResult.error

  const profileById = new Map((profilesResult.data || []).map(item => [item.id, item]))
  const authorById = new Map((authorsResult.data || []).map(item => [item.id, item]))
  const businessById = new Map((businessesResult.data || []).map(item => [item.id, item]))
  const requestById = new Map((requestsResult.data || []).map(item => [item.id, item]))

  const items = (complaintsResult.data || []).map(item => {
    const deal = item.request_id ? requestById.get(item.request_id) : null
    const targetAuthorId = item.target_author_id || deal?.author_id || null
    const targetBusinessId = item.target_business_id || deal?.business_id || null
    return {
      ...item,
      reporter: profileById.get(item.reporter_id) || null,
      target_author: targetAuthorId ? (authorById.get(targetAuthorId) || null) : null,
      target_business: targetBusinessId ? {
        id: targetBusinessId,
        name: businessById.get(targetBusinessId)?.company_name || profileById.get(targetBusinessId)?.email || 'Бизнес',
      } : null,
      deal: deal || null,
      assigned_admin_email: item.assigned_admin_id ? profileById.get(item.assigned_admin_id)?.email || null : null,
    }
  }).filter(item => {
    if (status && status !== 'all' && item.status !== status) return false
    if (!search) return true
    return [
      item.reason,
      item.comment,
      item.admin_note,
      item.reporter?.email,
      item.target_author?.name,
      item.target_business?.name,
    ].some(value => normalize(value || '').includes(search))
  })

  return { ok: true, items, total: items.length }
}

async function getAudit(admin: Awaited<ReturnType<typeof requireAdmin>>['admin'], request: NextRequest) {
  const search = normalize(request.nextUrl.searchParams.get('search'))
  const [logsResult, profilesResult] = await Promise.all([
    admin.from('admin_audit_log').select('id, admin_id, action, entity_type, entity_id, reason, metadata, ip_address, created_at').order('created_at', { ascending: false }).limit(500),
    admin.from('profiles').select('id, email').range(0, 4999),
  ])

  if (logsResult.error) throw logsResult.error
  if (profilesResult.error) throw profilesResult.error

  const emailById = new Map((profilesResult.data || []).map(item => [item.id, item.email]))
  const items = (logsResult.data || []).map(item => ({
    ...item,
    admin_email: emailById.get(item.admin_id) || item.admin_id,
  })).filter(item => !search || [item.action, item.entity_type, item.reason, item.admin_email]
    .some(value => normalize(value || '').includes(search)))

  return { ok: true, items, total: items.length }
}

async function getNotes(admin: Awaited<ReturnType<typeof requireAdmin>>['admin'], request: NextRequest) {
  const targetType = normalize(request.nextUrl.searchParams.get('targetType'))
  const targetId = request.nextUrl.searchParams.get('targetId') || ''
  if (!['user', 'author', 'request', 'complaint'].includes(targetType) || !targetId) {
    return { ok: true, items: [] }
  }

  const [notesResult, profilesResult] = await Promise.all([
    admin.from('admin_notes').select('id, target_type, target_id, note, created_by, created_at').eq('target_type', targetType).eq('target_id', targetId).order('created_at', { ascending: false }),
    admin.from('profiles').select('id, email').range(0, 4999),
  ])
  if (notesResult.error) throw notesResult.error
  const emailById = new Map((profilesResult.data || []).map(item => [item.id, item.email]))
  return {
    ok: true,
    items: (notesResult.data || []).map(item => ({ ...item, created_by_email: emailById.get(item.created_by) || item.created_by })),
  }
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireAdmin(request)
    const section = request.nextUrl.searchParams.get('section') || 'overview'

    const data = section === 'overview' ? await getOverview(context.admin)
      : section === 'users' ? await getUsers(context.admin, request)
      : section === 'authors' ? await getAuthors(context.admin, request)
      : section === 'deals' ? await getDeals(context.admin, request)
      : section === 'complaints' ? await getComplaints(context.admin, request)
      : section === 'audit' ? await getAudit(context.admin, request)
      : section === 'notes' ? await getNotes(context.admin, request)
      : { ok: false, error: 'Неизвестный раздел.' }

    return adminJson({ ...data, security: { aal: context.aal, mfaRequired: context.mfaRequired } })
  } catch (error) {
    return adminError(error)
  }
}
