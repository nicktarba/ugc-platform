'use client'

import { useEffect, useRef, useState } from 'react'
import UiIcon from '@/components/UiIcon'
import { useToast } from '@/components/Toast'
import { isValidUrl } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useApp } from '../../../AppContext'
import styles from '../../profile-settings.module.css'

type BusinessForm = {
  company_name: string
  inn: string
  website_url: string
  niche: string
  description: string
}

const EMPTY_FORM: BusinessForm = {
  company_name: '',
  inn: '',
  website_url: '',
  niche: '',
  description: '',
}

export default function BusinessProfilePage() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const { userId, businessProfile, setBusinessProfile } = useApp()
  const [form, setForm] = useState<BusinessForm>(EMPTY_FORM)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!businessProfile) return
    setForm({
      company_name: businessProfile.company_name || '',
      inn: businessProfile.inn || '',
      website_url: businessProfile.website_url || '',
      niche: businessProfile.niche || '',
      description: businessProfile.description || '',
    })
    setAvatarUrl(businessProfile.avatar_url || null)
  }, [businessProfile])

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.name === 'inn' ? event.target.value.replace(/\D/g, '') : event.target.value
    setForm(previous => ({ ...previous, [event.target.name]: value }))
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Максимум 5 МБ')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !userId) return avatarUrl
    const extension = avatarFile.name.split('.').pop()
    const path = `${userId}/logo.${extension}`
    const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
    if (error) {
      toast.error('Не удалось загрузить логотип')
      return avatarUrl
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userId) return
    if (!form.company_name.trim()) {
      toast.error('Укажи название компании')
      return
    }
    if (!/^\d{10}$|^\d{12}$/.test(form.inn.trim())) {
      toast.error('ИНН должен содержать 10 или 12 цифр')
      return
    }
    if (form.website_url && !isValidUrl(form.website_url)) {
      toast.error('Ссылка должна начинаться с https://')
      return
    }

    setSaving(true)
    const uploadedUrl = await uploadAvatar()
    const payload = {
      id: userId,
      company_name: form.company_name.trim(),
      inn: form.inn.trim(),
      website_url: form.website_url.trim(),
      niche: form.niche.trim(),
      description: form.description.trim(),
      avatar_url: uploadedUrl,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('business_profiles').upsert(payload)
    setSaving(false)

    if (error) {
      toast.error('Не удалось сохранить. Попробуй ещё раз.')
      return
    }

    if (uploadedUrl) setAvatarUrl(uploadedUrl)
    setAvatarFile(null)
    setAvatarPreview(null)
    setBusinessProfile({
      company_name: payload.company_name,
      inn: payload.inn,
      website_url: payload.website_url,
      niche: payload.niche,
      description: payload.description,
      avatar_url: uploadedUrl || undefined,
    })
    toast.success('Профиль сохранён')
  }

  const displayAvatar = avatarPreview || avatarUrl
  const initial = form.company_name?.[0]?.toUpperCase() || '?'
  const completedItems = [
    Boolean(displayAvatar),
    Boolean(form.company_name),
    /^\d{10}$|^\d{12}$/.test(form.inn),
    Boolean(form.niche),
    Boolean(form.description),
  ]
  const completion = Math.round((completedItems.filter(Boolean).length / completedItems.length) * 100)

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.eyebrow}>Кабинет бизнеса</div>
            <h1 className={styles.title}>Профиль компании</h1>
            <p className={styles.subtitle}>Авторы видят эти данные перед тем, как принять предложение и начать общение.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.contentGrid}>
          <aside className={styles.sidebarCard}>
            <div className={styles.previewCover}>
              <div className={styles.previewAvatar}>
                {displayAvatar ? <img src={displayAvatar} alt={form.company_name || 'Логотип компании'} /> : initial}
              </div>
            </div>
            <div className={styles.previewBody}>
              <h2 className={styles.previewName}>{form.company_name || 'Название компании'}</h2>
              <p className={styles.previewMeta}>{form.niche || 'Сфера деятельности'}</p>
              <p className={styles.previewBio}>{form.description || 'Расскажите авторам, чем занимается компания и какой формат сотрудничества вы предлагаете.'}</p>
              <div className={styles.completion}>
                <div className={styles.completionTop}><span>Заполнение профиля</span><strong>{completion}%</strong></div>
                <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${completion}%` }} /></div>
                <div className={styles.checkList}>
                  {[
                    ['Логотип', completedItems[0]],
                    ['Название компании', completedItems[1]],
                    ['Корректный ИНН', completedItems[2]],
                    ['Сфера деятельности', completedItems[3]],
                    ['Описание компании', completedItems[4]],
                  ].map(([label, done]) => (
                    <div className={`${styles.checkItem} ${done ? styles.checkDone : ''}`} key={String(label)}>
                      <span className={styles.checkIcon}>{done ? <UiIcon name="check" width={13} height={13} /> : null}</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className={styles.formCard}>
            <section className={styles.formSection}>
              <div className={styles.sectionHeading}>
                <div><h2 className={styles.sectionTitle}>Компания и логотип</h2><p className={styles.sectionText}>Базовые данные, по которым автор понимает, кто отправил предложение.</p></div>
              </div>
              <div className={styles.fieldGrid}>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Логотип компании</label>
                  <div className={styles.uploadRow}>
                    <button className={styles.uploadPreview} type="button" onClick={() => fileRef.current?.click()}>
                      {displayAvatar ? <img src={displayAvatar} alt="Логотип компании" /> : initial}
                    </button>
                    <div className={styles.uploadCopy}>
                      <button className={styles.secondaryButton} type="button" onClick={() => fileRef.current?.click()}>{displayAvatar ? 'Заменить логотип' : 'Загрузить логотип'}</button>
                      <p>JPG, PNG или WebP. Максимум 5 МБ.</p>
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} hidden />
                </div>
                <div className={styles.field}><label className={styles.label}>Название компании *</label><input className={styles.input} name="company_name" value={form.company_name} onChange={handleChange} required maxLength={160} placeholder="Например, студия «Вкус»" /></div>
                <div className={styles.field}><label className={styles.label}>ИНН *</label><input className={styles.input} name="inn" inputMode="numeric" value={form.inn} onChange={handleChange} required maxLength={12} placeholder="10 или 12 цифр" /><p className={styles.hint}>ИП — 12 цифр, юридическое лицо — 10 цифр.</p></div>
              </div>
            </section>

            <section className={styles.formSection}>
              <div className={styles.sectionHeading}>
                <div><h2 className={styles.sectionTitle}>О компании</h2><p className={styles.sectionText}>Контекст помогает автору быстрее оценить задачу и предложить подходящий формат.</p></div>
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}><label className={styles.label}>Сфера или ниша</label><input className={styles.input} name="niche" value={form.niche} onChange={handleChange} maxLength={200} placeholder="Кафе, косметика, автосервис, IT" /></div>
                <div className={styles.field}><label className={styles.label}>Сайт или основная соцсеть</label><input className={styles.input} name="website_url" value={form.website_url} onChange={handleChange} maxLength={500} placeholder="https://..." /></div>
                <div className={`${styles.field} ${styles.fieldFull}`}><label className={styles.label}>Описание компании</label><textarea className={styles.textarea} name="description" value={form.description} onChange={handleChange} maxLength={2000} placeholder="Чем вы занимаетесь, какие продукты продвигаете и с какими авторами хотите сотрудничать" /></div>
              </div>
            </section>

            <section className={styles.formSection}>
              <div className={styles.sectionHeading}>
                <div><h2 className={styles.sectionTitle}>Как это используется</h2><p className={styles.sectionText}>Эти данные не заменяют бриф, но делают первое предложение понятнее и повышают доверие.</p></div>
              </div>
              <div className={styles.actionList}>
                <div className={styles.actionItem}><UiIcon name="check" width={16} height={16} />Название и логотип отображаются в чате и заявках.</div>
                <div className={styles.actionItem}><UiIcon name="check" width={16} height={16} />ИНН подтверждает, от имени какой компании идёт общение.</div>
                <div className={styles.actionItem}><UiIcon name="check" width={16} height={16} />Сайт и описание помогают автору быстрее изучить продукт.</div>
              </div>
            </section>

            <div className={styles.formFooter}>
              <button className={styles.primaryButton} type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить изменения'}</button>
            </div>
          </div>
        </form>

        <div className={styles.mobileSignout}>
          <button className={styles.secondaryButton} type="button" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}>Выйти из аккаунта</button>
        </div>
      </div>
    </main>
  )
}
