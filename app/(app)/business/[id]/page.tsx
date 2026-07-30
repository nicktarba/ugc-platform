'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type BusinessProfile = {
  id: string
  company_name: string
  niche: string | null
  description: string | null
  website_url: string | null
  avatar_url: string | null
}

export default function BusinessPublicPage() {
  const params = useParams()
  const router = useRouter()
  const businessId = params.id as string
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [dealsCount, setDealsCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('business_profiles')
        .select('id, company_name, niche, description, website_url, avatar_url')
        .eq('id', businessId)
        .single()

      if (!data) { setLoading(false); return }
      setProfile(data)

      const { count } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'completed')
      setDealsCount(count || 0)

      setLoading(false)
    }
    load()
  }, [businessId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#9a9590' }}>
        Загрузка...
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, color: '#1a1a1a', marginBottom: 12 }}>Компания не найдена</h2>
        <p style={{ color: '#7a7570', fontSize: 14, marginBottom: 20 }}>Профиль не заполнен или не существует.</p>
        <button onClick={() => router.back()} style={{ padding: '10px 24px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 100, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Назад
        </button>
      </div>
    )
  }

  const initials = profile.company_name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const hashCode = profile.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const bgColors = ['#fdf3e7', '#e8f4fd', '#f0fdf4', '#fdf4ff', '#fff0f0']
  const textColors = ['#c17f3e', '#1a6fa8', '#16a34a', '#7c3aed', '#dc2626']
  const idx = hashCode % bgColors.length

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Back */}
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#7a7570', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24, padding: 0 }}>
        ← Назад
      </button>

      {/* Header card */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: 20, padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: bgColors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: textColors[idx], fontFamily: 'Fraunces, serif', flexShrink: 0 }}>
              {initials}
            </div>
          )}
          <div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              {profile.company_name}
            </h1>
            {profile.niche && (
              <p style={{ fontSize: 13, color: '#7a7570', marginTop: 4 }}>{profile.niche}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, marginBottom: profile.description ? 20 : 0 }}>
          <div style={{ background: '#f5f3ef', borderRadius: 12, padding: '12px 18px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', fontFamily: 'Fraunces, serif' }}>{dealsCount}</div>
            <div style={{ fontSize: 11, color: '#7a7570', marginTop: 2 }}>Завершённых сделок</div>
          </div>
        </div>

        {/* Description */}
        {profile.description && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>О компании</h3>
            <p style={{ fontSize: 14, color: '#5a5650', lineHeight: 1.6 }}>{profile.description}</p>
          </div>
        )}

        {/* Website */}
        {profile.website_url && (
          <div style={{ marginTop: 16 }}>
            <a href={profile.website_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#c17f3e', textDecoration: 'none', fontWeight: 600 }}>
              🌐 {profile.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
