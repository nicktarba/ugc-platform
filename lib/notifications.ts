export type NotificationData = {
  request_id?: string
  message_id?: string
  review_id?: string
  author_id?: string
  complaint_id?: string
  user_id?: string
  role?: string
  status?: string
  url?: string
}

const REQUEST_NOTIFICATION_TYPES = new Set([
  'new_request',
  'request_viewed',
  'request_accepted',
  'request_declined',
  'request_cancelled',
  'request_completed',
  'new_message',
  'work_done',
])

export function getNotificationHref(
  type: string,
  data: NotificationData | null | undefined,
  role: 'business' | 'author' | 'admin' | null,
): string | null {
  const safeUrl = typeof data?.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')
    ? data.url
    : null

  if (safeUrl) return safeUrl

  if (REQUEST_NOTIFICATION_TYPES.has(type) && data?.request_id) {
    return `/dashboard/chat/${data.request_id}`
  }

  if (type === 'new_review') {
    if (role === 'author') return '/dashboard/author/profile'
    if (data?.request_id) return `/dashboard/chat/${data.request_id}`
  }

  if (type === 'author_submitted' || type === 'author_approved' || type === 'author_rejected') {
    return '/dashboard/author/profile'
  }

  if (type === 'account_created') {
    return role === 'author' ? '/dashboard/author/profile' : '/dashboard/business/profile'
  }

  if (type === 'business_profile_completed') {
    return '/dashboard/business/profile'
  }

  if (type === 'admin_new_account') {
    return data?.role === 'author'
      ? '/dashboard/admin?section=authors'
      : '/dashboard/admin?section=businesses'
  }

  if (type === 'admin_author_pending') {
    return '/dashboard/admin?section=authors'
  }

  if (type === 'admin_complaint_created') {
    return '/dashboard/admin?section=complaints'
  }

  if (type === 'complaint_created' || type === 'complaint_updated') {
    if (role === 'admin') return '/dashboard/admin?section=complaints'
    if (data?.request_id) return `/dashboard/chat/${data.request_id}`
  }

  return null
}
