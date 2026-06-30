'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { isValidUrl } from '@/lib/format'
import { useApp } from '../../../AppContext'
import ReviewsList from '@/components/ReviewsList'

const LIFESTYLE = ['Активный спорт','ЗОЖ и питание','Кофе и кафе','Рестораны','Путешествия','Авто','Мода и стиль','Красота и уход','Семья и дети','Технологии','Музыка','Кино и сериалы','Книги','Искусство','Бизнес']

export default function AuthorProfilePage() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const { userId, authorProfile: ctxProfile, setAuthorProfile } = useApp()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name:'', city:'', instagram_url:'', telegram_url:'', telegram_followers:'', followers_count:'', stories_views:'', occupation:'', lifestyle:[] as string[], hobbies:'', bio:'', open_to_barter:'' })
  const [avatarUrl, setAvatarUrl] = useState<string|null>(null)
  const [avatarFile, setAvatarFile] = useState<File|null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<string|null>(null)
  const [rejectionReason, setRejectionReason] = useState<string|null>(null)
  const [authorId, setAuthorId] = useState<string|null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!userId) return
    supabase.from('authors').select('id, name, city, instagram_url, telegram_url, followers_count, telegram_followers, stories_views, occupation, lifestyle, hobbies, bio, open_to_barter, avatar_url, status, rejection_reason, completed_deals_count, avg_rating, reviews_count').eq('user_id', userId).single().then(({ data: p }) => {
      if (p) {
        setForm({
          name: p.name || '', city: p.city || '', instagram_url: p.instagram_url || '',
          telegram_url: p.telegram_url || '', telegram_followers: p.telegram_followers?.toString() || '',
          followers_count: p.followers_count?.toString() || '', stories_views: p.stories_views?.toString() || '',
          occupation: p.occupation || '', lifestyle: p.lifestyle || [], hobbies: p.hobbies || '',
          bio: p.bio || '', open_to_barter: p.open_to_barter ? 'yes' : 'no',
        })
        setAvatarUrl(p.avatar_url || null)
        setCurrentStatus(p.status)
        setRejectionReason(p.rejection_reason || null)
        setAuthorId(p.id)
      } else { setEditing(true) }
      setProfileLoaded(true)
    })
  }, [userId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm({...form, [e.target.name]: e.target.value})
  const toggleLifestyle = (item: string) => setForm(prev => ({ ...prev, lifestyle: prev.lifestyle.includes(item) ? prev.lifestyle.filter(i => i !== item) : [...prev.lifestyle, item] }))

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Файл слишком большой. Максимум 5 МБ.'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async (): Promise<string|null> => {
    if (!avatarFile || !userId) return avatarUrl
    const ext = avatarFile.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
    if (error) { toast.error('Не удалось загрузить фото.'); return avatarUrl }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    if (!isValidUrl(form.instagram_url)) { toast.error('Ссылка на Instagram должна начинаться с https://'); return }
    if (form.telegram_url && !isValidUrl(form.telegram_url)) { toast.error('Ссылка на Telegram должна начинаться с https://'); return }
    setLoading(true)
    const uploadedUrl = await uploadAvatar()
    const payload = {
      name: form.name, city: form.city, instagram_url: form.instagram_url,
      telegram_url: form.telegram_url || null, telegram_followers: parseInt(form.telegram_followers)||0,
      followers_count: parseInt(form.followers_count)||0, stories_views: parseInt(form.stories_views)||0,
      occupation: form.occupation, lifestyle: form.lifestyle, hobbies: form.hobbies, bio: form.bio,
      open_to_barter: form.open_to_barter === 'yes', avatar_url: uploadedUrl, user_id: userId,
    }
    let err
    if (authorId) {
      const updatePayload = currentStatus === 'rejected' ? { ...payload, status: 'pending' } : payload
      const { error: e } = await supabase.from('authors').update(updatePayload).eq('user_id', userId)
      err = e
    } else {
      const { error: e } = await supabase.from('authors').insert([{ ...payload, status: 'pending' }])
      err = e
    }
    setLoading(false)
    if (err) { toast.error('Ошибка при сохранении. Попробуй ещё раз.'); return }
    if (uploadedUrl) setAvatarUrl(uploadedUrl)
    setAvatarFile(null); setAvatarPreview(null)
    toast.success(currentStatus === 'rejected' ? 'Анкета отправлена на повторную проверку' : 'Профиль сохранён')
    setAuthorProfile({
      id: authorId || '',
      name: form.name,
      city: form.city,
      instagram_url: form.instagram_url,
      telegram_url: form.telegram_url || null,
      telegram_followers: parseInt(form.telegram_followers) || 0,
      followers_count: parseInt(form.followers_count) || 0,
      stories_views: parseInt(form.stories_views) || 0,
      occupation: form.occupation,
      hobbies: form.hobbies,
      bio: form.bio,
      lifestyle: form.lifestyle,
      open_to_barter: form.open_to_barter === 'yes',
      status: currentStatus === 'rejected' ? 'pending' : (currentStatus || 'pending'),
      avatar_url: uploadedUrl || undefined,
      completed_deals_count: ctxProfile?.completed_deals_count || 0,
      avg_rating: ctxProfile?.avg_rating || null,
      reviews_count: ctxProfile?.reviews_count || 0,
    })
    setEditing(false)
    if (!authorId) setCurrentStatus('pending')
  }

  const inp = { width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'15px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }
  const lbl = { display:'block' as const, fontSize:'14px', fontWeight:600, color:'#1a1a1a', marginBottom:'8px' }
  const displayAvatar = avatarPreview || avatarUrl

  if (!profileLoaded) return null

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'720px', margin:'0 auto', padding:'clamp(24px, 6vw, 48px) clamp(16px, 5vw, 40px)' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
          <div>
            {!editing && currentStatus === 'pending' && <span style={{ fontSize:'13px', color:'#c17f3e', fontWeight:500 }}>⏳ На модерации</span>}
            {!editing && currentStatus === 'approved' && <span style={{ fontSize:'13px', color:'#16a34a', fontWeight:500 }}>✓ В каталоге</span>}
            {!editing && currentStatus === 'rejected' && <span style={{ fontSize:'13px', color:'#dc2626', fontWeight:500 }}>Не прошёл модерацию</span>}
            {editing && <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'28px', fontWeight:700, color:'#1a1a1a' }}>{authorId ? 'Редактировать профиль' : 'Заполнить анкету'}</h1>}
          </div>
          {!editing && authorId && (
            <button onClick={() => setEditing(true)} style={{ padding:'9px 18px', background:'#1a1a1a', border:'none', borderRadius:'100px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Редактировать</button>
          )}
          {editing && authorId && (
            <button onClick={() => { setEditing(false); setAvatarFile(null); setAvatarPreview(null) }} style={{ padding:'9px 18px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', color:'#5a5650', fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Отмена</button>
          )}
        </div>

        {currentStatus === 'rejected' && (
          <div style={{ padding:'12px 20px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', marginBottom:'20px', fontSize:'14px', color:'#dc2626' }}>
            Анкета не прошла модерацию. {rejectionReason ? `Причина: ${rejectionReason}. ` : ''}Отредактируй и отправь повторно.
          </div>
        )}

        {/* Пустое состояние */}
        {!editing && !authorId && (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'32px', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>✍️</div>
            <h3 style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Заполни анкету</h3>
            <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'24px', lineHeight:1.6 }}>Чтобы бизнесы могли найти тебя в каталоге — нужно заполнить профиль.</p>
            <button onClick={() => setEditing(true)} style={{ padding:'12px 32px', background:'#1a1a1a', borderRadius:'100px', border:'none', color:'#fff', fontSize:'15px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Заполнить анкету</button>
          </div>
        )}

        {/* ═══ ПУБЛИЧНЫЙ ВИД ПРОФИЛЯ ═══ */}
        {!editing && authorId && (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', overflow:'hidden', marginBottom:'12px' }}>
            <div style={{ padding:'24px', borderBottom:'1px solid #f0ede6' }}>
              <div style={{ display:'flex', gap:'16px', alignItems:'flex-start' }}>
                <div style={{ width:'72px', height:'72px', borderRadius:'50%', overflow:'hidden', background:'#fdf3e7', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', fontWeight:700, color:'#c17f3e' }}>
                  {avatarUrl ? <img src={avatarUrl} alt={form.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (form.name?.[0]?.toUpperCase() || '?')}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'6px' }}>
                    <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'24px', fontWeight:700, color:'#1a1a1a', margin:0 }}>{form.name}</h1>
                    {form.open_to_barter === 'yes' && <span style={{ padding:'2px 8px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#16a34a' }}>Бартер</span>}
                    {ctxProfile?.avg_rating && <span style={{ padding:'2px 8px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'100px', fontSize:'11px', fontWeight:600, color:'#c17f3e' }}>★ {ctxProfile.avg_rating} · {ctxProfile.reviews_count} отз.</span>}
                  </div>
                  <div style={{ fontSize:'13px', color:'#9a9590', marginBottom:'10px' }}>
                    {form.city && <>📍 {form.city}</>}{form.occupation ? ` · ${form.occupation}` : ''}
                  </div>
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                    {form.instagram_url && <a href={form.instagram_url} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 12px', border:'1.5px solid #e0ddd8', borderRadius:'100px', fontSize:'12px', color:'#1a1a1a', textDecoration:'none', fontWeight:500 }}>📸 Instagram</a>}
                    {form.telegram_url && <a href={form.telegram_url} target="_blank" rel="noopener noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'5px 12px', border:'1.5px solid #e0ddd8', borderRadius:'100px', fontSize:'12px', color:'#1a1a1a', textDecoration:'none', fontWeight:500 }}>✈️ Telegram</a>}
                  </div>
                </div>
              </div>
            </div>

            {(form.followers_count || form.telegram_followers || form.stories_views) && (
              <div style={{ display:'flex', flexWrap:'wrap', borderBottom:'1px solid #f0ede6' }}>
                {form.followers_count && parseInt(form.followers_count) > 0 && (
                  <div style={{ flex:'1 1 100px', padding:'14px 20px', borderRight:'1px solid #f0ede6' }}>
                    <div style={{ fontSize:'11px', color:'#9a9590', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>Instagram</div>
                    <div style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a' }}>{parseInt(form.followers_count).toLocaleString('ru')}</div>
                    <div style={{ fontSize:'12px', color:'#9a9590' }}>подписчиков</div>
                  </div>
                )}
                {form.telegram_followers && parseInt(form.telegram_followers) > 0 && (
                  <div style={{ flex:'1 1 100px', padding:'14px 20px', borderRight:'1px solid #f0ede6' }}>
                    <div style={{ fontSize:'11px', color:'#9a9590', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>Telegram</div>
                    <div style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a' }}>{parseInt(form.telegram_followers).toLocaleString('ru')}</div>
                    <div style={{ fontSize:'12px', color:'#9a9590' }}>подписчиков</div>
                  </div>
                )}
                {form.stories_views && parseInt(form.stories_views) > 0 && (
                  <div style={{ flex:'1 1 100px', padding:'14px 20px' }}>
                    <div style={{ fontSize:'11px', color:'#9a9590', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'4px' }}>Сторис</div>
                    <div style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a' }}>{parseInt(form.stories_views).toLocaleString('ru')}</div>
                    <div style={{ fontSize:'12px', color:'#9a9590' }}>просм. в среднем</div>
                  </div>
                )}
              </div>
            )}

            {(form.bio || form.lifestyle?.length > 0) && (
              <div style={{ padding:'18px 24px', borderBottom: form.hobbies ? '1px solid #f0ede6' : 'none' }}>
                {form.bio && <p style={{ fontSize:'14px', color:'#5a5650', lineHeight:1.7, margin:'0 0 12px' }}>{form.bio}</p>}
                {form.lifestyle?.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                    {form.lifestyle.map(tag => <span key={tag} style={{ padding:'4px 10px', background:'#f0ede6', borderRadius:'100px', fontSize:'12px', color:'#7a7570', fontWeight:500 }}>{tag}</span>)}
                  </div>
                )}
              </div>
            )}

            {form.hobbies && (
              <div style={{ padding:'14px 24px' }}>
                <span style={{ fontSize:'13px', color:'#9a9590' }}>Хобби: </span>
                <span style={{ fontSize:'13px', color:'#5a5650' }}>{form.hobbies}</span>
              </div>
            )}
          </div>
        )}

        {!editing && authorId && currentStatus === 'approved' && (
          <div style={{ textAlign:'center', paddingTop:'4px', marginBottom:'24px' }}>
            <Link href={`/author/${authorId}`} target="_blank" style={{ fontSize:'13px', color:'#9a9590', textDecoration:'none' }}>Открыть публичный профиль →</Link>
          </div>
        )}

        {/* Отзывы */}
        {!editing && authorId && currentStatus === 'approved' && (ctxProfile?.reviews_count || 0) > 0 && (
          <div>
            <h2 style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', marginBottom:'16px' }}>
              Отзывы
              {ctxProfile?.avg_rating && <span style={{ fontFamily:'inherit', fontSize:'16px', fontWeight:500, color:'#c17f3e', marginLeft:'10px' }}>★ {ctxProfile.avg_rating}</span>}
            </h2>
            <ReviewsList authorId={authorId} avgRating={ctxProfile?.avg_rating || null} reviewsCount={ctxProfile?.reviews_count || 0} currentUserId={userId} />
          </div>
        )}

        {/* ═══ ФОРМА РЕДАКТИРОВАНИЯ ═══ */}
        {editing && (
          <form onSubmit={handleSubmit}>
            <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px', display:'flex', flexDirection:'column', gap:'20px' }}>
              <div>
                <label style={lbl}>Фото профиля</label>
                <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                  <div onClick={() => fileRef.current?.click()} style={{ width:'72px', height:'72px', borderRadius:'50%', background:'#f0ede6', border:'2px dashed #d4d0c8', cursor:'pointer', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', opacity: loading && avatarFile ? 0.5 : 1, transition:'opacity 0.2s' }}>
                    {loading && avatarFile ? '⏳' : displayAvatar ? <img src={displayAvatar} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📷'}
                  </div>
                  <div>
                    <button type="button" onClick={() => fileRef.current?.click()} style={{ padding:'8px 16px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:500, fontFamily:'inherit', color:'#1a1a1a' }}>
                      {displayAvatar ? 'Заменить' : 'Загрузить фото'}
                    </button>
                    <p style={{ fontSize:'12px', color:'#9a9590', marginTop:'4px' }}>JPG или PNG, до 5 МБ</p>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} style={{ display:'none' }} />
              </div>
              <div><label style={lbl}>Имя / псевдоним *</label><input name="name" value={form.name} onChange={handleChange} required placeholder="Как тебя называть" style={inp} maxLength={100} /></div>
              <div><label style={lbl}>Город *</label><input name="city" value={form.city} onChange={handleChange} required placeholder="Москва, Питер, Краснодар..." style={inp} maxLength={100} /></div>
              <div><label style={lbl}>Ссылка на Instagram *</label><input name="instagram_url" value={form.instagram_url} onChange={handleChange} required placeholder="https://instagram.com/username" style={inp} maxLength={500} /></div>
              <div><label style={lbl}>Telegram</label><input name="telegram_url" value={form.telegram_url} onChange={handleChange} placeholder="https://t.me/username" style={inp} maxLength={500} /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                <div><label style={lbl}>Подписчиков Instagram</label><input name="followers_count" type="number" value={form.followers_count} onChange={handleChange} placeholder="1500" style={inp} /></div>
                <div><label style={lbl}>Подписчиков Telegram</label><input name="telegram_followers" type="number" value={form.telegram_followers} onChange={handleChange} placeholder="500" style={inp} /></div>
              </div>
              <div><label style={lbl}>Просмотры сторис</label><input name="stories_views" type="number" value={form.stories_views} onChange={handleChange} placeholder="300" style={inp} /></div>
              <div><label style={lbl}>Кем работаешь</label><input name="occupation" value={form.occupation} onChange={handleChange} placeholder="Фитнес-тренер, студент, дизайнер..." style={inp} maxLength={200} /></div>
              <div>
                <label style={lbl}>Стиль жизни</label>
                <p style={{ fontSize:'13px', color:'#9a9590', marginBottom:'10px' }}>Выбери всё что подходит</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                  {LIFESTYLE.map(item => (
                    <button key={item} type="button" onClick={() => toggleLifestyle(item)} style={{ padding:'7px 14px', borderRadius:'100px', fontSize:'13px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', borderColor: form.lifestyle.includes(item) ? '#c17f3e' : '#e0ddd8', background: form.lifestyle.includes(item) ? '#fdf3e7' : '#fff', color: form.lifestyle.includes(item) ? '#c17f3e' : '#5a5650' }}>{item}</button>
                  ))}
                </div>
              </div>
              <div><label style={lbl}>Хобби</label><input name="hobbies" value={form.hobbies} onChange={handleChange} placeholder="Серфинг, готовка, настольные игры..." style={inp} maxLength={500} /></div>
              <div><label style={lbl}>О себе</label><textarea name="bio" value={form.bio} onChange={handleChange} rows={4} placeholder="Пару слов о том, кто ты..." style={{ ...inp, resize:'vertical' }} maxLength={2000} /></div>
              <div>
                <label style={lbl}>Готов к бартеру? *</label>
                <div style={{ display:'flex', gap:'12px' }}>
                  {[{val:'yes',label:'Да'},{val:'no',label:'Нет'}].map(opt => (
                    <button key={opt.val} type="button" onClick={() => setForm({...form, open_to_barter: opt.val})} style={{ padding:'10px 28px', borderRadius:'100px', fontSize:'15px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', borderColor: form.open_to_barter === opt.val ? '#1a1a1a' : '#e0ddd8', background: form.open_to_barter === opt.val ? '#1a1a1a' : '#fff', color: form.open_to_barter === opt.val ? '#fff' : '#5a5650' }}>{opt.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:'12px', paddingTop:'8px' }}>
                <button type="submit" disabled={loading} style={{ flex:1, padding:'14px', background: loading ? '#9a9590' : '#1a1a1a', borderRadius:'100px', border:'none', color:'#fff', fontSize:'15px', fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
                  {loading ? 'Сохраняем...' : authorId ? 'Сохранить' : 'Отправить анкету'}
                </button>
                {authorId && (
                  <button type="button" onClick={() => { setEditing(false); setAvatarFile(null); setAvatarPreview(null) }} style={{ padding:'14px 24px', border:'1.5px solid #e0ddd8', borderRadius:'100px', background:'#fff', color:'#5a5650', fontSize:'15px', fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Отмена</button>
                )}
              </div>
            </div>
          </form>
        )}

        <div className="mobile-only" style={{ marginTop:'24px', paddingTop:'24px', borderTop:'1px solid #f0ede6', textAlign:'center' }}>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }} style={{ padding:'10px 24px', border:'1px solid #e0ddd8', borderRadius:'100px', background:'#fff', color:'#9a9590', fontSize:'14px', fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>Выйти из аккаунта</button>
        </div>
      </div>
    </main>
  )
}

