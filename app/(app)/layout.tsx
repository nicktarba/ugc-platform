'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import LoadingScreen from '@/components/LoadingScreen'
import { getBusinessBadgeCount, getAuthorBadgeCount } from '@/lib/badges'
import { AppContext, AuthorProfile, BusinessProfile } from './AppContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'business' | 'author' | 'admin' | null>(null)
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [badgeCount, setBadgeCount] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user
      if (!u) { setReady(true); return }

      setUserId(u.id)
      setUserEmail(u.email || null)
      const role = (u.user_metadata?.role as 'business' | 'author' | 'admin' | undefined) || null
      setUserRole(role)

      if (role === 'author') {
        const { data: p } = await supabase.from('authors').select('id, name, city, status, avatar_url, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, completed_deals_count, avg_rating, reviews_count').eq('user_id', u.id).single()
        setAuthorProfile((p as AuthorProfile) || null)
        if (p) setBadgeCount(await getAuthorBadgeCount(p.id))
      } else if (role === 'business') {
        setBadgeCount(await getBusinessBadgeCount(u.id))
        const { data: bp } = await supabase.from('business_profiles').select('company_name, website_url, niche, description, inn').eq('id', u.id).maybeSingle()
        setBusinessProfile({
          company_name: bp?.company_name || '',
          website_url: bp?.website_url || '',
          niche: bp?.niche || '',
          description: bp?.description || '',
          inn: bp?.inn || '',
        })
      }
      setReady(true)
    })
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUserId(null)
        setUserRole(null)
        setUserEmail(null)
        setAuthorProfile(null)
        setBusinessProfile(null)
        setBadgeCount(0)
        router.replace('/login')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (ready && !userId && pathname !== '/catalog') {
      router.replace('/login')
    }
  }, [ready, userId, pathname, router])

  const bumpBadge = (delta: number) => setBadgeCount(prev => Math.max(0, prev + delta))

  if (!ready) return <LoadingScreen />
  if (!userId && pathname !== '/catalog') return <LoadingScreen />

  // BottomNav active tab
  const active =
    pathname.startsWith('/dashboard/business/favorites') ? 'favorites'
    : pathname.startsWith('/dashboard/business/profile') ? 'profile'
    : pathname.startsWith('/dashboard/author/profile') ? 'profile'
    : pathname === '/catalog' ? 'catalog'
    : 'requests'

  const navRole: 'business' | 'author' | null =
    (userRole === 'business') ? 'business'
    : (userRole === 'author') ? 'author'
    : null

  return (
    <AppContext.Provider value={{ userId, userEmail, userRole, authorProfile, businessProfile, setBusinessProfile, badgeCount, bumpBadge }}>
      <div className="sidebar-layout">
        <Sidebar
          role={userRole}
          email={userEmail}
          badgeCount={badgeCount}
          authorId={authorProfile?.id || null}
        />
        <div className="sidebar-content">
          {children}
          {navRole && <BottomNav role={navRole} active={active} unread={badgeCount} />}
        </div>
      </div>
    </AppContext.Provider>
  )
}

