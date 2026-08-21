import { supabase } from '@/lib/supabase'

export type AccountRole = 'author' | 'business'

export async function getAccountRole(userId: string): Promise<AccountRole | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[profile-role] failed to load role', error)
    return null
  }

  return data?.role === 'author' || data?.role === 'business' ? data.role : null
}
