'use client'

import { Suspense, useCallback, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AuthShell from '@/components/AuthShell'
import SmartCaptchaGate from '@/components/SmartCaptchaGate'
import styles from '../public.module.css'

type Role = 'author' | 'business' | ''

function RegisterForm() {
  const searchParams = useSearchParams()
  const [form, setForm] = useState<{ email: string; password: string; role: Role }>({
    email: '', password: '', role: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [captchaTrigger, setCaptchaTrigger] = useState(0)
  const [resendTrigger, setResendTrigger] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [personalDataAccepted, setPersonalDataAccepted] = useState(false)

  const redirectValue = searchParams.get('redirect')
  const redirectQuery = redirectValue ? `?redirect=${encodeURIComponent(redirectValue)}` : ''

  const runRegister = useCallback(async (captchaToken: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SVOI-Terms-Consent': termsAccepted ? '1' : '0',
          'X-SVOI-PD-Consent': personalDataAccepted ? '1' : '0',
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          captchaToken,
        }),
      })
      const result = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !result.ok) {
        setError(result.error || 'Не удалось создать аккаунт. Попробуйте ещё раз.')
        return
      }
      setSent(true)
      setResendMessage('')
    } catch {
      setError('Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }, [form, termsAccepted, personalDataAccepted])

  const runResend = useCallback(async (captchaToken: string) => {
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
      setResendMessage('Письмо отправлено повторно. Проверьте входящие и папку «Спам».')
    } catch {
      setResendMessage('Не удалось связаться с сервером. Попробуйте ещё раз.')
    } finally {
      setResendLoading(false)
    }
  }, [form.email])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.role) return setError('Выберите, как вы будете использовать платформу.')
    if (form.password.length < 8) return setError('Пароль должен содержать минимум 8 символов.')
    if (!termsAccepted) return setError('Чтобы зарегистрироваться, примите Пользовательское соглашение.')
    if (!personalDataAccepted) return setError('Нужно отдельно дать согласие на обработку персональных данных.')
    setError('')
    setLoading(true)
    setCaptchaTrigger((value) => value + 1)
  }

  const handleCaptchaError = useCallback((message: string) => {
    setLoading(false)
    setError(message)
  }, [])

  const handleResendCaptchaError = useCallback((message: string) => {
    setResendLoading(false)
    setResendMessage(message)
  }, [])

  const roles: Array<{ value: Exclude<Role, ''>; icon: string; title: string; description: string }> = [
    { value: 'author', icon: 'А', title: 'Я автор', description: 'Создаю контент и хочу получать предложения от бизнеса.' },
    { value: 'business', icon: 'Б', title: 'Я бизнес', description: 'Ищу авторов и запускаю UGC-сотрудничества.' },
  ]

  return (
    <AuthShell
      eyebrow="Присоединяйтесь к платформе"
      title={<>Начните сотрудничать <em>напрямую</em></>}
      description="Бизнес находит автора, отправляет предложение и продолжает работу в чате. Автор получает новые заказы без холодных продаж."
      points={['Регистрация для бизнеса и авторов','Поиск по городу, тематике и аудитории','Сделка и общение внутри платформы','Отзывы после завершения сотрудничества']}
      alternateLabel="Уже есть аккаунт?"
      alternateHref={`/login${redirectQuery}`}
      alternateAction="Войти"
    >
      {sent ? (
        <div className={styles.sentState}>
          <div className={styles.stateIcon}>@</div>
          <h2>Подтвердите email</h2>
          <p>Мы отправили письмо на <strong>{form.email.trim()}</strong>. Перейдите по ссылке из письма, чтобы завершить регистрацию.</p>
          <SmartCaptchaGate trigger={resendTrigger} onSuccess={runResend} onError={handleResendCaptchaError} />
          {resendMessage && <div className={styles.infoBox} role="status">{resendMessage}</div>}
          <div className={styles.stateActions}>
            <Link className={styles.primaryButton} href="/login">Перейти ко входу</Link>
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={resendLoading}
              onClick={() => {
                setResendMessage('')
                setResendLoading(true)
                setResendTrigger((value) => value + 1)
              }}
            >
              {resendLoading ? 'Проверяем...' : 'Отправить письмо ещё раз'}
            </button>
            <button className={styles.secondaryButton} type="button" onClick={() => setSent(false)}>Исправить email</button>
          </div>
        </div>
      ) : (
        <>
          <Link className={styles.formBack} href="/">← На главную</Link>
          <div className={styles.formHeader}>
            <span className={styles.formEyebrow}>Новый аккаунт</span>
            <h2>Регистрация</h2>
            <p>Уже зарегистрированы? <Link href={`/login${redirectQuery}`}>Войти</Link></p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label>Как вы будете использовать платформу?</label>
              <div className={styles.roleGrid}>
                {roles.map((role) => {
                  const active = form.role === role.value
                  return (
                    <button key={role.value} type="button" className={`${styles.roleCard} ${active ? styles.roleCardActive : ''}`} onClick={() => setForm({ ...form, role: role.value })} aria-pressed={active}>
                      <span className={styles.roleIcon}>{role.icon}</span><strong>{role.title}</strong><p>{role.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="register-email">Email</label>
              <input id="register-email" className={styles.input} type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.ru" required />
            </div>

            <div className={styles.field}>
              <label htmlFor="register-password">Пароль</label>
              <input id="register-password" className={styles.input} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Минимум 8 символов" minLength={8} maxLength={128} required />
            </div>

            <div className={styles.consentGroup}>
              <label className={styles.consentRow}>
                <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
                <span>Я принимаю <Link href="/terms" target="_blank">Пользовательское соглашение</Link>.</span>
              </label>
              <label className={styles.consentRow}>
                <input type="checkbox" checked={personalDataAccepted} onChange={(event) => setPersonalDataAccepted(event.target.checked)} />
                <span>Я отдельно даю <Link href="/personal-data-consent" target="_blank">согласие на обработку персональных данных</Link> и ознакомлен(а) с <Link href="/privacy" target="_blank">Политикой ПД</Link>.</span>
              </label>
            </div>

            <SmartCaptchaGate trigger={captchaTrigger} onSuccess={runRegister} onError={handleCaptchaError} />
            {error && <div className={styles.error} role="alert">{error}</div>}
            <button className={styles.primaryButton} type="submit" disabled={loading}>{loading ? 'Проверяем...' : 'Создать аккаунт'}</button>
            <p className={styles.formFooter}>Форма защищена Yandex SmartCaptcha. Правовые согласия фиксируются отдельно вместе с версией документа и временем подтверждения.</p>
          </form>
        </>
      )}
    </AuthShell>
  )
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}
