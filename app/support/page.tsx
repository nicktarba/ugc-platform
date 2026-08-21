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
          Здесь собраны основные разделы платформы. Если вопрос не решился, напишите в поддержку — отвечаем по рабочим вопросам платформы.
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
            <strong>Поддержка СВОИ UGC</strong>
            <p>Напишите на <a href="mailto:support@svoi-ugc.ru">support@svoi-ugc.ru</a>. В письме укажите email аккаунта и кратко опишите вопрос.</p>
          </div>
          <span>support@svoi-ugc.ru</span>
        </div>

        <div className={styles.supportLegal}>
          <strong>Правовые документы</strong>
          <div>
            <Link href="/privacy">Политика ПД</Link>
            <Link href="/personal-data-consent">Согласие на обработку ПД</Link>
            <Link href="/distribution-consent">Согласие на распространение ПД</Link>
            <Link href="/terms">Пользовательское соглашение</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
