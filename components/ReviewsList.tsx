'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  business_id: string
  business_profiles: { company_name: string | null } | null
}

type Props = {
  authorId: string
  avgRating: number | null
  reviewsCount: number
  currentUserId?: string | null // если передан — показываем имя бизнеса
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authorId) return
    supabase
      .from('reviews')
      .select('id, rating, comment, created_at, business_id, business_profiles(company_name)')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews((data || []) as unknown as Review[])
        setLoading(false)
      })
  }, [authorId])

  if (loading) return null
  if (reviewsCount === 0) return (
    <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⭐</div>
      <p style={{ fontSize: '14px', color: '#9a9590' }}>Отзывов пока нет — они появятся после завершённых сделок</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Сводка рейтинга */}
      <div style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: '20px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>{avgRating?.toFixed(1)}</div>
          <Stars rating={Math.round(avgRating || 0)} size={18} />
          <div style={{ fontSize: '12px', color: '#9a9590', marginTop: '4px' }}>{reviewsCount} {reviewsCount === 1 ? 'отзыв' : reviewsCount < 5 ? 'отзыва' : 'отзывов'}</div>
        </div>
        <div style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => r.rating === star).length
            const pct = reviewsCount > 0 ? (count / reviewsCount) * 100 : 0
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: '#9a9590', width: '12px' }}>{star}</span>
                <span style={{ fontSize: '12px', color: '#c17f3e' }}>★</span>
                <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#f0ede6', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#c17f3e', borderRadius: '3px' }} />
                </div>
                <span style={{ fontSize: '11px', color: '#9a9590', width: '16px', textAlign: 'right' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Список отзывов */}
      {reviews.map(r => {
        const companyName = r.business_profiles?.company_name
        // Имя показываем если текущий пользователь авторизован
        const displayName = currentUserId
          ? (companyName || 'Бизнес')
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
