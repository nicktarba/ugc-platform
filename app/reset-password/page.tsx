'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase автоматически устанавливает сессию из URL после перехода по ссылке
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else setError('Ссылка недействительна или истекла. Запроси новую.')
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('Пароли не совпадают'); return }
    if (password.length < 6) { setError('Пароль должен быть не короче 6 символов'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError('Не удалось обновить пароль. Попробуй ещё раз.'); return }
    await supabase.auth.signOut()
    router.push('/login?reset=success')
  }

  const inp = { width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'15px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px clamp(16px, 5vw, 40px)', borderBottom:'1px solid #e8e6e1', background:'#fafaf9' }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>
      </nav>

      <div style={{ maxWidth:'480px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Новый пароль</h1>
        <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'36px' }}>Придумай новый пароль для входа.</p>

        {!ready && error ? (
          <div style={{ padding:'16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'12px', color:'#dc2626', fontSize:'14px', marginBottom:'24px' }}>
            {error}
            <div style={{ marginTop:'12px' }}>
              <Link href="/forgot-password" style={{ color:'#dc2626', fontWeight:600 }}>Запросить новую ссылку →</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'14px', fontWeight:600, color:'#1a1a1a', marginBottom:'8px' }}>Новый пароль *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Минимум 6 символов" style={inp} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'14px', fontWeight:600, color:'#1a1a1a', marginBottom:'8px' }}>Повтори пароль *</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Ещё раз" style={inp} />
              </div>
              {error && <div style={{ padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', color:'#dc2626', fontSize:'14px' }}>{error}</div>}
              <button type="submit" disabled={loading || !ready} style={{ padding:'14px', background:loading||!ready?'#9a9590':'#1a1a1a', borderRadius:'100px', border:'none', color:'#fff', fontSize:'16px', fontWeight:600, cursor:loading||!ready?'not-allowed':'pointer', fontFamily:'inherit' }}>
                {loading ? 'Сохраняем...' : 'Сохранить пароль'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
