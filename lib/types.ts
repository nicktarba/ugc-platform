export type DealStatus = 'new' | 'viewed' | 'accepted' | 'declined' | 'cancelled' | 'completed'

export const OPEN_STATUSES: DealStatus[] = ['new', 'viewed', 'accepted']
export const CLOSED_STATUSES: DealStatus[] = ['declined', 'cancelled', 'completed']

export type BusinessRequest = {
  id: string
  message: string
  status: string
  created_at: string
  budget: string | null
  deadline: string | null
  authors: { name: string; city: string } | null
}

export type AuthorRequest = {
  id: string
  business_id: string
  message: string
  status: string
  business_email: string
  created_at: string
  budget: string | null
  deadline: string | null
}

// AuthorProfile — актуальный тип в app/(app)/AppContext.tsx
// Здесь не дублируем во избежание рассинхронизации

