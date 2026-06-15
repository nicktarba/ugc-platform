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

export type AppContextValue = {
  userId: string | null
  userEmail: string | null
  userRole: 'business' | 'author' | 'admin' | null
  authorProfile: AuthorProfile | null
  badgeCount: number
  bumpBadge: (delta: number) => void
}

export const AppContext = createContext<AppContextValue>({
  userId: null,
  userEmail: null,
  userRole: null,
  authorProfile: null,
  badgeCount: 0,
  bumpBadge: () => {},
})

export const useApp = () => useContext(AppContext)
