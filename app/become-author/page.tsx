'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const LIFESTYLE_OPTIONS = [
  'Активный спорт', 'ЗОЖ и питание', 'Кофе и кафе', 'Рестораны', 'Путешествия',
  'Авто', 'Мода и стиль', 'Красота и уход', 'Семья и дети', 'Технологии',
  'Музыка', 'Кино и сериалы', 'Книги', 'Искусство', 'Бизнес',
]

export default function BecomeAuthorPage() {
  const [form, setForm] = useState({
    name: '', city: '', instagram_url: '', followers_count: '',
    stories_views: '', occupation: '', lifestyle: [] as string[],
    hobbies: '', bio: '', open_to_barter: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const toggleLifestyle = (item: string) => {
    setForm(prev => ({
      ...prev,
      lifestyle: prev.lifestyle.includes(item)
        ? prev.lifestyle.filter(i => i !== item)
        : [...prev.lifestyle, item]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('authors').insert([{
      name: form.name,
      city: form.city,
      instagram_url: form.instagram_url,
      followers_count: parseInt(form.followers_count) || 0,
      stories_views: parseInt(form.stories_views) || 0,
      occupation: form.occupation,
      lifestyle: form.lifestyle,
      hobbies: form.hobbies,
      bio: form.bio,
      open_to_barter: form.open_to_barter === 'yes',
      status: 'approved',
    }])

    setLoading(false)
    if (err) { setError('Ошибка при отправке. Попробуй ещё раз.'); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <main style={{ minHeight: '100vh', background: '#fafaf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '48px', marginBottom: '24px' }}>🎉</div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '36px', fontWeight: 700, color: '#1a1a1a', marginBottom: '16px' }}>
            Анкета отправлена
          </h1>
          <p style={{ fontSize: '16px', color: '#7a7570', marginBottom: '32px', lineHeight: 1.7 }}>
            Твой профиль появился в каталоге. Бизнесы уже могут найти тебя.
          </p>
          <Link href="/catalog" style={{
            padding: '12px 32px', background: '#1a1a1a', borderRadius: '100px',
            textDecoration: 'none', color: '#fff', fontSize: '15px', fontWeight: 600,
          }}>
            Смотреть каталог
          </Link>
        </div>
      </main>
    )
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', border: '1.5px solid #e0ddd8',
    borderRadius: '12px', fontSize: '15px', background: '#fff',
    color: '#1a1a1a', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  }

  const labelStyle = {
    display: 'block', fontSize: '14px', fontWeight: 600,
    color: '#1a1a1a', marginBottom: '8px',
  }

  return (
    <main style={{ background: '#fafaf9', minHeight: '100vh' }}>
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', borderBottom: '1px solid #e8e6e1', background: '#fafaf9',
      }}>
        <Link href="/" style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}>
          ugcmarket
        </Link>
        <Link href="/catalog" style={{
          padding: '8px 20px', border: '1px solid #d4d0c8', borderRadius: '100px',
          textDecoration: 'none', color: '#1a1a1a', fontSize: '14px', fontWeight: 500,
        }}>
          Каталог
        </Link>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 40px' }}>
        <h1 style={{
          fontFamily: 'Fraunces, serif', fontSize: '40px', fontWeight: 700,
          color: '#1a1a1a', marginBottom: '12px', lineHeight: 1.1,
        }}>
          Стать автором
        </h1>
        <p style={{ fontSize: '15px', color: '#7a7570', marginBottom: '40px', lineHeight: 1.6 }}>
          Заполни анкету — и бизнесы смогут найти тебя по городу, хобби и стилю жизни.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Имя */}
            <div>
              <label style={labelStyle}>Имя / псевдоним *</label>
              <input name="name" value={form.name} onChange={handleChange} required
                placeholder="Как тебя называть" style={inputStyle} />
            </div>

            {/* Город */}
            <div>
              <label style={labelStyle}>Город *</label>
              <input name="city" value={form.city} onChange={handleChange} required
                placeholder="Москва, Питер, Краснодар..." style={inputStyle} />
            </div>

            {/* Instagram */}
            <div>
              <label style={labelStyle}>Ссылка на Instagram *</label>
              <input name="instagram_url" value={form.instagram_url} onChange={handleChange} required
                placeholder="https://instagram.com/username" style={inputStyle} />
            </div>

            {/* Подписчики и просмотры */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Подписчиков</label>
                <input name="followers_count" type="number" value={form.followers_count} onChange={handleChange}
                  placeholder="1500" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Средние просмотры сторис</label>
                <input name="stories_views" type="number" value={form.stories_views} onChange={handleChange}
                  placeholder="300" style={inputStyle} />
              </div>
            </div>

            {/* Работа */}
            <div>
              <label style={labelStyle}>Кем работаешь</label>
              <input name="occupation" value={form.occupation} onChange={handleChange}
                placeholder="Фитнес-тренер, студент, дизайнер..." style={inputStyle} />
            </div>

            {/* Стиль жизни */}
            <div>
              <label style={labelStyle}>Стиль жизни</label>
              <p style={{ fontSize: '13px', color: '#9a9590', marginBottom: '12px' }}>Выбери всё что подходит</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {LIFESTYLE_OPTIONS.map(item => (
                  <button key={item} type="button" onClick={() => toggleLifestyle(item)} style={{
                    padding: '7px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
                    border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit',
                    borderColor: form.lifestyle.includes(item) ? '#c17f3e' : '#e0ddd8',
                    background: form.lifestyle.includes(item) ? '#fdf3e7' : '#fff',
                    color: form.lifestyle.includes(item) ? '#c17f3e' : '#5a5650',
                    transition: 'all 0.15s',
                  }}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Хобби */}
            <div>
              <label style={labelStyle}>Хобби</label>
              <input name="hobbies" value={form.hobbies} onChange={handleChange}
                placeholder="Серфинг, готовка, настольные игры..." style={inputStyle} />
            </div>

            {/* О себе */}
            <div>
              <label style={labelStyle}>О себе</label>
              <textarea name="bio" value={form.bio} onChange={handleChange} rows={4}
                placeholder="Пару слов о том, кто ты и чем занимаешься..."
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* Бартер */}
            <div>
              <label style={labelStyle}>Готов к бартеру? *</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[{ val: 'yes', label: 'Да' }, { val: 'no', label: 'Нет' }].map(opt => (
                  <button key={opt.val} type="button" onClick={() => setForm({ ...form, open_to_barter: opt.val })} style={{
                    padding: '10px 28px', borderRadius: '100px', fontSize: '15px', fontWeight: 500,
                    border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit',
                    borderColor: form.open_to_barter === opt.val ? '#1a1a1a' : '#e0ddd8',
                    background: form.open_to_barter === opt.val ? '#1a1a1a' : '#fff',
                    color: form.open_to_barter === opt.val ? '#fff' : '#5a5650',
                    transition: 'all 0.15s',
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              padding: '14px 32px', background: loading ? '#9a9590' : '#1a1a1a',
              borderRadius: '100px', border: 'none', color: '#fff',
              fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.2s',
            }}>
              {loading ? 'Отправляем...' : 'Отправить анкету'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
