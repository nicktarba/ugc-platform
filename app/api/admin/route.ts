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

async function getOverview(admin: Awaited<ReturnType<typeof requireAdmin>>['admin'], request: NextRequest) {
  const requestedPeriod = Number(request.nextUrl.searchParams.get('period') || 30)
  const period = [7, 30, 90].includes(requestedPeriod) ? requestedPeriod : 30
  const now = Date.now()
  const periodStart = new Date(now - period * DAY).toISOString()
  const since30 = new Date(now - 30 * DAY).toISOString()
  const staleBefore = now - 7 * DAY

  const [profilesResult, authorsResult, businessesResult, requestsResult, complaintsResult, viewsResult, messagesResult, authUsers] = await Promise.all([
    admin.from('profiles').select('id, email, role, created_at').order('created_at', { ascending: false }).range(0, 9999),
    admin.from('authors').select('id, user_id, name, status, bio, avatar_url, instagram_url, telegram_url, created_at').order('created_at', { ascending: false }).range(0, 9999),
    admin.from('business_profiles').select('id, company_name, niche, website_url, description').range(0, 9999),
    admin.from('requests').select('id, business_id, business_email, author_id, status, deadline, created_at').order('created_at', { ascending: false }).range(0, 49999),
    admin.from('complaints').select('id, request_id, reason, status, created_at, updated_at').order('created_at', { ascending: false }).range(0, 19999),
    admin.from('profile_views').select('id, created_at').gte('created_at', since30).range(0, 49999),
    admin.from('messages').select('request_id, created_at').order('created_at', { ascending: false }).range(0, 49999),
    listAuthUsers(admin),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (authorsResult.error) throw authorsResult.error
  if (businessesResult.error) throw businessesResult.error
  if (requestsResult.error) throw requestsResult.error
  if (complaintsResult.error) throw complaintsResult.error

  const profiles = profilesResult.data || []
  const authors = authorsResult.data || []
  const businessProfiles = businessesResult.data || []
  const requests = requestsResult.data || []
  const complaints = complaintsResult.data || []
  const profileViews30d = viewsResult.error ? 0 : (viewsResult.data?.length || 0)
  const messages = messagesResult.error ? [] : (messagesResult.data || [])

  const authorAccounts = profiles.filter(item => item.role === 'author')
  const authorAccountIds = new Set(authorAccounts.map(item => item.id))
  const businessIds = new Set<string>()
  for (const profile of profiles) {
    if (profile.role === 'business' || profile.role === 'admin') businessIds.add(profile.id)
  }
  for (const business of businessProfiles) businessIds.add(business.id)

  const businessProfileById = new Map(businessProfiles.map(item => [item.id, item]))
  const authorById = new Map(authors.map(item => [item.id, item]))
  const profileById = new Map(profiles.map(item => [item.id, item]))
  const lastMessageByRequest = new Map<string, string>()
  for (const message of messages) {
    if (!lastMessageByRequest.has(message.request_id)) lastMessageByRequest.set(message.request_id, message.created_at)
  }

  const inDays = (createdAt: string | null | undefined, days: number) => {
    if (!createdAt) return false
    return new Date(createdAt).getTime() >= now - days * DAY
  }
  const percentage = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0

  const completedAuthorProfiles = authors.filter(item =>
    !!item.user_id && authorAccountIds.has(item.user_id) && item.status === 'approved' && !!item.name?.trim() && !!(
      item.bio?.trim() || item.avatar_url?.trim() || item.instagram_url?.trim() || item.telegram_url?.trim()
    )
  ).length
  const completedBusinessProfiles = businessProfiles.filter(item =>
    !!item.company_name?.trim() && !!(item.niche?.trim() || item.description?.trim() || item.website_url?.trim())
  ).length

  const businessesWithProposal = new Set(requests.filter(item => businessIds.has(item.business_id)).map(item => item.business_id)).size
  const acceptedOrCompleted = requests.filter(item => ['accepted', 'completed'].includes(item.status || '')).length
  const completedDeals = requests.filter(item => item.status === 'completed').length
  const activeDeals = requests.filter(item => ['new', 'viewed', 'accepted'].includes(item.status || ''))
  const openComplaintStatuses = new Set(['new', 'in_progress', 'waiting_user'])
  const openComplaints = complaints.filter(item => openComplaintStatuses.has(item.status || ''))
  const disputedRequestIds = new Set(openComplaints.map(item => item.request_id).filter(Boolean) as string[])

  const staleDeals = activeDeals.map(deal => {
    const lastActivityAt = lastMessageByRequest.get(deal.id) || deal.created_at
    const lastActivityTime = new Date(lastActivityAt).getTime()
    const deadlineTime = deal.deadline ? new Date(`${deal.deadline}T23:59:59`).getTime() : null
    const overdue = deadlineTime !== null && deadlineTime < now
    const inactive = Number.isFinite(lastActivityTime) && lastActivityTime < staleBefore
    if (!overdue && !inactive && !disputedRequestIds.has(deal.id)) return null

    const author = authorById.get(deal.author_id)
    const business = businessProfileById.get(deal.business_id)
    const businessProfile = profileById.get(deal.business_id)
    return {
      id: deal.id,
      status: deal.status || 'new',
      authorName: author?.name || 'Автор',
      businessName: business?.company_name || businessProfile?.email || deal.business_email || 'Бизнес',
      lastActivityAt,
      deadline: deal.deadline,
      daysInactive: Math.max(0, Math.floor((now - lastActivityTime) / DAY)),
      reason: disputedRequestIds.has(deal.id) ? 'complaint' : overdue ? 'overdue' : 'inactive',
    }
  }).filter(Boolean).sort((left, right) => {
    const priority = { complaint: 0, overdue: 1, inactive: 2 }
    const a = left as NonNullable<typeof left>
    const b = right as NonNullable<typeof right>
    return priority[a.reason as keyof typeof priority] - priority[b.reason as keyof typeof priority]
      || b.daysInactive - a.daysInactive
  }) as Array<{
    id: string
    status: string
    authorName: string
    businessName: string
    lastActivityAt: string
    deadline: string | null
    daysInactive: number
    reason: 'complaint' | 'overdue' | 'inactive'
  }>

  const bucketDays = period === 90 ? 3 : 1
  const bucketCount = Math.ceil(period / bucketDays)
  const activitySeries = Array.from({ length: bucketCount }, (_, index) => {
    const daysFromNow = (bucketCount - 1 - index) * bucketDays
    const bucketEnd = now - daysFromNow * DAY
    const bucketStart = bucketEnd - bucketDays * DAY
    const inBucket = (value: string) => {
      const time = new Date(value).getTime()
      return time >= bucketStart && time < bucketEnd
    }
    const startDate = new Date(bucketStart)
    return {
      date: startDate.toISOString().slice(0, 10),
      authors: authorAccounts.filter(item => inBucket(item.created_at)).length,
      businesses: profiles.filter(item => businessIds.has(item.id) && inBucket(item.created_at)).length,
      deals: requests.filter(item => inBucket(item.created_at)).length,
    }
  })

  const dealStatuses = ['new', 'viewed', 'accepted', 'declined', 'cancelled', 'completed']
    .map(status => ({ status, count: requests.filter(item => item.status === status).length }))

  const activeUsers7d = authUsers.filter(user => inDays(user.last_sign_in_at, 7)).length
  const activeUsers30d = authUsers.filter(user => inDays(user.last_sign_in_at, 30)).length
  const activeUsersPeriod = authUsers.filter(user => inDays(user.last_sign_in_at, period)).length

  return {
    ok: true,
    period,
    metrics: {
      users: profiles.length,
      authors: authorAccounts.length,
      authorProfiles: authors.length,
      businesses: businessIds.size,
      registrationsToday: profiles.filter(item => inDays(item.created_at, 1)).length,
      registrations7d: profiles.filter(item => inDays(item.created_at, 7)).length,
      registrations30d: profiles.filter(item => inDays(item.created_at, 30)).length,
      registrationsPeriod: profiles.filter(item => inDays(item.created_at, period)).length,
      activeUsers7d,
      activeUsers30d,
      activeUsersPeriod,
      pendingAuthors: authors.filter(item => item.status === 'pending').length,
      testAuthors: authors.filter(item => !item.user_id && item.status === 'approved').length,
      deals: requests.length,
      dealsPeriod: requests.filter(item => inDays(item.created_at, period)).length,
      activeDeals: activeDeals.length,
      completedDeals,
      newComplaints: complaints.filter(item => item.status === 'new').length,
      openComplaints: openComplaints.length,
      staleDeals: staleDeals.length,
      attentionDeals: new Set([...staleDeals.map(item => item.id), ...disputedRequestIds]).size,
      profileViews30d,
      businessesWithProposal,
      acceptedOrCompleted,
    },
    conversions: [
      { key: 'author_profile', label: 'Автор → заполненный профиль', value: percentage(completedAuthorProfiles, authorAccounts.length), numerator: completedAuthorProfiles, denominator: authorAccounts.length },
      { key: 'business_profile', label: 'Бизнес → заполненная карточка', value: percentage(completedBusinessProfiles, businessIds.size), numerator: completedBusinessProfiles, denominator: businessIds.size },
      { key: 'business_proposal', label: 'Бизнес → первое предложение', value: percentage(businessesWithProposal, businessIds.size), numerator: businessesWithProposal, denominator: businessIds.size },
      { key: 'proposal_acceptance', label: 'Предложение → принято или завершено', value: percentage(acceptedOrCompleted, requests.length), numerator: acceptedOrCompleted, denominator: requests.length },
      { key: 'accepted_completion', label: 'Принято → завершено', value: percentage(completedDeals, acceptedOrCompleted), numerator: completedDeals, denominator: acceptedOrCompleted },
    ],
    activitySeries,
    dealStatuses,
    staleDealItems: staleDeals.slice(0, 8),
    recentUsers: profiles.filter(item => new Date(item.created_at).getTime() >= new Date(periodStart).getTime()).slice(0, 8),
    recentComplaints: complaints.slice(0, 6),
  }
}

async function getBusinesses(admin: Awaited<ReturnType<typeof requireAdmin>>['admin'], request: NextRequest, adminUserId: string) {
  const params = request.nextUrl.searchParams
  const search = normalize(params.get('search'))
  const status = normalize(params.get('status'))
  const page = clamp(Number(params.get('page') || 1) || 1, 1, 1000)
  const perPage = clamp(Number(params.get('perPage') || 50) || 50, 10, 100)

  const [profilesResult, businessesResult, requestsResult, notesResult, authUsers] = await Promise.all([
    admin.from('profiles').select('id, email, role, created_at').order('created_at', { ascending: false }).range(0, 4999),
    admin.from('business_profiles').select('id, company_name, niche, website_url, description, inn, avatar_url').range(0, 4999),
    admin.from('requests').select('id, business_id, status').range(0, 19999),
    admin.from('admin_notes').select('target_id').eq('target_type', 'user').range(0, 19999),
    listAuthUsers(admin),
  ])

  if (profilesResult.error) throw profilesResult.error
  if (businessesResult.error) throw businessesResult.error
  if (requestsResult.error) throw requestsResult.error
  if (notesResult.error) throw notesResult.error

  const businesses = businessesResult.data || []
  const deals = requestsResult.data || []
  const authById = new Map(authUsers.map(user => [user.id, user]))
  const businessById = new Map(businesses.map(business => [business.id, business]))
  const noteCounts = new Map<string, number>()
  for (const note of notesResult.data || []) noteCounts.set(note.target_id, (noteCounts.get(note.target_id) || 0) + 1)

  const items = (profilesResult.data || []).filter(profile =>
    profile.role === 'business' || profile.role === 'admin' || businessById.has(profile.id)
  ).map(profile => {
    const authUser = authById.get(profile.id)
    const business = businessById.get(profile.id)
    const userDeals = deals.filter(item => item.business_id === profile.id)
    const bannedUntil = authUser?.banned_until || null
    const isBlocked = !!bannedUntil && new Date(bannedUntil).getTime() > Date.now()

    return {
      id: profile.id,
      email: profile.email || authUser?.email || '',
      role: 'business',
      created_at: profile.created_at || authUser?.created_at || '',
      last_sign_in_at: authUser?.last_sign_in_at || null,
      email_confirmed_at: authUser?.email_confirmed_at || null,
      banned_until: bannedUntil,
      is_blocked: isBlocked,
      author: null,
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
      is_admin_access: profile.id === adminUserId,
    }
  }).filter(business => {
    if (status === 'active' && business.is_blocked) return false
    if (status === 'blocked' && !business.is_blocked) return false
    if (status === 'with_deals' && business.deals_count === 0) return false
    if (!search) return true
    return [
      business.email,
      business.business?.company_name,
      business.business?.niche,
      business.business?.inn,
    ].some(value => normalize(value || '').includes(search))
  })

  const start = (page - 1) * perPage
  return {
    ok: true,
    items: items.slice(start, start + perPage),
    total: items.length,
    page,
    perPage,
  }
}

async function getAuthors(admin: Awaited<ReturnType<typeof requireAdmin>>['admin'], request: NextRequest) {
  const params = request.nextUrl.searchParams
  const search = normalize(params.get('search'))
  const status = normalize(params.get('status'))

  const [authorsResult, profilesResult, requestsResult, viewsResult, notesResult, authUsers] = await Promise.all([
    admin.from('authors').select('id, user_id, name, city, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, status, rejection_reason, avatar_url, completed_deals_count, avg_rating, reviews_count, created_at').order('created_at', { ascending: false }).range(0, 4999),
    admin.from('profiles').select('id, email').range(0, 4999),
    admin.from('requests').select('author_id, status').range(0, 19999),
    admin.from('profile_views').select('author_id').range(0, 49999),
    admin.from('admin_notes').select('target_id').eq('target_type', 'author').range(0, 19999),
    listAuthUsers(admin),
  ])

  if (authorsResult.error) throw authorsResult.error
  if (profilesResult.error) throw profilesResult.error
  if (requestsResult.error) throw requestsResult.error
  if (viewsResult.error) throw viewsResult.error
  if (notesResult.error) throw notesResult.error

  const emailById = new Map((profilesResult.data || []).map(item => [item.id, item.email]))
  const authById = new Map(authUsers.map(user => [user.id, user]))
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
  const noteCounts = new Map<string, number>()
  for (const note of notesResult.data || []) noteCounts.set(note.target_id, (noteCounts.get(note.target_id) || 0) + 1)

  const items = (authorsResult.data || []).map(author => {
    const authUser = author.user_id ? authById.get(author.user_id) : null
    const bannedUntil = authUser?.banned_until || null
    return {
      ...author,
      email: author.user_id ? (emailById.get(author.user_id) || authUser?.email || null) : null,
      is_test: !author.user_id,
      profile_views: viewCounts.get(author.id) || 0,
      deal_stats: dealCounts.get(author.id) || { total: 0, active: 0, completed: 0 },
      last_sign_in_at: authUser?.last_sign_in_at || null,
      banned_until: bannedUntil,
      is_blocked: !!bannedUntil && new Date(bannedUntil).getTime() > Date.now(),
      notes_count: noteCounts.get(author.id) || 0,
    }
  }).filter(author => {
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
    admin.from('complaints').select('id, reporter_id, target_author_id, target_business_id, request_id, reason, comment, status, admin_note, assigned_admin_id, created_at, updated_at, resolved_at, closed_at').order('created_at', { ascending: false }).range(0, 4999),
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

  const priority: Record<string, number> = {
    new: 0,
    in_progress: 1,
    waiting_user: 2,
    resolved: 3,
    closed: 4,
  }

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
      item.id,
      item.request_id,
    ].some(value => normalize(value || '').includes(search))
  }).sort((left, right) => {
    const statusDifference = (priority[left.status] ?? 99) - (priority[right.status] ?? 99)
    if (statusDifference !== 0) return statusDifference
    return new Date(right.updated_at || right.created_at).getTime() - new Date(left.updated_at || left.created_at).getTime()
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

    const data = section === 'overview' ? await getOverview(context.admin, request)
      : section === 'authors' ? await getAuthors(context.admin, request)
      : section === 'businesses' ? await getBusinesses(context.admin, request, context.user.id)
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
