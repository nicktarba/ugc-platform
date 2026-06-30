'use client'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ borderTop:'1px solid #e8e6e1', background:'#fafaf9', padding:'24px clamp(16px, 5vw, 40px)', marginTop:'auto' }}>
      <div style={{ maxWidth:'1100px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
        <span style={{ fontSize:'13px', color:'#9a9590' }}>© {new Date().getFullYear()} ugcmarket</span>
        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
          <Link href="/support" style={{ fontSize:'13px', color:'#9a9590', textDecoration:'none' }}>Поддержка</Link>
        </div>
      </div>
    </footer>
  )
}

