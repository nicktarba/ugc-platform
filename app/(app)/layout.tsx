'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
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

  // Один раз при входе в группу: кто авторизован, какая роль, анкета, бейдж
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user
      if (!u) { setReady(true); return }

      setUserId(u.id)
      setUserEmail(u.email || null)
      const role = (u.user_metadata?.role as 'business' | 'author' | 'admin' | undefined) || null
      setUserRole(role)

      if (role === 'author') {
        const { data: p } = await supabase.from('authors').select('*').eq('user_id', u.id).single()
        setAuthorProfile((p as AuthorProfile) || null)
        if (p) setBadgeCount(await getAuthorBadgeCount(p.id))
      } else if (role === 'business') {
        setBadgeCount(await getBusinessBadgeCount(u.id))
        const { data: bp } = await supabase.from('business_profiles').select('*').eq('id', u.id).maybeSingle()
        setBusinessProfile({
          company_name: bp?.company_name || '',
          website_url: bp?.website_url || '',
          niche: bp?.niche || '',
          description: bp?.description || '',
        })
      }

      setReady(true)
    })
  }, [])

  // Гостя на закрытые страницы — на /login. Каталог доступен без авторизации.
  useEffect(() => {
    if (ready && !userId && pathname !== '/catalog') {
      router.replace('/login')
    }
  }, [ready, userId, pathname, router])

  const bumpBadge = (delta: number) => setBadgeCount(prev => Math.max(0, prev + delta))

  if (!ready) return <LoadingScreen />
  if (!userId && pathname !== '/catalog') return <LoadingScreen />

  const navRole: 'business' | 'author' | null =
    pathname.startsWith('/dashboard/author') ? 'author'
    : pathname.startsWith('/dashboard/business') ? 'business'
    : pathname === '/catalog'
      ? (userRole === 'author' ? 'author' : userRole === 'business' ? 'business' : null)
      : null

  const active =
    pathname.startsWith('/dashboard/business/favorites') ? 'favorites'
    : pathname.startsWith('/dashboard/business/profile') ? 'profile'
    : pathname.startsWith('/dashboard/author/profile') ? 'profile'
    : pathname === '/catalog' ? 'catalog'
    : 'requests'

  return (
    <AppContext.Provider value={{ userId, userEmail, userRole, authorProfile, businessProfile, setBusinessProfile, badgeCount, bumpBadge }}>
      <AppHeader />
      {children}
      {navRole && <BottomNav role={navRole} active={active} unread={badgeCount} />}
    </AppContext.Provider>
  )
}
