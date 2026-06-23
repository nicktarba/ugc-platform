'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  business_id: string
}

type Props = {
  authorId: string
  avgRating: number | null
  reviewsCount: number
  currentUserId?: string | null
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ fontSize: size, color: n <= rating ? '#c17f3e' : '#e0ddd8' }}>★</span>
      ))}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ReviewsList({ authorId, avgRating, reviewsCount, currentUserId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authorId) return
    supabase
      .from('reviews')
      .select('id, rating, comment, created_at, business_id')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error || !data) { setLoading(false); return }
        setReviews(data as Review[])

        // Отдельно подгружаем имена компаний если пользователь авторизован
        if (currentUserId && data.length > 0) {
          const ids = [...new Set(data.map(r => r.business_id))]
          const { data: profiles } = await supabase
            .from('business_profiles')
            .select('id, company_name')
            .in('id', ids)
          if (profiles) {
            const map: Record<string, string> = {}
            profiles.forEach(p => { if (p.company_name) map[p.id] = p.company_name })
            setCompanyNames(map)
          }
        }
        setLoading(false)
      })
  }, [authorId, currentUserId])

  if (loading) return null

  if (reviewsCount === 0 && reviews.length === 0) return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
      <p style={{ fontSize: '14px', color: '#9a9590' }}>Отзывов пока нет — они появятся после завершённых сделок</p>
    </div>
  )

  const count = reviews.length || reviewsCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Сводка рейтинга */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: '20px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '40px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>{avgRating?.toFixed(1)}</div>
          <Stars rating={Math.round(avgRating || 0)} size={18} />
          <div style={{ fontSize: '12px', color: '#9a9590', marginTop: '4px' }}>
            {count} {count === 1 ? 'отзыв' : count < 5 ? 'отзыва' : 'отзывов'}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map(star => {
            const starCount = reviews.filter(r => r.rating === star).length
            const pct = reviews.length > 0 ? (starCount / reviews.length) * 100 : 0
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#9a9590', width: '12px' }}>{star}</span>
                <span style={{ fontSize: '12px', color: '#c17f3e' }}>★</span>
                <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#f0ede6', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#c17f3e', borderRadius: '3px', transition: 'width .3s' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#9a9590', width: '16px', textAlign: 'right' }}>{starCount}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Список отзывов */}
      {reviews.map(r => {
        const displayName = currentUserId
          ? (companyNames[r.business_id] || 'Бизнес')
          : 'Verified Business'

        return (
          <div key={r.id} style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: '16px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>{displayName}</div>
                <Stars rating={r.rating} size={14} />
              </div>
              <span style={{ fontSize: '12px', color: '#9a9590', flexShrink: 0, marginLeft: '12px' }}>{formatDate(r.created_at)}</span>
            </div>
            {r.comment && (
              <p style={{ fontSize: '14px', color: '#5a5650', lineHeight: 1.6, marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f0ede6' }}>{r.comment}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
