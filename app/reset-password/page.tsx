'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthShell from '@/components/AuthShell'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import styles from '../public.module.css'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setReady(Boolean(data.session))
      setChecking(false)
      if (!data.session) setError('Ссылка недействительна или уже истекла. Запросите новую.')
    }

    void checkSession()
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true)
        setChecking(false)
        setError('')
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password !== confirm) {
      setError('Пароли не совпадают.')
      return
    }
    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(getAuthErrorMessage(updateError, 'update'))
        return
      }
      await supabase.auth.signOut()
      router.push('/login?reset=success')
    } catch (caught) {
      setError(getAuthErrorMessage(caught instanceof Error ? caught : null, 'update'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Новый пароль"
      title={<>Защитите доступ к <em>своему профилю</em></>}
      description="Создайте новый пароль. После сохранения старая комбинация больше не будет работать."
      points={[
        'Минимум 6 символов',
        'Используйте уникальную комбинацию',
        'Не передавайте пароль другим людям',
        'После сохранения войдите заново',
      ]}
    >
      {checking ? (
        <div className={styles.infoBox}>Проверяем ссылку восстановления...</div>
      ) : !ready ? (
        <div className={styles.invalidState}>
          <div className={styles.stateIcon}>!</div>
          <h2>Ссылка не работает</h2>
          <p>{error}</p>
          <div className={styles.stateActions}>
            <Link className={styles.primaryButton} href="/forgot-password">Запросить новую ссылку</Link>
            <Link className={styles.secondaryButton} href="/login">Вернуться ко входу</Link>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.formHeader}>
            <span className={styles.formEyebrow}>Восстановление доступа</span>
            <h2>Создайте новый пароль</h2>
            <p>Введите новую комбинацию два раза, чтобы исключить опечатку.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="new-password">Новый пароль</label>
              <input
                id="new-password"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Минимум 6 символов"
                minLength={6}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="confirm-password">Повторите пароль</label>
              <input
                id="confirm-password"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Введите пароль ещё раз"
                minLength={6}
                required
              />
            </div>
            {error && <div className={styles.error} role="alert">{error}</div>}
            <button className={styles.primaryButton} type="submit" disabled={loading}>
              {loading ? 'Сохраняем...' : 'Сохранить пароль'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
