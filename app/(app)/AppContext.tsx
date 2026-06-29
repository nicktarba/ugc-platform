'use client'
import { createContext, useContext } from 'react'

export type AuthorProfile = {
  id: string
  name: string
  city: string
  instagram_url: string
  telegram_url: string | null
  telegram_followers: number
  followers_count: number
  stories_views?: number
  occupation?: string
  hobbies?: string
  bio?: string
  lifestyle: string[]
  open_to_barter: boolean
  status: string
  avatar_url?: string | null
  completed_deals_count?: number
  avg_rating?: number | null
  reviews_count?: number
}

export type BusinessProfile = {
  company_name: string
  website_url: string
  niche: string
  description: string
  inn: string
  avatar_url?: string
}

export type AppContextValue = {
  userId: string | null
  userEmail: string | null
  userRole: 'business' | 'author' | 'admin' | null
  authorProfile: AuthorProfile | null
  setAuthorProfile: (p: AuthorProfile | null) => void
  businessProfile: BusinessProfile | null
  setBusinessProfile: (p: BusinessProfile) => void
  badgeCount: number
  bumpBadge: (delta: number) => void
  notifCount: number
  setNotifCount: (n: number) => void
}

export const AppContext = createContext<AppContextValue>({
  userId: null,
  userEmail: null,
  userRole: null,
  authorProfile: null,
  setAuthorProfile: () => {},
  businessProfile: null,
  setBusinessProfile: () => {},
  badgeCount: 0,
  bumpBadge: () => {},
  notifCount: 0,
  setNotifCount: () => {},
})

export const useApp = () => useContext(AppContext)

