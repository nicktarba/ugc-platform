'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Author = {
  id: string
  name: string
  city: string
  instagram_url: string
  followers_count: number
  stories_views: number
  occupation: string
  lifestyle: string[]
  hobbies: string
  bio: string
  open_to_barter: boolean
  created_at: string
}

export default function CatalogPage() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [filtered, setFiltered] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [cityFilter, setCityFilter] = useState('')
  const [barterFilter, setBarterFilter] = useState<'all' | 'yes' | 'no'>('all')
  const [searchFilter, setSearchFilter] = useState('')

  useEffect(() => {
    const fetchAuthors = async () => {
      const { data } = await supabase.from('authors').select('*').order('created_at', { ascending: false })
      setAuthors(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    fetchAuthors()
  }, [])

  useEffect(() => {
    let result = [...authors]
    if (cityFilter) result = result.filter(a => a.city.toLowerCase().includes(cityFilter.toLowerCase()))
    if (barterFilter === 'yes') result = result.filter(a => a.open_to_barter)
    if (barterFilter === 'no') result = result.filter(a => !a.open_to_barter)
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.occupation?.toLowerCase().includes(q) ||
        a.hobbies?.toLowerCase().includes(q) ||
        a.bio?.toLowerCase().includes(q) ||
        a.lifestyle?.some(l => l.toLowerCase().includes(q))
      )
    }
    setFiltered(result)
  }, [cityFilter, barterFilter, searchFilter, authors])

  const inputStyle = {
    padding: '10px 16px', border: '1.5px solid #e0ddd8', borderRadius: '100px',
    fontSize: '14px', background: '#fff', color: '#1a1a1a', outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <main style={{ background: '#fafaf9', minHeight: '100vh' }}>
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', borderBottom: '1px solid #e8e6e1', background: '#fafaf9',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link href="/" style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}>
          ugcmarket
        </Link>
        <Link href="/become-author" style={{
          padding: '8px 20px', background: '#1a1a1a', borderRadius: '100px',
          textDecoration: 'none', color: '#fff', fontSize: '14px', fontWeight: 500,
        }}>
          Стать автором
        </Link>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontFamily: 'Fraunces, serif', fontSize: '40px', fontWeight: 700,
            color: '#1a1a1a', marginBottom: '8px',
          }}>
            Каталог авторов
          </h1>
          <p style={{ fontSize: '15px', color: '#7a7570' }}>
            {filtered.length} {filtered.length === 1 ? 'автор' : filtered.length < 5 ? 'автора' : 'авторов'}
          </p>
        </div>

        {/* FILTERS */}
        <div style={{
          display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px',
          padding: '20px', background: '#fff', borderRadius: '16px', border: '1px solid #e8e6e1',
        }}>
          <input value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
            placeholder="Поиск по имени, хобби, профессии..." style={{ ...inputStyle, minWidth: '240px', flex: 1 }} />
          <input value={cityFilter} onChange={e => setCityFilter(e.target.value)}
            placeholder="Город" style={{ ...inputStyle, width: '160px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { val: 'all', label: 'Все' },
              { val: 'yes', label: 'Бартер ✓' },
              { val: 'no', label: 'Без бартера' },
            ].map(opt => (
              <button key={opt.val} onClick={() => setBarterFilter(opt.val as 'all' | 'yes' | 'no')} style={{
                padding: '10px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 500,
                border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit',
                borderColor: barterFilter === opt.val ? '#1a1a1a' : '#e0ddd8',
                background: barterFilter === opt.val ? '#1a1a1a' : '#fff',
                color: barterFilter === opt.val ? '#fff' : '#5a5650',
                transition: 'all 0.15s',
              }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* CARDS */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9a9590', fontSize: '15px' }}>
            Загружаем авторов...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
            <p style={{ color: '#7a7570', fontSize: '16px' }}>Авторов с такими параметрами пока нет</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {filtered.map(author => (
              <div key={author.id} style={{
                background: '#fff', border: '1px solid #e8e6e1', borderRadius: '20px',
                padding: '24px', transition: 'box-shadow 0.2s',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>
                      {author.name}
                    </h3>
                    <span style={{ fontSize: '13px', color: '#9a9590' }}>📍 {author.city}</span>
                  </div>
                  {author.open_to_barter && (
                    <span style={{
                      padding: '4px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                      borderRadius: '100px', fontSize: '11px', fontWeight: 600, color: '#16a34a',
                    }}>
                      Бартер
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
                  {author.followers_count > 0 && (
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>
                        {author.followers_count.toLocaleString('ru')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9a9590' }}>подписчиков</div>
                    </div>
                  )}
                  {author.stories_views > 0 && (
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>
                        {author.stories_views.toLocaleString('ru')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9a9590' }}>просм. сторис</div>
                    </div>
                  )}
                </div>

                {/* Occupation */}
                {author.occupation && (
                  <div style={{ fontSize: '13px', color: '#5a5650', marginBottom: '12px', fontWeight: 500 }}>
                    💼 {author.occupation}
                  </div>
                )}

                {/* Bio */}
                {author.bio && (
                  <p style={{ fontSize: '13px', color: '#7a7570', marginBottom: '14px', lineHeight: 1.6 }}>
                    {author.bio.length > 100 ? author.bio.slice(0, 100) + '...' : author.bio}
                  </p>
                )}

                {/* Lifestyle tags */}
                {author.lifestyle?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {author.lifestyle.slice(0, 4).map(tag => (
                      <span key={tag} style={{
                        padding: '3px 10px', background: '#f0ede6', borderRadius: '100px',
                        fontSize: '11px', color: '#7a7570', fontWeight: 500,
                      }}>
                        {tag}
                      </span>
                    ))}
                    {author.lifestyle.length > 4 && (
                      <span style={{ fontSize: '11px', color: '#9a9590', padding: '3px 6px' }}>
                        +{author.lifestyle.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Instagram link */}
                {author.instagram_url && (
                  <a href={author.instagram_url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'inline-block', padding: '8px 20px',
                    border: '1.5px solid #e0ddd8', borderRadius: '100px',
                    textDecoration: 'none', color: '#1a1a1a', fontSize: '13px', fontWeight: 600,
                  }}>
                    Instagram →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
