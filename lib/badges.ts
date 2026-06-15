import { supabase } from './supabase'

// Бизнес: бейдж = непрочитанные сообщения от авторов
export async function getBusinessBadgeCount(businessId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_business_badge_count', { p_business_id: businessId })
  if (error) return 0
  return data ?? 0
}

// Автор: бейдж = непрочитанные сообщения от бизнеса + новые входящие заявки (status='new')
export async function getAuthorBadgeCount(authorId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_author_badge_count', { p_author_id: authorId })
  if (error) return 0
  return data ?? 0
}
