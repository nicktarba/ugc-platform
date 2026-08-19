'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import AuthShell from '@/components/AuthShell'
import SmartCaptchaGate from '@/components/SmartCaptchaGate'
import styles from '../public.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [captchaTrigger, setCaptchaTrigger] = useState(0)

  const runRecovery = useCallback(async (captchaToken: string) => {
    try {
      const response = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), captchaToken }),
      })
      const result = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !result.ok) {
        setError(result.error || 'Не удалось отправить письмо. Попробуйте ещё раз.')
        return
      }
      setSent(true)
    } catch {
      setError('Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }, [email])

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

  return (
    <AuthShell
      eyebrow="Восстановление доступа"
      title={<>Вернитесь в аккаунт <em>без лишних шагов</em></>}
      description="Отправим письмо со ссылкой для создания нового пароля. Сделки, сообщения и профиль останутся на месте."
      points={['Ссылка отправляется только на email аккаунта','Старый пароль перестанет действовать','Данные профиля сохраняются','После сброса можно сразу продолжить работу']}
    >
      {sent ? (
        <div className={styles.sentState}>
          <div className={styles.stateIcon}>@</div><h2>Проверьте почту</h2>
          <p>Если аккаунт с адресом <strong>{email}</strong> существует, мы отправили на него ссылку для восстановления. Проверьте также папку «Спам».</p>
          <div className={styles.stateActions}>
            <Link className={styles.primaryButton} href="/login">Вернуться ко входу</Link>
            <button className={styles.secondaryButton} type="button" onClick={() => setSent(false)}>Указать другой email</button>
          </div>
        </div>
      ) : (
        <>
          <Link className={styles.formBack} href="/login">← Вернуться ко входу</Link>
          <div className={styles.formHeader}><span className={styles.formEyebrow}>Доступ к аккаунту</span><h2>Забыли пароль?</h2><p>Введите email, который использовали при регистрации.</p></div>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="reset-email">Email</label>
              <input id="reset-email" className={styles.input} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.ru" required />
            </div>
            <SmartCaptchaGate trigger={captchaTrigger} onSuccess={runRecovery} onError={handleCaptchaError} />
            {error && <div className={styles.error} role="alert">{error}</div>}
            <button className={styles.primaryButton} type="submit" disabled={loading}>{loading ? 'Проверяем...' : 'Отправить ссылку'}</button>
            <p className={styles.formFooter}>Форма защищена Yandex SmartCaptcha.</p>
          </form>
        </>
      )}
    </AuthShell>
  )
}
