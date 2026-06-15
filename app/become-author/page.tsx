'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

const LIFESTYLE = ['Активный спорт','ЗОЖ и питание','Кофе и кафе','Рестораны','Путешествия','Авто','Мода и стиль','Красота и уход','Семья и дети','Технологии','Музыка','Кино и сериалы','Книги','Искусство','Бизнес']

export default function BecomeAuthorPage() {
  const router = useRouter()
  const toast = useToast()
  const [form, setForm] = useState({ name:'', city:'', instagram_url:'', followers_count:'', stories_views:'', occupation:'', lifestyle:[] as string[], hobbies:'', bio:'', open_to_barter:'' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string|null>(null)
  const [existing, setExisting] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<string|null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      // Check if author already has a profile
      const { data: profile } = await supabase.from('authors').select('*').eq('user_id', data.user.id).single()
      if (profile) {
        setForm({
          name: profile.name || '',
          city: profile.city || '',
          instagram_url: profile.instagram_url || '',
          followers_count: profile.followers_count?.toString() || '',
          stories_views: profile.stories_views?.toString() || '',
          occupation: profile.occupation || '',
          lifestyle: profile.lifestyle || [],
          hobbies: profile.hobbies || '',
          bio: profile.bio || '',
          open_to_barter: profile.open_to_barter ? 'yes' : 'no',
        })
        setExisting(true)
        setCurrentStatus(profile.status)
      }
    })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setForm({...form, [e.target.name]: e.target.value})
  const toggleLifestyle = (item: string) => setForm(prev => ({ ...prev, lifestyle: prev.lifestyle.includes(item) ? prev.lifestyle.filter(i => i !== item) : [...prev.lifestyle, item] }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      name: form.name,
      city: form.city,
      instagram_url: form.instagram_url,
      followers_count: parseInt(form.followers_count)||0,
      stories_views: parseInt(form.stories_views)||0,
      occupation: form.occupation,
      lifestyle: form.lifestyle,
      hobbies: form.hobbies,
      bio: form.bio,
      open_to_barter: form.open_to_barter === 'yes',
      ...(userId ? { user_id: userId } : {}),
    }

    let err
    if (existing && userId) {
      const updatePayload = currentStatus === 'rejected' ? { ...payload, status: 'pending' } : payload
      const { error: e } = await supabase.from('authors').update(updatePayload).eq('user_id', userId)
      err = e
    } else {
      const { error: e } = await supabase.from('authors').insert([{ ...payload, status: 'pending' }])
      err = e
    }

    setLoading(false)
    if (err) { setError('Ошибка при сохранении. Попробуй ещё раз.'); return }

    if (userId) {
      toast.success(currentStatus === 'rejected' ? 'Анкета обновлена и отправлена на повторную проверку' : 'Профиль сохранён')
      router.push('/dashboard/author/profile')
    } else setSuccess(true)
  }

  const inp = { width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'15px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }
  const lbl = { display:'block' as const, fontSize:'14px', fontWeight:600, color:'#1a1a1a', marginBottom:'8px' }

  if (success) return (
    <main style={{ minHeight:'100vh', background:'#fafaf9', display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(20px, 6vw, 40px)' }}>
      <div style={{ textAlign:'center', maxWidth:'480px' }}>
        <div style={{ fontSize:'48px', marginBottom:'24px' }}>🎉</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a', marginBottom:'16px' }}>Анкета отправлена</h1>
        <p style={{ fontSize:'16px', color:'#7a7570', marginBottom:'32px', lineHeight:1.7 }}>Профиль отправлен на проверку. Появится в каталоге после модерации — обычно это быстро.</p>
        <Link href="/catalog" style={{ padding:'12px 32px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600 }}>Смотреть каталог</Link>
      </div>
    </main>
  )

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px clamp(16px, 5vw, 40px)', borderBottom:'1px solid #e8e6e1', background:'#fafaf9' }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>
        <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
          <Link href="/support" style={{ padding:'8px 16px', fontSize:'14px', color:'#7a7570', textDecoration:'none' }}>Поддержка</Link>
          <Link href="/catalog" style={{ padding:'8px 20px', border:'1px solid #d4d0c8', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'14px', fontWeight:500 }}>Каталог</Link>
        </div>
      </nav>
      <div style={{ maxWidth:'600px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'40px', fontWeight:700, color:'#1a1a1a', marginBottom:'12px', lineHeight:1.1 }}>
          {existing ? 'Редактировать профиль' : 'Стать автором'}
        </h1>
        <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'40px', lineHeight:1.6 }}>Заполни анкету — и бизнесы смогут найти тебя по городу, хобби и стилю жизни.</p>
        <form onSubmit={handleSubmit}>
          <div style={{ display:'flex', flexDirection:'column', gap:'24px' }}>
            <div><label style={lbl}>Имя / псевдоним *</label><input name="name" value={form.name} onChange={handleChange} required placeholder="Как тебя называть" style={inp} /></div>
            <div><label style={lbl}>Город *</label><input name="city" value={form.city} onChange={handleChange} required placeholder="Москва, Питер, Краснодар..." style={inp} /></div>
            <div><label style={lbl}>Ссылка на Instagram *</label><input name="instagram_url" value={form.instagram_url} onChange={handleChange} required placeholder="https://instagram.com/username" style={inp} /></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div><label style={lbl}>Подписчиков</label><input name="followers_count" type="number" value={form.followers_count} onChange={handleChange} placeholder="1500" style={inp} /></div>
              <div><label style={lbl}>Просмотры сторис</label><input name="stories_views" type="number" value={form.stories_views} onChange={handleChange} placeholder="300" style={inp} /></div>
            </div>
            <div><label style={lbl}>Кем работаешь</label><input name="occupation" value={form.occupation} onChange={handleChange} placeholder="Фитнес-тренер, студент, дизайнер..." style={inp} /></div>
            <div>
              <label style={lbl}>Стиль жизни</label>
              <p style={{ fontSize:'13px', color:'#9a9590', marginBottom:'12px' }}>Выбери всё что подходит</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                {LIFESTYLE.map(item => (
                  <button key={item} type="button" onClick={() => toggleLifestyle(item)} style={{ padding:'7px 14px', borderRadius:'100px', fontSize:'13px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', borderColor: form.lifestyle.includes(item) ? '#c17f3e' : '#e0ddd8', background: form.lifestyle.includes(item) ? '#fdf3e7' : '#fff', color: form.lifestyle.includes(item) ? '#c17f3e' : '#5a5650' }}>{item}</button>
                ))}
              </div>
            </div>
            <div><label style={lbl}>Хобби</label><input name="hobbies" value={form.hobbies} onChange={handleChange} placeholder="Серфинг, готовка, настольные игры..." style={inp} /></div>
            <div><label style={lbl}>О себе</label><textarea name="bio" value={form.bio} onChange={handleChange} rows={4} placeholder="Пару слов о том, кто ты..." style={{ ...inp, resize:'vertical' }} /></div>
            <div>
              <label style={lbl}>Готов к бартеру? *</label>
              <div style={{ display:'flex', gap:'12px' }}>
                {[{val:'yes',label:'Да'},{val:'no',label:'Нет'}].map(opt => (
                  <button key={opt.val} type="button" onClick={() => setForm({...form, open_to_barter: opt.val})} style={{ padding:'10px 28px', borderRadius:'100px', fontSize:'15px', fontWeight:500, border:'1.5px solid', cursor:'pointer', fontFamily:'inherit', borderColor: form.open_to_barter === opt.val ? '#1a1a1a' : '#e0ddd8', background: form.open_to_barter === opt.val ? '#1a1a1a' : '#fff', color: form.open_to_barter === opt.val ? '#fff' : '#5a5650' }}>{opt.label}</button>
                ))}
              </div>
            </div>
            {error && <div style={{ padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', color:'#dc2626', fontSize:'14px' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ padding:'14px 32px', background: loading ? '#9a9590' : '#1a1a1a', borderRadius:'100px', border:'none', color:'#fff', fontSize:'16px', fontWeight:600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
              {loading ? 'Сохраняем...' : existing ? 'Сохранить изменения' : 'Отправить анкету'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
