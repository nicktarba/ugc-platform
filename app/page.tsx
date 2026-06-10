import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ background: '#fafaf9', minHeight: '100vh' }}>
      {/* NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', borderBottom: '1px solid #e8e6e1',
        background: '#fafaf9', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: '22px', fontWeight: 700, color: '#1a1a1a' }}>
          ugcmarket
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/catalog" style={{
            padding: '8px 20px', border: '1px solid #d4d0c8', borderRadius: '100px',
            textDecoration: 'none', color: '#1a1a1a', fontSize: '14px', fontWeight: 500,
          }}>
            Каталог
          </Link>
          <Link href="/become-author" style={{
            padding: '8px 20px', background: '#1a1a1a', borderRadius: '100px',
            textDecoration: 'none', color: '#fff', fontSize: '14px', fontWeight: 500,
          }}>
            Стать автором
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        maxWidth: '900px', margin: '0 auto', padding: '100px 40px 80px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', background: '#f0ede6',
          borderRadius: '100px', fontSize: '13px', color: '#7a7570', marginBottom: '32px',
          fontWeight: 500,
        }}>
          Площадка микро-авторов
        </div>

        <h1 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 'clamp(42px, 6vw, 72px)',
          fontWeight: 700,
          lineHeight: 1.1,
          color: '#1a1a1a',
          marginBottom: '28px',
          letterSpacing: '-1px',
        }}>
          Живые люди с{' '}
          <span style={{ fontStyle: 'italic', color: '#c17f3e' }}>тёплой</span>{' '}
          аудиторией
        </h1>

        <p style={{
          fontSize: '18px', color: '#5a5650', maxWidth: '620px', margin: '0 auto 16px',
          lineHeight: 1.7,
        }}>
          Ценность автора определяется не количеством подписчиков, а совпадением его стиля жизни, аудитории и контекста с задачами бизнеса.
        </p>

        <p style={{
          fontSize: '15px', color: '#9a9590', maxWidth: '520px', margin: '0 auto 48px',
          lineHeight: 1.6,
        }}>
          Выбирайте авторов по городу, Instagram, профессии, хобби и темам, в которых они органичны.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/become-author" style={{
            padding: '14px 32px', background: '#1a1a1a', borderRadius: '100px',
            textDecoration: 'none', color: '#fff', fontSize: '16px', fontWeight: 600,
            transition: 'opacity 0.2s',
          }}>
            Стать автором
          </Link>
          <Link href="/catalog" style={{
            padding: '14px 32px', border: '1.5px solid #d4d0c8', borderRadius: '100px',
            textDecoration: 'none', color: '#1a1a1a', fontSize: '16px', fontWeight: 500,
          }}>
            Смотреть каталог
          </Link>
        </div>
      </section>

      {/* EXAMPLES */}
      <section style={{
        maxWidth: '900px', margin: '0 auto', padding: '0 40px 80px',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
        }}>
          {[
            { who: 'Фитнес-тренер', for: 'Спортпит, клубы, массаж' },
            { who: 'Студент', for: 'Кафе, ивенты, курсы' },
            { who: 'Автолюбитель', for: 'Автосервис, детейлинг' },
            { who: 'Девушка-кофеман', for: 'Рестораны, кофейни' },
            { who: 'Мастер красоты', for: 'Салоны, косметика' },
          ].map((item) => (
            <div key={item.who} style={{
              padding: '20px', background: '#fff', borderRadius: '16px',
              border: '1px solid #e8e6e1',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '6px' }}>
                {item.who}
              </div>
              <div style={{ fontSize: '12px', color: '#9a9590', lineHeight: 1.5 }}>
                {item.for}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{
        background: '#fff', borderTop: '1px solid #e8e6e1', borderBottom: '1px solid #e8e6e1',
        padding: '80px 40px',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'Fraunces, serif', fontSize: '36px', fontWeight: 700,
            color: '#1a1a1a', marginBottom: '48px', textAlign: 'center',
          }}>
            Как это работает
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px' }}>
            {[
              { step: '1', text: 'Автор заполняет простую анкету о себе' },
              { step: '2', text: 'Профиль появляется в общем каталоге' },
              { step: '3', text: 'Бизнес находит автора по нужным критериям' },
              { step: '4', text: 'Автор получает предложения на UGC и коллаборации' },
            ].map((item) => (
              <div key={item.step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: '#f0ede6', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 16px',
                  fontFamily: 'Fraunces, serif', fontSize: '20px', fontWeight: 700, color: '#c17f3e',
                }}>
                  {item.step}
                </div>
                <p style={{ fontSize: '15px', color: '#5a5650', lineHeight: 1.6 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 40px', textAlign: 'center' }}>
        <h2 style={{
          fontFamily: 'Fraunces, serif', fontSize: '36px', fontWeight: 700,
          color: '#1a1a1a', marginBottom: '16px',
        }}>
          Ты микро-автор?
        </h2>
        <p style={{ fontSize: '16px', color: '#7a7570', marginBottom: '32px' }}>
          Заполни анкету — и бизнесы сами найдут тебя.
        </p>
        <Link href="/become-author" style={{
          padding: '14px 40px', background: '#c17f3e', borderRadius: '100px',
          textDecoration: 'none', color: '#fff', fontSize: '16px', fontWeight: 600,
        }}>
          Заполнить анкету
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #e8e6e1', padding: '24px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '13px', color: '#9a9590',
      }}>
        <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, color: '#1a1a1a' }}>ugcmarket</span>
        <span>Площадка микро-авторов</span>
      </footer>
    </main>
  )
}
