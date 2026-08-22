import Link from 'next/link'
import type { PublicAuthorSeo } from '@/lib/public-authors-server'
import styles from '@/app/seo-pages.module.css'

export default function AuthorSeoCards({ authors, heading = 'UGC-авторы' }: { authors: PublicAuthorSeo[]; heading?: string }) {
  if (!authors.length) return null

  return (
    <section className={styles.authorSection}>
      <div className={styles.sectionHeading}>
        <span>Каталог СВОИ UGC</span>
        <h2>{heading}</h2>
      </div>
      <div className={styles.authorGrid}>
        {authors.slice(0, 12).map(author => (
          <Link className={styles.authorCard} href={`/author/${author.id}`} key={author.id}>
            <div className={styles.authorAvatar}>
              {author.avatar_url ? <img src={author.avatar_url} alt={`UGC-автор ${author.name}`} /> : <span>{author.name?.[0]?.toUpperCase() || '?'}</span>}
            </div>
            <div>
              <strong>{author.name}</strong>
              <p>{author.city}{author.occupation ? ` · ${author.occupation}` : ''}</p>
              {!!author.lifestyle?.length && <small>{author.lifestyle.slice(0, 3).join(' · ')}</small>}
            </div>
          </Link>
        ))}
      </div>
      <Link className={styles.textLink} href="/catalog">Открыть весь каталог авторов →</Link>
    </section>
  )
}
