import type { ReactNode } from 'react'
import Link from 'next/link'
import PublicBrand from './PublicBrand'
import styles from '@/app/public.module.css'

type Props = {
  children: ReactNode
  eyebrow: string
  title: ReactNode
  description: string
  points: string[]
  alternateLabel?: string
  alternateHref?: string
  alternateAction?: string
}

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
  points,
  alternateLabel,
  alternateHref,
  alternateAction,
}: Props) {
  return (
    <main className={styles.authPage}>
      <header className={styles.authTopbar}>
        <PublicBrand className={styles.brand} />
        {alternateLabel && alternateHref && alternateAction ? (
          <div className={styles.authTopbarAction}>
            <span>{alternateLabel}</span>
            <Link href={alternateHref}>{alternateAction}</Link>
          </div>
        ) : (
          <Link className={styles.topbarLink} href="/">На главную</Link>
        )}
      </header>

      <div className={styles.authLayout}>
        <section className={styles.authStory}>
          <div className={styles.storyGlow} />
          <div className={styles.storyContent}>
            <span className={styles.storyEyebrow}>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
            <div className={styles.storyPoints}>
              {points.map((point) => (
                <div key={point} className={styles.storyPoint}>
                  <span aria-hidden="true">✓</span>
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.storyPreview} aria-hidden="true">
            <div className={styles.previewSearch}>
              <span />
              <i />
            </div>
            <div className={styles.previewCards}>
              <div><b>А</b><span /><span /></div>
              <div><b>М</b><span /><span /></div>
              <div><b>К</b><span /><span /></div>
            </div>
          </div>
        </section>

        <section className={styles.authPanel}>
          <div className={styles.authCard}>{children}</div>
        </section>
      </div>
    </main>
  )
}
