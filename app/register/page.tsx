'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from '@/components/AuthShell'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import styles from '../public.module.css'

type Role = 'author' | 'business' | ''

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState<{ email: string; password: string; role: Role }>({
    email: '',
    password: '',
    role: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getSafeRedirect = (): string | null => {
    const redirect = searchParams.get('redirect')
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) return redirect
    return null
  }

  const redirectValue = searchParams.get('redirect')
  const redirectQuery = redirectValue ? `?redirect=${encodeURIComponent(redirectValue)}` : ''

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.role) {
      setError('Выберите, как вы будете использовать платформу.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const email = form.email.trim()
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: { data: { role: form.role } },
      })

      if (authError) {
        setError(getAuthErrorMessage(authError, 'register'))
        return
      }

      if (!data.user) {
        setError('Не удалось создать аккаунт. Попробуйте ещё раз.')
        return
      }

      const { error: profileError } = await supabase.from('profiles').insert([{
        id: data.user.id,
        email,
        role: form.role,
      }])

      if (profileError) {
        setError('Аккаунт создан, но профиль не настроен. Войдите ещё раз или обратитесь в поддержку.')
        return
      }

      const redirectTo = getSafeRedirect()
      if (redirectTo) router.push(redirectTo)
      else if (form.role === 'author') router.push('/dashboard/author')
      else router.push('/dashboard/business')
      router.refresh()
    } catch (caught) {
      setError(getAuthErrorMessage(caught instanceof Error ? caught : null, 'register'))
    } finally {
      setLoading(false)
    }
  }

  const roles: Array<{ value: Exclude<Role, ''>; icon: string; title: string; description: string }> = [
    {
      value: 'author',
      icon: 'А',
      title: 'Я автор',
      description: 'Создаю контент и хочу получать предложения от бизнеса.',
    },
    {
      value: 'business',
      icon: 'Б',
      title: 'Я бизнес',
      description: 'Ищу авторов и запускаю UGC-сотрудничества.',
    },
  ]

  return (
    <AuthShell
      eyebrow="Присоединяйтесь к платформе"
      title={<>Начните сотрудничать <em>напрямую</em></>}
      description="Бизнес находит автора, отправляет предложение и продолжает работу в чате. Автор получает новые заказы без холодных продаж."
      points={[
        'Регистрация для бизнеса и авторов',
        'Поиск по городу, тематике и аудитории',
        'Сделка и общение внутри платформы',
        'Отзывы после завершения сотрудничества',
      ]}
      alternateLabel="Уже есть аккаунт?"
      alternateHref={`/login${redirectQuery}`}
      alternateAction="Войти"
    >
      <Link className={styles.formBack} href="/">← На главную</Link>
      <div className={styles.formHeader}>
        <span className={styles.formEyebrow}>Новый аккаунт</span>
        <h2>Регистрация</h2>
        <p>
          Уже зарегистрированы?{' '}
          <Link href={`/login${redirectQuery}`}>Войти</Link>
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label>Как вы будете использовать платформу?</label>
          <div className={styles.roleGrid}>
            {roles.map((role) => {
              const active = form.role === role.value
              return (
                <button
                  key={role.value}
                  type="button"
                  className={`${styles.roleCard} ${active ? styles.roleCardActive : ''}`}
                  onClick={() => setForm({ ...form, role: role.value })}
                  aria-pressed={active}
                >
                  <span className={styles.roleIcon}>{role.icon}</span>
                  <strong>{role.title}</strong>
                  <p>{role.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
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
          <label htmlFor="register-password">Пароль</label>
          <input
            id="register-password"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="Минимум 6 символов"
            minLength={6}
            required
          />
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <button className={styles.primaryButton} type="submit" disabled={loading}>
          {loading ? 'Создаём аккаунт...' : 'Создать аккаунт'}
        </button>

        <p className={styles.formFooter}>
          Создавая аккаунт, вы подтверждаете, что указываете достоверные данные.
          Документы платформы будут добавлены перед публичным запуском.
        </p>
      </form>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
