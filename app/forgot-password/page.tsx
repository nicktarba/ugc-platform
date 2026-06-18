'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError('Не удалось отправить письмо. Проверь email.'); return }
    setSent(true)
  }

  const inp = { width:'100%', padding:'12px 16px', border:'1.5px solid #e0ddd8', borderRadius:'12px', fontSize:'15px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px clamp(16px, 5vw, 40px)', borderBottom:'1px solid #e8e6e1', background:'#fafaf9' }}>
        <Link href="/" style={{ fontFamily:'Fraunces, serif', fontSize:'22px', fontWeight:700, color:'#1a1a1a', textDecoration:'none' }}>ugcmarket</Link>
      </nav>

      <div style={{ maxWidth:'480px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        {sent ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'48px', marginBottom:'20px' }}>📬</div>
            <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'32px', fontWeight:700, color:'#1a1a1a', marginBottom:'12px' }}>Письмо отправлено</h1>
            <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'8px', lineHeight:1.6 }}>
              Проверь почту <strong style={{ color:'#1a1a1a' }}>{email}</strong> — там будет ссылка для сброса пароля.
            </p>
            <p style={{ fontSize:'13px', color:'#9a9590', marginBottom:'32px' }}>Письмо может прийти с небольшой задержкой. Проверь папку «Спам».</p>
            <Link href="/login" style={{ padding:'12px 28px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600 }}>
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Сброс пароля</h1>
            <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'36px', lineHeight:1.6 }}>
              Введи свой email — пришлём ссылку для создания нового пароля.
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
                <div>
                  <label style={{ display:'block', fontSize:'14px', fontWeight:600, color:'#1a1a1a', marginBottom:'8px' }}>Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={inp} />
                </div>
                {error && <div style={{ padding:'12px 16px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'10px', color:'#dc2626', fontSize:'14px' }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ padding:'14px', background:loading?'#9a9590':'#1a1a1a', borderRadius:'100px', border:'none', color:'#fff', fontSize:'16px', fontWeight:600, cursor:loading?'not-allowed':'pointer', fontFamily:'inherit' }}>
                  {loading ? 'Отправляем...' : 'Отправить ссылку'}
                </button>
                <p style={{ textAlign:'center', fontSize:'14px', color:'#7a7570' }}>
                  <Link href="/login" style={{ color:'#1a1a1a', fontWeight:600 }}>← Вернуться ко входу</Link>
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
