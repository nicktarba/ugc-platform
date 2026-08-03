'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/components/AuthShell'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { useToast } from '@/components/Toast'
import styles from '../public.module.css'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const resetSuccessful = searchParams.get('reset') === 'success'

  useEffect(() => {
    if (resetSuccessful) {
      toast.success('Пароль обновлён. Теперь войдите с новым паролем.')
    }
  }, [resetSuccessful])

  const getSafeRedirect = (): string | null => {
    const redirect = searchParams.get('redirect')
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) return redirect
    return null
  }

  const redirectValue = searchParams.get('redirect')
  const redirectQuery = redirectValue ? `?redirect=${encodeURIComponent(redirectValue)}` : ''

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })

      if (authError) {
        setError(getAuthErrorMessage(authError, 'login'))
        return
      }

      const redirectTo = getSafeRedirect()
      if (redirectTo) {
        router.push(redirectTo)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      const role = profile?.role || data.user.user_metadata?.role
      if (role === 'author') router.push('/dashboard/author')
      else if (role === 'admin') router.push('/dashboard/admin')
      else router.push('/dashboard/business')
      router.refresh()
    } catch (caught) {
      setError(getAuthErrorMessage(caught instanceof Error ? caught : null, 'login'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Возвращайтесь к работе"
      title={<>Все сделки и авторы <em>в одном месте</em></>}
      description="Войдите, чтобы продолжить поиск авторов, отвечать на предложения и управлять сотрудничествами."
      points={[
        'Каталог и избранные авторы',
        'Предложения, чат и статусы сделки',
        'Профиль и история сотрудничеств',
        'Один аккаунт на компьютере и телефоне',
      ]}
      alternateLabel="Ещё нет аккаунта?"
      alternateHref={`/register${redirectQuery}`}
      alternateAction="Регистрация"
    >
      <Link className={styles.formBack} href="/">← На главную</Link>
      <div className={styles.formHeader}>
        <span className={styles.formEyebrow}>Личный кабинет</span>
        <h2>Вход</h2>
        <p>
          Нет аккаунта?{' '}
          <Link href={`/register${redirectQuery}`}>Зарегистрироваться</Link>
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="name@example.ru"
            required
          />
        </div>

        <div className={styles.field}>
          <div className={styles.fieldRow}>
            <label htmlFor="login-password">Пароль</label>
            <Link href="/forgot-password">Забыли пароль?</Link>
          </div>
          <input
            id="login-password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="Введите пароль"
            required
          />
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <button className={styles.primaryButton} type="submit" disabled={loading}>
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
