'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import UiIcon from '@/components/UiIcon'
import ReviewsList from '@/components/ReviewsList'
import { useToast } from '@/components/Toast'
import { isValidUrl } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useApp } from '../../../AppContext'
import styles from '../../profile-settings.module.css'

const LIFESTYLE_GROUPS = [
  { label: 'Еда и напитки', tags: ['Кофе и кафе', 'Рестораны', 'Кондитерская', 'Бар', 'Суши и азиатская кухня', 'Домашняя кухня'] },
  { label: 'Спорт и здоровье', tags: ['Активный спорт', 'Фитнес и тренировки', 'Йога и пилатес', 'Единоборства', 'Танцы', 'ЗОЖ и питание', 'Нутрициология'] },
  { label: 'Стиль и красота', tags: ['Мода и стиль', 'Красота и уход', 'Барбершоп', 'Маникюр', 'Ювелирка и аксессуары'] },
  { label: 'Дом и интерьер', tags: ['Интерьер и декор', 'Ремонт', 'Мебель', 'Садоводство'] },
  { label: 'Семья', tags: ['Семья и дети', 'Беременность и материнство', 'Детское развитие'] },
  { label: 'Авто и мото', tags: ['Авто', 'Мотоциклы', 'Автосервис'] },
  { label: 'Путешествия', tags: ['Путешествия', 'Кемпинг и походы', 'Отели и курорты'] },
  { label: 'Технологии', tags: ['Технологии', 'Гаджеты', 'Игры и киберспорт', 'Стриминг'] },
  { label: 'Бизнес', tags: ['Бизнес', 'Маркетинг и SMM', 'Финансы и инвестиции', 'Недвижимость'] },
  { label: 'Культура', tags: ['Музыка', 'Кино и сериалы', 'Книги', 'Искусство', 'Фотография', 'Видеопродакшн'] },
  { label: 'Животные', tags: ['Собаки', 'Кошки', 'Ветеринария'] },
  { label: 'Образование', tags: ['Образование и курсы', 'Языки', 'Психология'] },
  { label: 'Медицина', tags: ['Медицина', 'Стоматология', 'Массаж и СПА'] },
  { label: 'Outdoor', tags: ['Рыбалка', 'Охота', 'Сёрфинг и водный спорт'] },
  { label: 'События', tags: ['Свадьбы и торжества', 'Флористика', 'Организация мероприятий'] },
]

type FormState = {
  name: string
  city: string
  instagram_url: string
  telegram_url: string
  telegram_followers: string
  followers_count: string
  stories_views: string
  occupation: string
  lifestyle: string[]
  hobbies: string
  bio: string
  open_to_barter: string
}

const EMPTY_FORM: FormState = {
  name: '', city: '', instagram_url: '', telegram_url: '', telegram_followers: '',
  followers_count: '', stories_views: '', occupation: '', lifestyle: [], hobbies: '',
  bio: '', open_to_barter: '',
}

function formatNumber(value: string | number | null | undefined) {
  const number = typeof value === 'string' ? Number(value) : Number(value || 0)
  return number > 0 ? number.toLocaleString('ru-RU') : '0'
}

export default function AuthorProfilePage() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const { userId, authorProfile: ctxProfile, setAuthorProfile } = useApp()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [authorId, setAuthorId] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [openGroup, setOpenGroup] = useState('Еда и напитки')

  useEffect(() => {
    if (!userId) return
    supabase
      .from('authors')
      .select('id, name, city, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, avatar_url, status, rejection_reason, completed_deals_count, avg_rating, reviews_count')
      .eq('user_id', userId)
      .single()
      .then(({ data: profile }) => {
        if (profile) {
          setForm({
            name: profile.name || '',
            city: profile.city || '',
            instagram_url: profile.instagram_url || '',
            telegram_url: profile.telegram_url || '',
            telegram_followers: profile.telegram_followers?.toString() || '',
            followers_count: profile.followers_count?.toString() || '',
            stories_views: profile.stories_views?.toString() || '',
            occupation: profile.occupation || '',
            lifestyle: profile.lifestyle || [],
            hobbies: profile.hobbies || '',
            bio: profile.bio || '',
            open_to_barter: profile.open_to_barter ? 'yes' : 'no',
          })
          setAvatarUrl(profile.avatar_url || null)
          setCurrentStatus(profile.status)
          setRejectionReason(profile.rejection_reason || null)
          setAuthorId(profile.id)
        } else {
          setEditing(true)
        }
        setProfileLoaded(true)
      })
  }, [userId])

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(previous => ({ ...previous, [event.target.name]: event.target.value }))
  }

  const toggleLifestyle = (item: string) => {
    setForm(previous => ({
      ...previous,
      lifestyle: previous.lifestyle.includes(item)
        ? previous.lifestyle.filter(tag => tag !== item)
        : [...previous.lifestyle, item],
    }))
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Поддерживаются JPG, PNG и WebP.')
      event.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимум 5 МБ.')
      event.target.value = ''
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !userId) return avatarUrl
    const extension = avatarFile.type === 'image/png'
      ? 'png'
      : avatarFile.type === 'image/webp'
        ? 'webp'
        : 'jpg'
    const path = `${userId}/avatar.${extension}`
    const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
    if (error) {
      toast.error('Не удалось загрузить фото.')
      return avatarUrl
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userId) return
    if (!form.name.trim() || !form.city.trim()) {
      toast.error('Заполни имя и город.')
      return
    }
    if (!isValidUrl(form.instagram_url)) {
      toast.error('Ссылка на Instagram должна начинаться с https://')
      return
    }
    if (form.telegram_url && !isValidUrl(form.telegram_url)) {
      toast.error('Ссылка на Telegram должна начинаться с https://')
      return
    }
    if (!form.open_to_barter) {
      toast.error('Укажи, готов ли ты к бартеру.')
      return
    }

    setLoading(true)
    const uploadedUrl = await uploadAvatar()
    const payload = {
      name: form.name.trim(),
      city: form.city.trim(),
      instagram_url: form.instagram_url.trim(),
      telegram_url: form.telegram_url.trim() || null,
      telegram_followers: parseInt(form.telegram_followers) || 0,
      followers_count: parseInt(form.followers_count) || 0,
      stories_views: parseInt(form.stories_views) || 0,
      occupation: form.occupation.trim(),
      lifestyle: form.lifestyle,
      hobbies: form.hobbies.trim(),
      bio: form.bio.trim(),
      open_to_barter: form.open_to_barter === 'yes',
      avatar_url: uploadedUrl,
      user_id: userId,
    }

    let error = null
    if (authorId) {
      const updatePayload = currentStatus === 'rejected' ? { ...payload, status: 'pending' } : payload
      const result = await supabase.from('authors').update(updatePayload).eq('user_id', userId)
      error = result.error
    } else {
      const result = await supabase.from('authors').insert([{ ...payload, status: 'pending' }])
      error = result.error
    }

    setLoading(false)
    if (error) {
      toast.error('Ошибка при сохранении. Попробуй ещё раз.')
      return
    }

    if (uploadedUrl) setAvatarUrl(uploadedUrl)
    setAvatarFile(null)
    setAvatarPreview(null)
    const nextStatus = currentStatus === 'rejected' || !currentStatus ? 'pending' : currentStatus
    setCurrentStatus(nextStatus)
    setRejectionReason(null)
    toast.success(currentStatus === 'rejected' ? 'Анкета отправлена на повторную проверку' : 'Профиль сохранён')
    setAuthorProfile({
      id: authorId || '',
      name: form.name.trim(),
      city: form.city.trim(),
      instagram_url: form.instagram_url.trim(),
      telegram_url: form.telegram_url.trim() || null,
      telegram_followers: parseInt(form.telegram_followers) || 0,
      followers_count: parseInt(form.followers_count) || 0,
      stories_views: parseInt(form.stories_views) || 0,
      occupation: form.occupation.trim(),
      hobbies: form.hobbies.trim(),
      bio: form.bio.trim(),
      lifestyle: form.lifestyle,
      open_to_barter: form.open_to_barter === 'yes',
      status: nextStatus,
      avatar_url: uploadedUrl || undefined,
      completed_deals_count: ctxProfile?.completed_deals_count || 0,
      avg_rating: ctxProfile?.avg_rating || null,
      reviews_count: ctxProfile?.reviews_count || 0,
    })
    setEditing(false)
  }

  const cancelEditing = () => {
    setEditing(false)
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const copyProfileLink = async () => {
    if (!authorId) return
    await navigator.clipboard.writeText(`${window.location.origin}/author/${authorId}`)
    toast.success('Ссылка скопирована')
  }

  const displayAvatar = avatarPreview || avatarUrl
  const profileInitial = form.name?.[0]?.toUpperCase() || '?'
  const completedItems = [
    Boolean(displayAvatar),
    Boolean(form.name && form.city),
    Boolean(form.instagram_url),
    form.lifestyle.length >= 3,
    Boolean(form.bio),
  ]
  const completion = Math.round((completedItems.filter(Boolean).length / completedItems.length) * 100)

  if (!profileLoaded) return null

  if (!editing) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.topbar}>
            <div>
              <div className={styles.eyebrow}>Профиль автора</div>
              <h1 className={styles.title}>Ваш профиль</h1>
              <p className={styles.subtitle}>Так бизнес видит вас в каталоге и перед отправкой предложения.</p>
            </div>
            <div className={styles.topActions}>
              {authorId && currentStatus === 'approved' && (
                <Link className={styles.secondaryButton} href={`/author/${authorId}`}>
                  <UiIcon name="external" width={16} height={16} />
                  Открыть профиль
                </Link>
              )}
              <button className={styles.primaryButton} type="button" onClick={() => setEditing(true)}>
                Редактировать
              </button>
            </div>
          </div>

          <div className={styles.statusRow}>
            {currentStatus === 'approved' && <span className={`${styles.status} ${styles.statusApproved}`}><UiIcon name="check" width={14} height={14} />Профиль опубликован</span>}
            {currentStatus === 'pending' && <span className={`${styles.status} ${styles.statusPending}`}><UiIcon name="shield" width={14} height={14} />На модерации</span>}
            {currentStatus === 'rejected' && <span className={`${styles.status} ${styles.statusRejected}`}><UiIcon name="flag" width={14} height={14} />Нужны исправления</span>}
          </div>

          {currentStatus === 'rejected' && (
            <div className={styles.notice}>
              <UiIcon name="flag" width={18} height={18} />
              <div><strong>Комментарий модератора:</strong><br />{rejectionReason || 'Проверь данные профиля и отправь анкету повторно.'}</div>
            </div>
          )}

          <div className={styles.viewGrid}>
            <section className={`${styles.sectionCard} ${styles.profileSummary}`}>
              <div className={styles.summaryTop}>
                <div className={styles.summaryAvatar}>
                  {displayAvatar ? <img src={displayAvatar} alt={form.name} /> : profileInitial}
                </div>
                <div>
                  <h2 className={styles.summaryName}>{form.name || 'Имя не указано'}</h2>
                  <p className={styles.summaryMeta}>{[form.city, form.occupation].filter(Boolean).join(' · ') || 'Заполните город и профессию'}</p>
                  {form.open_to_barter === 'yes' && <div className={styles.selectedTags}><span className={styles.selectedTag}>Готов к бартеру</span></div>}
                </div>
              </div>

              <div className={styles.summaryStats}>
                <div className={styles.summaryStat}><strong>{formatNumber(form.followers_count)}</strong><span>подписчиков</span></div>
                <div className={styles.summaryStat}><strong>{formatNumber(form.stories_views)}</strong><span>просмотров сторис</span></div>
                <div className={styles.summaryStat}><strong>{ctxProfile?.avg_rating || '—'}</strong><span>рейтинг</span></div>
              </div>

              <div className={styles.summarySection}>
                <h3>О себе</h3>
                <p>{form.bio || 'Добавьте описание: какой контент вы создаёте, с какими темами работаете и чем можете быть полезны бизнесу.'}</p>
              </div>

              <div className={styles.summarySection}>
                <h3>Темы контента</h3>
                <div className={styles.tags}>
                  {form.lifestyle.length > 0
                    ? form.lifestyle.map(tag => <span className={styles.tag} key={tag}>{tag}</span>)
                    : <p>Темы пока не выбраны.</p>}
                </div>
              </div>

              {form.hobbies && <div className={styles.summarySection}><h3>Хобби и интересы</h3><p>{form.hobbies}</p></div>}
            </section>

            <aside className={`${styles.sectionCard} ${styles.actionCard}`}>
              <h2>{currentStatus === 'approved' ? 'Профиль готов к работе' : currentStatus === 'rejected' ? 'Исправьте замечания' : 'Ожидайте проверку'}</h2>
              <p>{currentStatus === 'approved'
                ? 'Поделитесь ссылкой с бизнесом или обновляйте данные, чтобы получать более подходящие предложения.'
                : currentStatus === 'rejected'
                  ? 'Обновите данные и сохраните профиль. После этого анкета снова уйдёт на модерацию.'
                  : 'После одобрения профиль появится в каталоге, а бизнес сможет отправлять предложения.'}</p>
              {currentStatus === 'approved' && (
                <button className={styles.secondaryButton} type="button" onClick={copyProfileLink}>
                  <UiIcon name="share" width={16} height={16} />
                  Скопировать ссылку
                </button>
              )}
              <div className={styles.actionList}>
                <div className={styles.actionItem}><UiIcon name="check" width={16} height={16} />Профиль виден бизнесу в каталоге</div>
                <div className={styles.actionItem}><UiIcon name="check" width={16} height={16} />Предложения появятся в разделе «Запросы»</div>
                <div className={styles.actionItem}><UiIcon name="check" width={16} height={16} />Отзывы после сделок повышают рейтинг</div>
              </div>
            </aside>
          </div>

          {authorId && currentStatus === 'approved' && (ctxProfile?.reviews_count || 0) > 0 && (
            <section className={styles.reviews}>
              <ReviewsList authorId={authorId} avgRating={ctxProfile?.avg_rating || null} reviewsCount={ctxProfile?.reviews_count || 0} currentUserId={userId} />
            </section>
          )}

          <div className={styles.mobileSignout}>
            <button className={styles.secondaryButton} type="button" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}>Выйти из аккаунта</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.eyebrow}>{authorId ? 'Настройки профиля' : 'Анкета автора'}</div>
            <h1 className={styles.title}>{authorId ? 'Редактирование профиля' : 'Создайте профиль автора'}</h1>
            <p className={styles.subtitle}>Заполните данные честно и подробно. Они используются в каталоге, обычном поиске и ИИ-подборе.</p>
          </div>
          {authorId && <button className={styles.secondaryButton} type="button" onClick={cancelEditing}>Закрыть</button>}
        </div>

        {currentStatus === 'rejected' && (
          <div className={styles.notice}>
            <UiIcon name="flag" width={18} height={18} />
            <div><strong>Комментарий модератора:</strong><br />{rejectionReason || 'Проверь данные профиля и отправь анкету повторно.'}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.contentGrid}>
          <aside className={styles.sidebarCard}>
            <div className={styles.previewCover}>
              <div className={styles.previewAvatar}>
                {displayAvatar ? <img src={displayAvatar} alt={form.name || 'Фото профиля'} /> : profileInitial}
              </div>
            </div>
            <div className={styles.previewBody}>
              <h2 className={styles.previewName}>{form.name || 'Ваше имя'}</h2>
              <p className={styles.previewMeta}>{[form.city, form.occupation].filter(Boolean).join(' · ') || 'Город · профессия'}</p>
              <p className={styles.previewBio}>{form.bio || 'Короткое описание поможет бизнесу понять ваш стиль и формат контента.'}</p>
              <div className={styles.previewStats}>
                <div className={styles.previewStat}><strong>{formatNumber(form.followers_count)}</strong><span>подписчиков</span></div>
                <div className={styles.previewStat}><strong>{formatNumber(form.stories_views)}</strong><span>сторис</span></div>
                <div className={styles.previewStat}><strong>{form.lifestyle.length}</strong><span>тем</span></div>
              </div>
              <div className={styles.completion}>
                <div className={styles.completionTop}><span>Заполнение профиля</span><strong>{completion}%</strong></div>
                <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${completion}%` }} /></div>
                <div className={styles.checkList}>
                  {[
                    ['Фото профиля', completedItems[0]],
                    ['Имя и город', completedItems[1]],
                    ['Ссылка на соцсеть', completedItems[2]],
                    ['Минимум 3 темы', completedItems[3]],
                    ['Описание профиля', completedItems[4]],
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
                <div><h2 className={styles.sectionTitle}>Основная информация</h2><p className={styles.sectionText}>Фото, имя, город и краткое позиционирование.</p></div>
              </div>
              <div className={styles.fieldGrid}>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Фото профиля</label>
                  <div className={styles.uploadRow}>
                    <button className={`${styles.uploadPreview} ${styles.uploadPreviewRound}`} type="button" onClick={() => fileRef.current?.click()}>
                      {displayAvatar ? <img src={displayAvatar} alt="Фото профиля" /> : profileInitial}
                    </button>
                    <div className={styles.uploadCopy}>
                      <button className={styles.secondaryButton} type="button" onClick={() => fileRef.current?.click()}>{displayAvatar ? 'Заменить фото' : 'Загрузить фото'}</button>
                      <p>JPG, PNG или WebP. Максимум 5 МБ.</p>
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} hidden />
                </div>
                <div className={styles.field}><label className={styles.label}>Имя или псевдоним *</label><input className={styles.input} name="name" value={form.name} onChange={handleChange} required maxLength={100} placeholder="Как к вам обращаться" /></div>
                <div className={styles.field}><label className={styles.label}>Город *</label><input className={styles.input} name="city" value={form.city} onChange={handleChange} required maxLength={100} placeholder="Например, Владивосток" /></div>
                <div className={`${styles.field} ${styles.fieldFull}`}><label className={styles.label}>Профессия или роль</label><input className={styles.input} name="occupation" value={form.occupation} onChange={handleChange} maxLength={200} placeholder="Фитнес-тренер, фотограф, молодая мама" /></div>
              </div>
            </section>

            <section className={styles.formSection}>
              <div className={styles.sectionHeading}>
                <div><h2 className={styles.sectionTitle}>Соцсети и показатели</h2><p className={styles.sectionText}>Данные пока вводятся вручную и отображаются в профиле.</p></div>
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}><label className={styles.label}>Instagram *</label><input className={styles.input} name="instagram_url" value={form.instagram_url} onChange={handleChange} required maxLength={500} placeholder="https://instagram.com/username" /></div>
                <div className={styles.field}><label className={styles.label}>Telegram</label><input className={styles.input} name="telegram_url" value={form.telegram_url} onChange={handleChange} maxLength={500} placeholder="https://t.me/username" /></div>
                <div className={styles.field}><label className={styles.label}>Подписчики Instagram</label><input className={styles.input} name="followers_count" type="number" min="0" value={form.followers_count} onChange={handleChange} placeholder="1500" /></div>
                <div className={styles.field}><label className={styles.label}>Подписчики Telegram</label><input className={styles.input} name="telegram_followers" type="number" min="0" value={form.telegram_followers} onChange={handleChange} placeholder="500" /></div>
                <div className={`${styles.field} ${styles.fieldFull}`}><label className={styles.label}>Средние просмотры сторис</label><input className={styles.input} name="stories_views" type="number" min="0" value={form.stories_views} onChange={handleChange} placeholder="300" /></div>
              </div>
            </section>

            <section className={styles.formSection}>
              <div className={styles.sectionHeading}>
                <div><h2 className={styles.sectionTitle}>Темы контента</h2><p className={styles.sectionText}>Выберите всё подходящее. Теги влияют на обычный поиск и ИИ-подбор.</p></div>
              </div>
              <div className={styles.accordionList}>
                {LIFESTYLE_GROUPS.map(group => {
                  const selectedCount = group.tags.filter(tag => form.lifestyle.includes(tag)).length
                  const opened = openGroup === group.label
                  return (
                    <div className={styles.accordion} key={group.label}>
                      <button className={styles.accordionButton} type="button" onClick={() => setOpenGroup(opened ? '' : group.label)}>
                        <span>{group.label}</span>
                        <span className={styles.accordionCount}>{selectedCount > 0 ? `${selectedCount} выбрано` : opened ? 'Скрыть' : 'Выбрать'}</span>
                      </button>
                      {opened && <div className={styles.accordionBody}>{group.tags.map(tag => <button className={`${styles.tagButton} ${form.lifestyle.includes(tag) ? styles.tagButtonActive : ''}`} key={tag} type="button" onClick={() => toggleLifestyle(tag)}>{tag}</button>)}</div>}
                    </div>
                  )
                })}
              </div>
              {form.lifestyle.length > 0 && <div className={styles.selectedTags}>{form.lifestyle.map(tag => <span className={styles.selectedTag} key={tag}>{tag}</span>)}</div>}
            </section>

            <section className={styles.formSection}>
              <div className={styles.sectionHeading}>
                <div><h2 className={styles.sectionTitle}>О себе и условия</h2><p className={styles.sectionText}>Помогите бизнесу понять ваш характер, опыт и формат сотрудничества.</p></div>
              </div>
              <div className={styles.fieldGrid}>
                <div className={`${styles.field} ${styles.fieldFull}`}><label className={styles.label}>О себе</label><textarea className={styles.textarea} name="bio" value={form.bio} onChange={handleChange} maxLength={2000} placeholder="Какой контент вы создаёте, что умеете и с какими проектами хотите работать" /></div>
                <div className={`${styles.field} ${styles.fieldFull}`}><label className={styles.label}>Хобби и дополнительные интересы</label><input className={styles.input} name="hobbies" value={form.hobbies} onChange={handleChange} maxLength={500} placeholder="Серфинг, готовка, настольные игры" /></div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label}>Готовы к бартеру? *</label>
                  <div className={styles.segmented}>
                    <button className={`${styles.segment} ${form.open_to_barter === 'yes' ? styles.segmentActive : ''}`} type="button" onClick={() => setForm(previous => ({ ...previous, open_to_barter: 'yes' }))}>Да, рассматриваю</button>
                    <button className={`${styles.segment} ${form.open_to_barter === 'no' ? styles.segmentActive : ''}`} type="button" onClick={() => setForm(previous => ({ ...previous, open_to_barter: 'no' }))}>Только оплата</button>
                  </div>
                </div>
              </div>
            </section>

            <div className={styles.formFooter}>
              {authorId && <button className={styles.secondaryButton} type="button" onClick={cancelEditing}>Отмена</button>}
              <button className={styles.primaryButton} type="submit" disabled={loading}>{loading ? 'Сохраняем…' : authorId ? 'Сохранить профиль' : 'Отправить на модерацию'}</button>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}
