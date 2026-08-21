'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/components/AuthShell'
import SmartCaptchaGate from '@/components/SmartCaptchaGate'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import styles from '../public.module.css'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaTrigger, setCaptchaTrigger] = useState(0)
  const [resendTrigger, setResendTrigger] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')

  const resetSuccessful = searchParams.get('reset') === 'success'
  const emailConfirmed = searchParams.get('confirmed') === '1'

  useEffect(() => {
    if (resetSuccessful) toast.success('Пароль обновлён. Теперь войдите с новым паролем.')
    if (emailConfirmed) toast.success('Email подтверждён. Теперь войдите в аккаунт.')
  }, [emailConfirmed, resetSuccessful, toast])

  const getSafeRedirect = () => {
    const redirect = searchParams.get('redirect')
    return redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : null
  }

  const redirectValue = searchParams.get('redirect')
  const redirectQuery = redirectValue ? `?redirect=${encodeURIComponent(redirectValue)}` : ''

  const runLogin = useCallback(async (captchaToken: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.password, captchaToken }),
      })
      const result = await response.json() as { ok?: boolean; error?: string; accessToken?: string; refreshToken?: string }
      if (!response.ok || !result.ok || !result.accessToken || !result.refreshToken) {
        setError(result.error || 'Не удалось войти. Попробуйте ещё раз.')
        return
      }

      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      })
      if (sessionError || !data.user) {
        setError('Не удалось сохранить сессию. Попробуйте ещё раз.')
        return
      }

      const redirectTo = getSafeRedirect()
      if (redirectTo) return router.push(redirectTo)

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      if (profile?.role === 'author') router.push('/dashboard/author')
      else router.push('/dashboard/business')
      router.refresh()
    } catch {
      setError('Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }, [form, router, searchParams])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setCaptchaTrigger((value) => value + 1)
  }

  const handleCaptchaError = useCallback((message: string) => {
    setLoading(false)
    setError(message)
  }, [])

  const runResendConfirmation = useCallback(async (captchaToken: string) => {
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), captchaToken }),
      })
      const result = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !result.ok) {
        setResendMessage(result.error || 'Не удалось отправить письмо. Попробуйте ещё раз.')
        return
      }
      setResendMessage('Письмо подтверждения отправлено. Проверьте входящие и папку «Спам».')
    } catch {
      setResendMessage('Не удалось связаться с сервером. Попробуйте ещё раз.')
    } finally {
      setResendLoading(false)
    }
  }, [form.email])

  const handleResendCaptchaError = useCallback((message: string) => {
    setResendLoading(false)
    setResendMessage(message)
  }, [])

  const needsConfirmation = error.startsWith('Email ещё не подтверждён')

  return (
    <AuthShell
      eyebrow="Возвращайтесь к работе"
      title={<>Все сделки и авторы <em>в одном месте</em></>}
      description="Войдите, чтобы продолжить поиск авторов, отвечать на предложения и управлять сотрудничествами."
      points={['Каталог и избранные авторы','Предложения, чат и статусы сделки','Профиль и история сотрудничеств','Один аккаунт на компьютере и телефоне']}
      alternateLabel="Ещё нет аккаунта?"
      alternateHref={`/register${redirectQuery}`}
      alternateAction="Регистрация"
    >
      <Link className={styles.formBack} href="/">← На главную</Link>
      <div className={styles.formHeader}>
        <span className={styles.formEyebrow}>Личный кабинет</span><h2>Вход</h2>
        <p>Нет аккаунта? <Link href={`/register${redirectQuery}`}>Зарегистрироваться</Link></p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="login-email">Email</label>
          <input id="login-email" className={styles.input} type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.ru" required />
        </div>
        <div className={styles.field}>
          <div className={styles.fieldRow}><label htmlFor="login-password">Пароль</label><Link href="/forgot-password">Забыли пароль?</Link></div>
          <input id="login-password" className={styles.input} type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Введите пароль" required />
        </div>
        <SmartCaptchaGate trigger={captchaTrigger} onSuccess={runLogin} onError={handleCaptchaError} />
        <SmartCaptchaGate trigger={resendTrigger} onSuccess={runResendConfirmation} onError={handleResendCaptchaError} />
        {error && <div className={styles.error} role="alert">{error}</div>}
        {needsConfirmation && (
          <button
            className={styles.secondaryButton}
            type="button"
            disabled={resendLoading || !form.email.trim()}
            onClick={() => {
              setResendMessage('')
              setResendLoading(true)
              setResendTrigger((value) => value + 1)
            }}
          >
            {resendLoading ? 'Проверяем...' : 'Отправить письмо подтверждения ещё раз'}
          </button>
        )}
        {resendMessage && <div className={styles.infoBox} role="status">{resendMessage}</div>}
        <button className={styles.primaryButton} type="submit" disabled={loading}>{loading ? 'Проверяем...' : 'Войти'}</button>
        <p className={styles.formFooter}>Форма защищена Yandex SmartCaptcha.</p>
      </form>
    </AuthShell>
  )
}

export default function LoginPage() { return <Suspense><LoginForm /></Suspense> }
