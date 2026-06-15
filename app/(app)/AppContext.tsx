'use client'
import { createContext, useContext } from 'react'

export type AuthorProfile = {
  id: string
  name: string
  city: string
  instagram_url: string
  followers_count: number
  stories_views?: number
  occupation?: string
  hobbies?: string
  bio?: string
  lifestyle: string[]
  open_to_barter: boolean
  status: string
}

export type BusinessProfile = {
  company_name: string
  website_url: string
  niche: string
  description: string
}

export type AppContextValue = {
  userId: string | null
  userEmail: string | null
  userRole: 'business' | 'author' | 'admin' | null
  authorProfile: AuthorProfile | null
  businessProfile: BusinessProfile | null
  setBusinessProfile: (p: BusinessProfile) => void
  badgeCount: number
  bumpBadge: (delta: number) => void
}

export const AppContext = createContext<AppContextValue>({
  userId: null,
  userEmail: null,
  userRole: null,
  authorProfile: null,
  businessProfile: null,
  setBusinessProfile: () => {},
  badgeCount: 0,
  bumpBadge: () => {},
})

export const useApp = () => useContext(AppContext)
