import { supabase } from './supabase'

// Бизнес: бейдж = непрочитанные сообщения от авторов
export async function getBusinessBadgeCount(businessId: string): Promise<number> {
  const { data: reqs } = await supabase.from('requests').select('id').eq('business_id', businessId)
  if (!reqs || reqs.length === 0) return 0
  const ids = reqs.map(r => r.id)
  const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).in('request_id', ids).eq('sender_role', 'author').eq('read', false)
  return count || 0
}

// Автор: бейдж = непрочитанные сообщения от бизнеса + новые входящие заявки (status='new')
export async function getAuthorBadgeCount(authorId: string): Promise<number> {
  const { data: reqs } = await supabase.from('requests').select('id, status').eq('author_id', authorId)
  if (!reqs || reqs.length === 0) return 0
  const newCount = reqs.filter(r => r.status === 'new').length
  const ids = reqs.map(r => r.id)
  const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).in('request_id', ids).eq('sender_role', 'business').eq('read', false)
  return newCount + (count || 0)
}
