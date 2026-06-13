'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })

    if (err) { setError('Неверный email или пароль'); setLoading(false); return }

    const role = data.user?.user_metadata?.role
    if (role === 'author') router.push('/dashboard/author')
    else router.push("/dashboard/business")
    setLoading(false)
  }

  const inp = { width: '100%', padding: '12px 16px', border: '1.5px solid #e0ddd8', borderRadius: '12px', fontSize: '15px', background: '#fff', color: '#1a1a1a', outline: 'none', fontFamily: 'inherit' }
  const lbl = { display: 'block' as const, fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }

  return (
    <main style={{ background: '#fafaf9', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #e8e6e1', background: '#fafaf9' }}>
        <Link href="/" style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}>ugcmarket</Link>
        <Link href="/register" style={{ padding: '8px 20px', background: '#1a1a1a', borderRadius: '100px', textDecoration: 'none', color: '#fff', fontSize: '14px', fontWeight: 500 }}>Регистрация</Link>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '60px 40px' }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '36px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>Вход</h1>
        <p style={{ fontSize: '15px', color: '#7a7570', marginBottom: '40px' }}>Нет аккаунта? <Link href="/register" style={{ color: '#1a1a1a', fontWeight: 600 }}>Зарегистрироваться</Link></p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={lbl}>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Пароль *</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="Твой пароль" style={inp} />
            </div>

            {error && <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '14px' }}>{error}</div>}

            <button type="submit" disabled={loading} style={{ padding: '14px', background: loading ? '#9a9590' : '#1a1a1a', borderRadius: '100px', border: 'none', color: '#fff', fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
