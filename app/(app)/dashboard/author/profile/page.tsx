'use client'
import Link from 'next/link'
import { useApp } from '../../../AppContext'

export default function AuthorProfilePage() {
  const { authorProfile: profile } = useApp()

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>
        <div style={{ marginBottom:'32px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'16px', fontWeight:500 }}>Кабинет автора</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a' }}>
            {profile ? `Привет, ${profile.name}` : 'Профиль'}
          </h1>
        </div>

        {profile?.status === 'pending' && (
          <div style={{ padding:'12px 20px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'14px', marginBottom:'24px', fontSize:'14px', color:'#c17f3e', fontWeight:500 }}>
            ⏳ Анкета на модерации — скоро появится в каталоге
          </div>
        )}

        {profile?.status === 'rejected' && (
          <div style={{ padding:'12px 20px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', marginBottom:'24px', fontSize:'14px', color:'#dc2626', fontWeight:500 }}>
            Анкета не прошла модерацию. Проверь данные и отредактируй профиль.
          </div>
        )}

        {profile ? (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
              <div>
                <h3 style={{ fontSize:'18px', fontWeight:700, color:'#1a1a1a', marginBottom:'4px' }}>{profile.name}</h3>
                <span style={{ fontSize:'14px', color:'#9a9590' }}>📍 {profile.city}</span>
              </div>
              {profile.open_to_barter && <span style={{ padding:'4px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'100px', fontSize:'12px', fontWeight:600, color:'#16a34a' }}>Бартер</span>}
            </div>
            {profile.followers_count > 0 && (
              <div style={{ marginBottom:'16px' }}>
                <div style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a' }}>{profile.followers_count.toLocaleString('ru')}</div>
                <div style={{ fontSize:'12px', color:'#9a9590' }}>подписчиков</div>
              </div>
            )}
            {profile.lifestyle?.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'20px' }}>
                {profile.lifestyle.map(tag => <span key={tag} style={{ padding:'3px 10px', background:'#f0ede6', borderRadius:'100px', fontSize:'12px', color:'#7a7570', fontWeight:500 }}>{tag}</span>)}
              </div>
            )}
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
              <Link href="/become-author" style={{ padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Редактировать</Link>
              {profile.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer" style={{ padding:'10px 24px', border:'1.5px solid #e0ddd8', borderRadius:'100px', textDecoration:'none', color:'#1a1a1a', fontSize:'14px', fontWeight:500 }}>Instagram →</a>}
            </div>
          </div>
        ) : (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'clamp(20px, 6vw, 40px)', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'16px' }}>✍️</div>
            <h3 style={{ fontSize:'20px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Заполни анкету</h3>
            <p style={{ fontSize:'15px', color:'#7a7570', marginBottom:'24px', lineHeight:1.6 }}>Чтобы бизнесы могли найти тебя в каталоге — нужно заполнить профиль.</p>
            <Link href="/become-author" style={{ padding:'12px 32px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'15px', fontWeight:600 }}>Заполнить анкету</Link>
          </div>
        )}
      </div>
    </main>
  )
}
