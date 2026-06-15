import AppHeader from '@/components/AppHeader'

export default function SupportPage() {
  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <AppHeader />

      <div style={{ maxWidth:'600px', margin:'0 auto', padding:'clamp(40px, 10vw, 80px) clamp(16px, 5vw, 40px)', textAlign:'center' }}>
        <div style={{ fontSize:'40px', marginBottom:'24px' }}>💬</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a', marginBottom:'16px' }}>Поддержка</h1>
        <p style={{ fontSize:'16px', color:'#7a7570', marginBottom:'40px', lineHeight:1.7 }}>
          Если что-то не работает, есть вопрос или предложение по платформе — напиши нам, ответим как можно скорее.
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:'12px', alignItems:'center' }}>
          <a href="https://t.me/your_support_username" target="_blank" rel="noopener noreferrer" style={{ padding:'14px 20px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600, width:'min(240px, 100%)', whiteSpace:'nowrap', textAlign:'center' }}>
            Написать в Telegram
          </a>
          <a href="mailto:support@ugcmarket.ru" style={{ padding:'14px 20px', border:'1.5px solid #d4d0c8', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'15px', fontWeight:500, width:'min(240px, 100%)', whiteSpace:'nowrap', textAlign:'center' }}>
            support@ugcmarket.ru
          </a>
        </div>
      </div>
    </main>
  )
}
