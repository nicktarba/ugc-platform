import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'clamp(20px, 6vw, 40px)', textAlign:'center' }}>
      <div style={{ maxWidth:'480px' }}>
        <div style={{ fontFamily:'Fraunces, serif', fontSize:'80px', fontWeight:700, color:'#f0ede6', marginBottom:'8px', lineHeight:1 }}>404</div>
        <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'28px', fontWeight:700, color:'#1a1a1a', marginBottom:'12px' }}>Страница не найдена</h1>
        <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'32px', lineHeight:1.6 }}>Такой страницы не существует, или она была перемещена.</p>
        <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/" style={{ padding:'12px 28px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600 }}>На главную</Link>
          <Link href="/catalog" style={{ padding:'12px 28px', border:'1.5px solid #e0ddd8', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'15px', fontWeight:500 }}>Каталог авторов</Link>
        </div>
      </div>
    </main>
  )
}
