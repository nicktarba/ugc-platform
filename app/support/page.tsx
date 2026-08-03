import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import Footer from '@/components/Footer'
import styles from '../public.module.css'

const helpCards = [
  {
    icon: '01',
    title: 'Аккаунт и профиль',
    text: 'Регистрация, вход, восстановление пароля и заполнение профиля автора или бизнеса.',
    href: '/register',
    action: 'Создать аккаунт',
  },
  {
    icon: '02',
    title: 'Поиск авторов',
    text: 'Обычный поиск, ИИ-подбор, фильтры, избранное и просмотр публичных профилей.',
    href: '/catalog',
    action: 'Открыть каталог',
  },
  {
    icon: '03',
    title: 'Предложения и сделки',
    text: 'Отправка предложения, согласование условий, сообщения, статусы и отзывы после работы.',
    href: '/login',
    action: 'Войти в кабинет',
  },
]

export default function SupportPage() {
  return (
    <main className={styles.publicPage}>
      <AppHeader />

      <section className={styles.supportHero}>
        <span className={styles.supportEyebrow}>Помощь по платформе</span>
        <h1>Разберёмся вместе</h1>
        <p>
          Здесь собраны основные разделы платформы. Выберите нужную тему, чтобы перейти к действию.
          Прямые контакты поддержки будут добавлены перед публичным запуском.
        </p>
      </section>

      <section className={styles.supportGrid}>
        {helpCards.map((card) => (
          <article className={styles.supportCard} key={card.title}>
            <span className={styles.supportCardIcon}>{card.icon}</span>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
            <Link href={card.href}>{card.action} →</Link>
          </article>
        ))}

        <div className={styles.supportNotice}>
          <div>
            <strong>Контакты поддержки пока не опубликованы</strong>
            <p>Мы не показываем выдуманный Telegram или несуществующий email. Рабочие контакты появятся здесь перед запуском.</p>
          </div>
          <span>Страница подготовлена</span>
        </div>
      </section>

      <Footer />
    </main>
  )
}
