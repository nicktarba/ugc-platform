'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', role: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.role) { setError('Выбери роль'); return }
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { role: form.role } }
    })

    if (err) { setError(err.message); setLoading(false); return }

    if (data.user) {
      await supabase.from('profiles').insert([{ id: data.user.id, email: form.email, role: form.role }])
      if (form.role === 'author') router.push('/dashboard/author')
      else router.push("/dashboard/business")
    }
    setLoading(false)
  }

  const inp = { width: '100%', padding: '12px 16px', border: '1.5px solid #e0ddd8', borderRadius: '12px', fontSize: '15px', background: '#fff', color: '#1a1a1a', outline: 'none', fontFamily: 'inherit' }
  const lbl = { display: 'block' as const, fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }

  return (
    <main style={{ background: '#fafaf9', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #e8e6e1', background: '#fafaf9' }}>
        <Link href="/" style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}>ugcmarket</Link>
        <Link href="/login" style={{ padding: '8px 20px', border: '1px solid #d4d0c8', borderRadius: '100px', textDecoration: 'none', color: '#1a1a1a', fontSize: '14px', fontWeight: 500 }}>Войти</Link>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '60px 40px' }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '36px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>Регистрация</h1>
        <p style={{ fontSize: '15px', color: '#7a7570', marginBottom: '40px' }}>Уже есть аккаунт? <Link href="/login" style={{ color: '#1a1a1a', fontWeight: 600 }}>Войти</Link></p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={lbl}>Кто ты? *</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[{ val: 'author', label: '✍️ Автор', desc: 'Хочу получать предложения' }, { val: 'business', label: '💼 Бизнес', desc: 'Ищу авторов для сотрудничества' }].map(opt => (
                  <button key={opt.val} type="button" onClick={() => setForm({ ...form, role: opt.val })} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const, borderColor: form.role === opt.val ? '#1a1a1a' : '#e0ddd8', background: form.role === opt.val ? '#1a1a1a' : '#fff', color: form.role === opt.val ? '#fff' : '#1a1a1a' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{opt.label}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={lbl}>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" style={inp} />
            </div>

            <div>
              <label style={lbl}>Пароль *</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="Минимум 6 символов" style={inp} minLength={6} />
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '14px' }}>{error}</div>}

            <button type="submit" disabled={loading} style={{ padding: '14px', background: loading ? '#9a9590' : '#1a1a1a', borderRadius: '100px', border: 'none', color: '#fff', fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
