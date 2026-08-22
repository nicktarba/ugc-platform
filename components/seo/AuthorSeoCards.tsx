import Link from 'next/link'
import type { PublicAuthorSeo } from '@/lib/public-authors-server'
import styles from '@/app/seo-pages.module.css'

function compactCount(value: number | null | undefined) {
  if (!value) return null
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)} млн`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)} тыс.`
  return String(value)
}

export default function AuthorSeoCards({ authors, heading = 'UGC-авторы' }: { authors: PublicAuthorSeo[]; heading?: string }) {
  if (!authors.length) return null

  return (
    <section className={styles.authorSection}>
      <div className={styles.sectionHeadingRow}>
        <div className={styles.sectionHeading}>
          <span>Одобренные профили</span>
          <h2>{heading}</h2>
          <p>Открывайте профиль автора, смотрите тематики и данные для сотрудничества.</p>
        </div>
        <Link className={styles.outlineAction} href="/catalog">Весь каталог →</Link>
      </div>

      <div className={styles.authorGrid}>
        {authors.slice(0, 12).map(author => {
          const followers = compactCount(author.followers_count)
          const rating = author.avg_rating ? Number(author.avg_rating).toFixed(1) : null

          return (
            <Link className={styles.authorCard} href={`/author/${author.id}`} key={author.id}>
              <div className={styles.authorCardTop}>
                <div className={styles.authorAvatar}>
                  {author.avatar_url ? <img src={author.avatar_url} alt={`UGC-автор ${author.name}`} /> : <span>{author.name?.[0]?.toUpperCase() || '?'}</span>}
                </div>
                <span className={styles.authorArrow}>↗</span>
              </div>

              <div className={styles.authorMain}>
                <strong>{author.name}</strong>
                <p>{author.city}{author.occupation ? ` · ${author.occupation}` : ''}</p>
              </div>

              {!!author.lifestyle?.length && (
                <div className={styles.authorTags}>
                  {author.lifestyle.slice(0, 2).map(tag => <span key={tag}>{tag}</span>)}
                </div>
              )}

              <div className={styles.authorStats}>
                <span><small>Аудитория</small><b>{followers || '—'}</b></span>
                <span><small>Рейтинг</small><b>{rating ? `★ ${rating}` : 'Новый'}</b></span>
                <span><small>Формат</small><b>{author.open_to_barter ? 'Бартер' : 'По запросу'}</b></span>
              </div>
            </Link>
          )
        })}
      </div>

      <Link className={styles.mobileCatalogLink} href="/catalog">Открыть весь каталог авторов →</Link>
    </section>
  )
}
