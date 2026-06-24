'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { isValidUrl } from '@/lib/format'
import { useApp } from '../../../AppContext'

export default function BusinessProfilePage() {
  const toast = useToast()
  const { userId, businessProfile, setBusinessProfile } = useApp()
  const [form, setForm] = useState({
    company_name: businessProfile?.company_name || '',
    inn: businessProfile?.inn || '',
    website_url: businessProfile?.website_url || '',
    niche: businessProfile?.niche || '',
    description: businessProfile?.description || '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    if (!form.company_name.trim()) { toast.error('Укажи название компании'); return }
    if (!form.inn.trim()) { toast.error('Укажи ИНН'); return }
    if (form.inn.trim().length < 10 || form.inn.trim().length > 12) { toast.error('ИНН должен содержать 10 или 12 цифр'); return }
    if (form.website_url && !isValidUrl(form.website_url)) { toast.error('Ссылка должна начинаться с https://'); return }
    setSaving(true)
    const { error } = await supabase.from('business_profiles').upsert({
      id: userId,
      company_name: form.company_name.trim(),
      inn: form.inn.trim(),
      website_url: form.website_url,
      niche: form.niche,
      description: form.description,
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { toast.error('Не удалось сохранить. Попробуй ещё раз.'); return }
    setBusinessProfile({ ...form })
    toast.success('Профиль сохранён')
  }

  const inp = { width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'15px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit', boxSizing:'border-box' as const }
  const lbl = { display:'block' as const, fontSize:'14px', fontWeight:600, color:'#1a1a1a', marginBottom:'8px' }

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'700px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'16px', fontWeight:500 }}>Кабинет бизнеса</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Профиль компании</h1>
          <p style={{ fontSize:'15px', color:'#7a7570', lineHeight:1.6 }}>Эта информация видна авторам, которым ты пишешь — заполни, чтобы тебе было проще договариваться.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px', display:'flex', flexDirection:'column', gap:'20px' }}>
            <div>
              <label style={lbl}>Название компании *</label>
              <input name="company_name" value={form.company_name} onChange={handleChange} required placeholder="Например: студия «Вкус»" style={inp} />
            </div>
            <div>
              <label style={lbl}>ИНН *</label>
              <input name="inn" value={form.inn} onChange={handleChange} required placeholder="10 или 12 цифр" style={inp} maxLength={12} />
              <p style={{ fontSize:'12px', color:'#9a9590', marginTop:'4px' }}>ИП — 12 цифр, ООО — 10 цифр</p>
            </div>
            <div>
              <label style={lbl}>Сайт или соцсети</label>
              <input name="website_url" value={form.website_url} onChange={handleChange} placeholder="https://..." style={inp} />
            </div>
            <div>
              <label style={lbl}>Сфера / ниша</label>
              <input name="niche" value={form.niche} onChange={handleChange} placeholder="Например: кафе, интернет-магазин одежды, IT-услуги..." style={inp} />
            </div>
            <div>
              <label style={lbl}>О компании</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Пару слов о том, чем занимаетесь и что предлагаете авторам..." style={{ ...inp, resize:'vertical' }} />
            </div>
            <button type="submit" disabled={saving} style={{ padding:'14px 32px', background: saving ? '#9a9590' : '#1a1a1a', borderRadius:'100px', border:'none', color:'#fff', fontSize:'16px', fontWeight:600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit', alignSelf:'flex-start' }}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

