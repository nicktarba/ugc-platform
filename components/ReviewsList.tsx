'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import UiIcon from './UiIcon'

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

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <span style={{ display:'inline-flex', gap:'2px' }} aria-label={`Оценка ${rating} из 5`}>
      {[1, 2, 3, 4, 5].map(star => (
        <UiIcon key={star} name="star" width={size} height={size} fill={star <= rating ? 'currentColor' : 'none'} style={{ color: star <= rating ? '#d79735' : '#dcd8d3' }} />
      ))}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day:'numeric', month:'long', year:'numeric' })
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

        if (currentUserId && data.length > 0) {
          const ids = [...new Set(data.map(review => review.business_id))]
          const { data: profiles } = await supabase.from('business_profiles').select('id, company_name').in('id', ids)
          if (profiles) {
            const map: Record<string, string> = {}
            profiles.forEach(profile => { if (profile.company_name) map[profile.id] = profile.company_name })
            setCompanyNames(map)
          }
        }
        setLoading(false)
      })
  }, [authorId, currentUserId])

  if (loading) return <div style={{ height:'76px', marginTop:'18px', borderRadius:'14px', background:'#f5f3f1' }} />
  if (reviewsCount === 0 && reviews.length === 0) return null

  const count = reviews.length || reviewsCount

  return (
    <div style={{ marginTop:'18px' }}>
      <div style={{ padding:'15px 0', display:'flex', alignItems:'center', gap:'18px', borderTop:'1px solid #efedea', borderBottom:'1px solid #efedea' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:'6px' }}>
          <strong style={{ fontSize:'26px', lineHeight:1 }}>{avgRating?.toFixed(1) || '—'}</strong>
          <span style={{ color:'#999aa1', fontSize:'9px' }}>/ 5</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          <Stars rating={Math.round(avgRating || 0)} size={14} />
          <span style={{ color:'#8d8e94', fontSize:'9px' }}>{count} {count === 1 ? 'отзыв' : count < 5 ? 'отзыва' : 'отзывов'} после завершённых сделок</span>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column' }}>
        {reviews.map(review => {
          const displayName = currentUserId ? (companyNames[review.business_id] || 'Компания') : 'Подтверждённый бизнес'
          return (
            <article key={review.id} style={{ padding:'18px 0', borderBottom:'1px solid #efedea' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'14px' }}>
                <div>
                  <strong style={{ display:'block', color:'#2f3035', fontSize:'11px' }}>{displayName}</strong>
                  <span style={{ display:'block', marginTop:'5px' }}><Stars rating={review.rating} /></span>
                </div>
                <time style={{ color:'#9b9cA1', fontSize:'8px', whiteSpace:'nowrap' }}>{formatDate(review.created_at)}</time>
              </div>
              {review.comment && <p style={{ margin:'11px 0 0', color:'#606168', fontSize:'10px', lineHeight:1.65 }}>{review.comment}</p>}
            </article>
          )
        })}
      </div>
    </div>
  )
}
