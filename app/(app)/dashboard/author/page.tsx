'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import { useToast } from '@/components/Toast'
import UiIcon from '@/components/UiIcon'
import { useApp } from '../../AppContext'
import styles from '../dashboard.module.css'

export default function AuthorHomePage() {
  const toast = useToast()
  const { authorProfile: profile } = useApp()
  const [loading, setLoading] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)
  const [stats, setStats] = useState({ viewsTotal: 0, views7d: 0, requestsTotal: 0, requests30d: 0, completed: 0 })

  useEffect(() => {
    if (!profile) { setLoading(false); return }
    ;(async () => {
      const now = new Date()
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [
        { count: viewsTotal },
        { count: views7d },
        { data: reqs },
      ] = await Promise.all([
        supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('author_id', profile.id),
        supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('author_id', profile.id).gte('created_at', d7.toISOString()),
        supabase.from('requests').select('status, created_at').eq('author_id', profile.id),
      ])

      const allReqs = reqs || []
      const requests30d = allReqs.filter(r => new Date(r.created_at) >= d30).length
      const completed = allReqs.filter(r => r.status === 'completed').length

      setStats({
        viewsTotal: viewsTotal || 0,
        views7d: views7d || 0,
        requestsTotal: allReqs.length,
        requests30d,
        completed,
      })
      setLoading(false)
    })()
  }, [profile])

  const copyProfileLink = async () => {
    if (!profile) return
    try {
      await navigator.clipboard.writeText(`https://svoi-ugc.ru/author/${profile.id}`)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch { toast.error('Не удалось скопировать') }
  }

  const checklist = profile ? [
    { done: !!profile.avatar_url, label: 'Загрузите фото профиля', key: 'avatar' },
    { done: !!profile.bio && profile.bio.length > 10, label: 'Расскажите о себе', key: 'bio' },
    { done: !!profile.instagram_url, label: 'Укажите ссылку на Instagram', key: 'insta' },
    { done: (profile.lifestyle?.length || 0) >= 3, label: 'Выберите минимум 3 интереса', key: 'tags' },
    { done: !!profile.city, label: 'Укажите город', key: 'city' },
  ] : []
  const completedSteps = checklist.filter(c => c.done).length
  const allChecklistDone = completedSteps === checklist.length
  const showChecklist = profile && !allChecklistDone && stats.completed === 0

  if (loading) return <LoadingScreen />

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div className={styles.headerCopy}>
            <div className={styles.eyebrow}>Кабинет автора</div>
            <h1 className={styles.title}>{profile ? `Привет, ${profile.name?.split(' ')[0] || 'автор'}` : 'Добро пожаловать'}</h1>
            <p className={styles.subtitle}>{profile?.status === 'approved' ? 'Профиль опубликован: бизнес может найти вас в каталоге и отправить предложение.' : 'Заполните профиль, пройдите модерацию и начните получать предложения от бизнеса.'}</p>
          </div>
          {profile && (
            <div className={styles.headerActions}>
              <Link href="/dashboard/author/profile" className={styles.buttonSecondary}><UiIcon name="user" width={16} height={16}/>Редактировать</Link>
              {profile.status === 'approved' && <Link href={`/author/${profile.id}`} className={styles.buttonPrimary}><UiIcon name="eye" width={16} height={16}/>Открыть профиль</Link>}
            </div>
          )}
        </header>

        {profile?.status === 'pending' && (
          <div className={styles.alert}>
            <div className={styles.alertMain}><span className={styles.alertIcon}><UiIcon name="shield" width={18} height={18}/></span><span>Анкета находится на модерации. После одобрения профиль появится в каталоге.</span></div>
          </div>
        )}

        {profile?.status === 'rejected' && (
          <div className={`${styles.alert} ${styles.alertDanger}`}>
            <div className={styles.alertMain}><span className={styles.alertIcon}><UiIcon name="flag" width={18} height={18}/></span><span>Анкета не прошла модерацию. Проверьте данные и причину отклонения в профиле.</span></div>
            <Link href="/dashboard/author/profile" className={styles.buttonSecondary}>Исправить профиль</Link>
          </div>
        )}

        {!profile && (
          <section className={styles.onboarding}>
            <div>
              <div className={styles.eyebrow}>Начало работы</div>
              <h2 className={styles.onboardingTitle}>Создайте профиль, который поможет бизнесу выбрать вас</h2>
              <p className={styles.onboardingText}>Расскажите о тематике, аудитории и формате контента. После модерации профиль станет доступен в каталоге.</p>
              <Link href="/dashboard/author/profile" className={styles.buttonPrimary} style={{ marginTop: 18 }}>Заполнить анкету</Link>
            </div>
            <div className={styles.steps}>
              {['Заполните основные данные', 'Добавьте фото и ссылки на соцсети', 'Пройдите модерацию', 'Получайте предложения в чате'].map((text, i) => (
                <div className={styles.step} key={text}><span className={styles.stepNumber}>{i + 1}</span>{text}</div>
              ))}
            </div>
          </section>
        )}

        {profile && (
          <>
            <section className={styles.metrics} aria-label="Статистика автора">
              <div className={styles.metric}>
                <div className={styles.metricTop}><span className={styles.metricIcon}><UiIcon name="eye" width={17} height={17}/></span>{stats.views7d > 0 && <span className={styles.metricDelta}>+{stats.views7d} за 7 дней</span>}</div>
                <div className={styles.metricValue}>{stats.viewsTotal}</div>
                <div className={styles.metricLabel}>просмотров профиля</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricTop}><span className={styles.metricIcon}><UiIcon name="message" width={17} height={17}/></span>{stats.requests30d > 0 && <span className={styles.metricDelta}>+{stats.requests30d} за 30 дней</span>}</div>
                <div className={styles.metricValue}>{stats.requestsTotal}</div>
                <div className={styles.metricLabel}>входящих запросов</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricTop}><span className={styles.metricIcon}><UiIcon name="briefcase" width={17} height={17}/></span></div>
                <div className={styles.metricValue}>{stats.completed}</div>
                <div className={styles.metricLabel}>завершённых сделок</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricTop}><span className={styles.metricIcon}><UiIcon name="star" width={17} height={17}/></span></div>
                <div className={styles.metricValue}>{profile.avg_rating ? profile.avg_rating.toFixed(1) : '—'}</div>
                <div className={styles.metricLabel}>{profile.reviews_count ? `${profile.reviews_count} отзывов` : 'рейтинг появится после отзывов'}</div>
              </div>
            </section>

            <section className={styles.quickGrid}>
              <article className={styles.quickCard}>
                <span className={styles.quickIcon}><UiIcon name="message" width={20} height={20}/></span>
                <h2 className={styles.quickTitle}>Запросы и сделки</h2>
                <p className={styles.quickText}>Просматривайте новые предложения, обсуждайте детали и следите за статусом текущей работы.</p>
                <Link href="/dashboard/author/deals" className={styles.quickLink}>Перейти к сделкам <UiIcon name="arrowRight" width={14} height={14}/></Link>
              </article>
              <article className={styles.quickCard}>
                <span className={styles.quickIcon}><UiIcon name="share" width={20} height={20}/></span>
                <h2 className={styles.quickTitle}>Поделитесь профилем</h2>
                <p className={styles.quickText}>Отправьте прямую ссылку знакомому бизнесу или разместите её в своих социальных сетях.</p>
                {profile.status === 'approved' ? (
                  <button type="button" onClick={copyProfileLink} className={styles.quickLink} style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {linkCopied ? 'Ссылка скопирована' : 'Скопировать ссылку'} <UiIcon name={linkCopied ? 'check' : 'share'} width={14} height={14}/>
                  </button>
                ) : <Link href="/dashboard/author/profile" className={styles.quickLink}>Проверить профиль <UiIcon name="arrowRight" width={14} height={14}/></Link>}
              </article>
            </section>

            {showChecklist && (
              <section className={styles.checklist}>
                <div className={styles.checklistHeader}>
                  <div>
                    <h2 className={styles.checklistTitle}>Подготовьте профиль к первым предложениям</h2>
                    <div className={styles.panelMeta}>Чем полнее анкета, тем проще бизнесу принять решение.</div>
                  </div>
                  <span className={styles.checklistCount}>{completedSteps} из {checklist.length}</span>
                </div>
                <div className={styles.progress}><div className={styles.progressBar} style={{ width: `${(completedSteps / checklist.length) * 100}%` }}/></div>
                <div className={styles.checklistItems}>
                  {checklist.map(item => (
                    <div key={item.key} className={`${styles.checkItem} ${item.done ? styles.checkDone : ''}`}>
                      <span className={`${styles.checkCircle} ${item.done ? styles.checkCircleDone : ''}`}>{item.done && <UiIcon name="check" width={13} height={13}/>}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/author/profile" className={styles.buttonPrimary} style={{ marginTop: 18 }}>Продолжить заполнение</Link>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
