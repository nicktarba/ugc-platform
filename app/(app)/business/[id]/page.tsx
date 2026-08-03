'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import UiIcon from '@/components/UiIcon'
import { useApp } from '../../AppContext'
import styles from './business.module.css'

type BusinessProfile = {
  id: string
  company_name: string
  niche: string | null
  description: string | null
  website_url: string | null
  avatar_url: string | null
}

export default function BusinessPublicPage() {
  const params = useParams()
  const router = useRouter()
  const businessId = params.id as string
  const { userRole } = useApp()
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [dealsCount, setDealsCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('business_profiles')
        .select('id, company_name, niche, description, website_url, avatar_url')
        .eq('id', businessId)
        .maybeSingle()

      if (!data) {
        setLoading(false)
        return
      }

      setProfile(data as BusinessProfile)
      const { count } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'completed')
      setDealsCount(count || 0)
      setLoading(false)
    }

    void load()
  }, [businessId])

  if (loading) return <LoadingScreen />

  if (!profile) {
    return (
      <main className={styles.page}>
        <div className={styles.notFound}>
          <div className={styles.notFoundCard}>
            <div className={styles.notFoundIcon}><UiIcon name="building" width={25} height={25} /></div>
            <h1 className={styles.notFoundTitle}>Компания не найдена</h1>
            <p className={styles.notFoundText}>Профиль ещё не заполнен, был удалён или недоступен.</p>
            <button type="button" className={styles.secondaryButton} onClick={() => router.back()}><UiIcon name="arrowLeft" width={15} height={15} />Назад</button>
          </div>
        </div>
      </main>
    )
  }

  const initials = profile.company_name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const website = profile.website_url
    ? profile.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null
  const returnHref = userRole === 'admin'
    ? '/dashboard/admin'
    : userRole === 'business'
      ? '/dashboard/business'
      : '/dashboard/author/deals'
  const returnLabel = userRole === 'admin' ? 'Вернуться в админку' : 'Вернуться к сделкам'

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <button type="button" className={styles.back} onClick={() => router.back()}>
          <UiIcon name="arrowLeft" width={15} height={15} />Назад
        </button>

        <section className={styles.hero}>
          <div className={styles.identity}>
            <div className={styles.avatar}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}
            </div>
            <div>
              <div className={styles.eyebrow}>Профиль бизнеса</div>
              <h1 className={styles.title}>{profile.company_name}</h1>
              <p className={styles.niche}>{profile.niche || 'Сфера деятельности пока не указана'}</p>
            </div>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <div className={styles.statIcon}><UiIcon name="check" width={17} height={17} /></div>
              <div className={styles.statCopy}>
                <div className={styles.statValue}>{dealsCount}</div>
                <div className={styles.statLabel}>завершённых сделок</div>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}><UiIcon name="building" width={19} height={19} />О компании</h2>
            {profile.description
              ? <p className={styles.cardText}>{profile.description}</p>
              : <p className={styles.emptyText}>Компания пока не добавила подробное описание.</p>}
          </section>

          <aside className={styles.card}>
            <h2 className={styles.cardTitle}>Информация</h2>
            <div className={styles.details} style={{ marginTop: 14 }}>
              <div className={styles.detail}>
                <div className={styles.detailIcon}><UiIcon name="briefcase" width={16} height={16} /></div>
                <div className={styles.detailCopy}>
                  <div className={styles.detailLabel}>Направление</div>
                  <div className={styles.detailValue}>{profile.niche || 'Не указано'}</div>
                </div>
              </div>
              <div className={styles.detail}>
                <div className={styles.detailIcon}><UiIcon name="external" width={16} height={16} /></div>
                <div className={styles.detailCopy}>
                  <div className={styles.detailLabel}>Сайт</div>
                  <div className={styles.detailValue}>
                    {profile.website_url && website
                      ? <a href={profile.website_url} target="_blank" rel="noopener noreferrer">{website}</a>
                      : 'Не указан'}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className={styles.notice}>
          <div className={styles.noticeMain}>
            <div className={styles.noticeIcon}><UiIcon name="message" width={18} height={18} /></div>
            <div>
              <div className={styles.noticeTitle}>Общайтесь по задаче внутри сделки</div>
              <div className={styles.noticeText}>Условия, сообщения и итог сотрудничества сохраняются в одном чате.</div>
            </div>
          </div>
          <Link href={returnHref} className={styles.secondaryButton}>{returnLabel}</Link>
        </div>
      </div>
    </main>
  )
}
