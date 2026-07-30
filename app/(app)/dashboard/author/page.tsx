'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/LoadingScreen'
import { useToast } from '@/components/Toast'
import { useApp } from '../../AppContext'

export default function AuthorHomePage() {
  const toast = useToast()
  const { authorProfile: profile } = useApp()
  const [loading, setLoading] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)
  const [stats, setStats] = useState({ viewsTotal: 0, views7d: 0, requestsTotal: 0, requests30d: 0, completed: 0 })

  useEffect(() => {
    if (!profile) { setLoading(false); return }
    ;(async () => {
      const now = new Date()
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [
        { count: viewsTotal },
        { count: views7d },
        { data: reqs },
      ] = await Promise.all([
        supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('author_id', profile.id),
        supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('author_id', profile.id).gte('created_at', d7.toISOString()),
        supabase.from('requests').select('status, created_at').eq('author_id', profile.id),
      ])

      const allReqs = reqs || []
      const requests30d = allReqs.filter(r => new Date(r.created_at) >= d30).length
      const completed = allReqs.filter(r => r.status === 'completed').length

      setStats({
        viewsTotal: viewsTotal || 0,
        views7d: views7d || 0,
        requestsTotal: allReqs.length,
        requests30d,
        completed,
      })
      setLoading(false)
    })()
  }, [profile])

  const copyProfileLink = async () => {
    if (!profile) return
    try {
      await navigator.clipboard.writeText(`https://svoi-ugc.ru/author/${profile.id}`)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch { toast.error('Не удалось скопировать') }
  }

  // Checklist
  const checklist = profile ? [
    { done: !!profile.avatar_url, label: 'Загрузи фото профиля', key: 'avatar' },
    { done: !!profile.bio && profile.bio.length > 10, label: 'Напиши о себе', key: 'bio' },
    { done: !!profile.instagram_url, label: 'Укажи ссылку на Instagram', key: 'insta' },
    { done: (profile.lifestyle?.length || 0) >= 3, label: 'Выбери минимум 3 интереса', key: 'tags' },
    { done: !!profile.city, label: 'Укажи город', key: 'city' },
  ] : []
  const completedSteps = checklist.filter(c => c.done).length
  const allChecklistDone = completedSteps === checklist.length
  const showChecklist = profile && !allChecklistDone && stats.completed === 0

  if (loading) return <LoadingScreen />

  return (
    <main style={{ background:'#fafaf9', minHeight:'100vh' }}>
      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 40px)' }}>

        {/* Header */}
        <div style={{ marginBottom:'28px' }}>
          <div style={{ display:'inline-block', padding:'6px 16px', background:'#f0ede6', borderRadius:'100px', fontSize:'13px', color:'#7a7570', marginBottom:'16px', fontWeight:500 }}>Кабинет автора</div>
          <h1 style={{ fontFamily:'Fraunces, serif', fontSize:'36px', fontWeight:700, color:'#1a1a1a', marginBottom:'4px' }}>
            {profile ? `Привет, ${profile.name?.split(' ')[0] || 'автор'}` : 'Добро пожаловать'}
          </h1>
          {profile?.status === 'approved' && (
            <p style={{ fontSize:'14px', color:'#9a9590', margin:0 }}>Твой профиль в каталоге — бизнесы могут найти тебя и написать</p>
          )}
        </div>

        {/* Status alerts */}
        {profile?.status === 'pending' && (
          <div style={{ padding:'14px 20px', background:'#fdf3e7', border:'1px solid #f5dcb8', borderRadius:'14px', marginBottom:'20px', fontSize:'14px', color:'#c17f3e', fontWeight:500, display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'20px' }}>⏳</span>
            <span>Анкета на модерации — скоро появишься в каталоге</span>
          </div>
        )}

        {profile?.status === 'rejected' && (
          <div style={{ padding:'14px 20px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'14px', marginBottom:'20px', fontSize:'14px', color:'#dc2626', fontWeight:500 }}>
            Анкета не прошла модерацию. Проверь данные на вкладке «Профиль».
          </div>
        )}

        {/* No profile — onboarding */}
        {!profile && (
          <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'28px', borderLeft:'4px solid #c17f3e', marginBottom:'24px' }}>
            <div style={{ fontSize:'28px', marginBottom:'12px' }}>👋</div>
            <h3 style={{ fontSize:'17px', fontWeight:700, color:'#1a1a1a', marginBottom:'8px' }}>Как это работает</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px', fontSize:'14px', color:'#5a5650', lineHeight:1.6, marginBottom:'20px' }}>
              <div>1. Заполни анкету — расскажи о себе, хобби, стиле жизни</div>
              <div>2. Пройди модерацию — обычно это быстро</div>
              <div>3. Появишься в каталоге — бизнесы найдут тебя по фильтрам</div>
              <div>4. Получай входящие заявки и общайся в чате</div>
            </div>
            <Link href="/dashboard/author/profile" style={{ display:'inline-block', padding:'10px 24px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'14px', fontWeight:600 }}>Заполнить анкету →</Link>
          </div>
        )}

        {/* Profile exists */}
        {profile && (
          <>
            {/* Quick actions */}
            <div style={{ display:'flex', gap:'10px', marginBottom:'24px', flexWrap:'wrap' }}>
              <Link href="/dashboard/author/profile" style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'9px 18px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'100px', textDecoration:'none', fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>
                ✏️ Редактировать профиль
              </Link>
              {profile.status === 'approved' && (
                <Link href={`/author/${profile.id}`} style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'9px 18px', background:'#fff', border:'1px solid #e8e6e1', borderRadius:'100px', textDecoration:'none', fontSize:'13px', fontWeight:600, color:'#1a1a1a' }}>
                  👁 Посмотреть профиль
                </Link>
              )}
              {profile.status === 'approved' && (
                <button onClick={copyProfileLink} style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'9px 18px', background: linkCopied ? '#f0fdf4' : '#fff', border: linkCopied ? '1px solid #bbf7d0' : '1px solid #e8e6e1', borderRadius:'100px', fontSize:'13px', fontWeight:600, color: linkCopied ? '#16a34a' : '#1a1a1a', cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>
                  {linkCopied ? '✓ Скопировано' : '🔗 Скопировать ссылку'}
                </button>
              )}
            </div>

            {/* Checklist */}
            {showChecklist && (
              <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'20px', padding:'24px', marginBottom:'24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                  <h3 style={{ fontSize:'15px', fontWeight:700, color:'#1a1a1a', margin:0 }}>Получи первый заказ</h3>
                  <span style={{ fontSize:'12px', color:'#9a9590', fontWeight:500 }}>{completedSteps} из {checklist.length}</span>
                </div>
                <div style={{ height:'6px', background:'#f0ede6', borderRadius:'100px', marginBottom:'16px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(completedSteps / checklist.length) * 100}%`, background:'#C56A43', borderRadius:'100px', transition:'width 0.3s' }} />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {checklist.map(item => (
                    <div key={item.key} style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'14px', color: item.done ? '#9a9590' : '#1a1a1a' }}>
                      <div style={{ width:'22px', height:'22px', borderRadius:'50%', border: item.done ? 'none' : '2px solid #e0ddd8', background: item.done ? '#C56A43' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {item.done && <span style={{ color:'#fff', fontSize:'12px', fontWeight:700 }}>✓</span>}
                      </div>
                      <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
                {completedSteps < checklist.length && (
                  <Link href="/dashboard/author/profile" style={{ display:'inline-block', marginTop:'16px', padding:'8px 20px', background:'#1a1a1a', borderRadius:'100px', textDecoration:'none', color:'#fff', fontSize:'13px', fontWeight:600 }}>Заполнить →</Link>
                )}
              </div>
            )}

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'12px', marginBottom:'24px' }}>
              <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'16px', padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:'28px', fontWeight:700, color:'#1a1a1a' }}>{stats.viewsTotal}</div>
                <div style={{ fontSize:'12px', color:'#9a9590', marginTop:'4px' }}>просмотров</div>
                {stats.views7d > 0 && <div style={{ fontSize:'11px', color:'#c17f3e', marginTop:'4px' }}>+{stats.views7d} за 7 дней</div>}
              </div>
              <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'16px', padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:'28px', fontWeight:700, color:'#1a1a1a' }}>{stats.requestsTotal}</div>
                <div style={{ fontSize:'12px', color:'#9a9590', marginTop:'4px' }}>заявок</div>
                {stats.requests30d > 0 && <div style={{ fontSize:'11px', color:'#c17f3e', marginTop:'4px' }}>+{stats.requests30d} за 30 дней</div>}
              </div>
              <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'16px', padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:'28px', fontWeight:700, color:'#1a1a1a' }}>{stats.completed}</div>
                <div style={{ fontSize:'12px', color:'#9a9590', marginTop:'4px' }}>сделок</div>
              </div>
              <div style={{ background:'#fff', border:'1px solid #e8e6e1', borderRadius:'16px', padding:'16px', textAlign:'center' }}>
                <div style={{ fontSize:'28px', fontWeight:700, color:'#1a1a1a' }}>{profile.avg_rating ? profile.avg_rating.toFixed(1) : '—'}</div>
                <div style={{ fontSize:'12px', color:'#9a9590', marginTop:'4px' }}>рейтинг</div>
                {(profile.reviews_count || 0) > 0 && <div style={{ fontSize:'11px', color:'#c17f3e', marginTop:'4px' }}>{profile.reviews_count} отзывов</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
