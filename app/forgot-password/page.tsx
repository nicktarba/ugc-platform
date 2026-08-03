'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthShell from '@/components/AuthShell'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import styles from '../public.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) {
        setError(getAuthErrorMessage(resetError, 'reset'))
        return
      }
      setSent(true)
    } catch (caught) {
      setError(getAuthErrorMessage(caught instanceof Error ? caught : null, 'reset'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Восстановление доступа"
      title={<>Вернитесь в аккаунт <em>без лишних шагов</em></>}
      description="Отправим письмо со ссылкой для создания нового пароля. Сделки, сообщения и профиль останутся на месте."
      points={[
        'Ссылка отправляется только на email аккаунта',
        'Старый пароль перестанет действовать',
        'Данные профиля сохраняются',
        'После сброса можно сразу продолжить работу',
      ]}
    >
      {sent ? (
        <div className={styles.sentState}>
          <div className={styles.stateIcon}>@</div>
          <h2>Проверьте почту</h2>
          <p>
            Ссылка для сброса пароля отправлена на <strong>{email}</strong>.
            Письмо может прийти с небольшой задержкой, проверьте также папку «Спам».
          </p>
          <div className={styles.stateActions}>
            <Link className={styles.primaryButton} href="/login">Вернуться ко входу</Link>
            <button className={styles.secondaryButton} type="button" onClick={() => setSent(false)}>
              Указать другой email
            </button>
          </div>
        </div>
      ) : (
        <>
          <Link className={styles.formBack} href="/login">← Вернуться ко входу</Link>
          <div className={styles.formHeader}>
            <span className={styles.formEyebrow}>Доступ к аккаунту</span>
            <h2>Забыли пароль?</h2>
            <p>Введите email, который использовали при регистрации.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                className={styles.input}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.ru"
                required
              />
            </div>
            {error && <div className={styles.error} role="alert">{error}</div>}
            <button className={styles.primaryButton} type="submit" disabled={loading}>
              {loading ? 'Отправляем...' : 'Отправить ссылку'}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
