import Link from 'next/link'
import PublicBrand from '@/components/PublicBrand'
import styles from './public.module.css'

export default function NotFound() {
  return (
    <main className={styles.notFoundPage}>
      <section className={styles.notFoundCard}>
        <div className={styles.notFoundCopy}>
          <PublicBrand className={styles.brand} />
          <div className={styles.notFoundCode}>ОШИБКА 404</div>
          <h1>Здесь ничего нет</h1>
          <p>
            Возможно, ссылка устарела или страница была перемещена.
            Вернитесь на главную или продолжите поиск авторов в каталоге.
          </p>
          <div className={styles.notFoundActions}>
            <Link className={styles.primaryButton} href="/">На главную</Link>
            <Link className={styles.secondaryButton} href="/catalog">Каталог авторов</Link>
          </div>
        </div>
        <div className={styles.notFoundVisual} aria-hidden="true">
          <div className={styles.notFoundOrbit} />
          <div className={styles.notFoundNumber}>4<strong>0</strong>4</div>
        </div>
      </section>
    </main>
  )
}
