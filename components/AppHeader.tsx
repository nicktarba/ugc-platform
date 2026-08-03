'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import PublicBrand from './PublicBrand'
import { supabase } from '@/lib/supabase'
import styles from '@/app/public.module.css'

type HeaderUser = {
  id: string
  email?: string
  user_metadata?: { role?: string }
}

export default function AppHeader() {
  const [user, setUser] = useState<HeaderUser | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      const currentUser = data.user as HeaderUser | null
      setUser(currentUser)
      if (!currentUser?.id) {
        setRole(null)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle()
      setRole(profile?.role || currentUser.user_metadata?.role || null)
    }

    void loadUser()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user as HeaderUser | undefined
      setUser(currentUser || null)
      setRole(currentUser?.user_metadata?.role || null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!accountOpen) return
    const close = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [accountOpen])

  const dashboardHref = role === 'author'
    ? '/dashboard/author'
    : role === 'admin'
      ? '/dashboard/admin'
      : '/dashboard/business'

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <header className={styles.publicHeader}>
      <PublicBrand className={styles.brand} />

      <nav className={styles.publicHeaderNav} aria-label="Основная навигация">
        <Link href="/catalog">Каталог авторов</Link>
        <Link href="/#how-it-works">Как это работает</Link>
        <Link href="/support">Поддержка</Link>
      </nav>

      <div className={styles.publicHeaderActions}>
        {user ? (
          <div className={styles.headerAccount} ref={accountRef}>
            <button
              className={styles.headerAvatar}
              type="button"
              onClick={() => setAccountOpen((value) => !value)}
              aria-label="Открыть меню аккаунта"
              aria-expanded={accountOpen}
            >
              {user.email?.[0]?.toUpperCase() || 'Я'}
            </button>
            {accountOpen && (
              <div className={styles.headerDropdown}>
                <div className={styles.headerEmail}>{user.email}</div>
                <Link href={dashboardHref}>Личный кабинет</Link>
                <button className={styles.logoutButton} type="button" onClick={logout}>Выйти</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link href="/login">Войти</Link>
            <Link className={styles.headerPrimary} href="/register">Регистрация</Link>
          </>
        )}
      </div>

      <button
        className={styles.mobileMenuButton}
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Открыть меню"
      >
        ☰
      </button>

      {mobileOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)}>
          <aside className={styles.mobileDrawer} onClick={(event) => event.stopPropagation()}>
            <div className={styles.mobileDrawerTop}>
              <PublicBrand className={styles.brand} />
              <button className={styles.mobileDrawerClose} type="button" onClick={() => setMobileOpen(false)}>×</button>
            </div>
            <nav className={styles.mobileDrawerNav}>
              <Link href="/catalog" onClick={() => setMobileOpen(false)}>Каталог авторов</Link>
              <Link href="/#how-it-works" onClick={() => setMobileOpen(false)}>Как это работает</Link>
              <Link href="/support" onClick={() => setMobileOpen(false)}>Поддержка</Link>
              {user ? (
                <>
                  <Link href={dashboardHref} onClick={() => setMobileOpen(false)}>Личный кабинет</Link>
                  <button className={styles.drawerLogout} type="button" onClick={logout}>Выйти</button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>Войти</Link>
                  <Link className={styles.drawerPrimary} href="/register" onClick={() => setMobileOpen(false)}>Регистрация</Link>
                </>
              )}
            </nav>
          </aside>
        </div>
      )}
    </header>
  )
}
