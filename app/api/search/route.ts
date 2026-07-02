import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, { result: unknown; ts: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const { query, authors } = await req.json()
    if (!query || !authors?.length) {
      return NextResponse.json({ results: [] })
    }

    const cacheKey = query.toLowerCase().trim()
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.result)
    }

    const authorsStr = authors.map((a: { name: string; city: string; occupation: string; bio: string; lifestyle: string[]; open_to_barter: boolean; id: string }) =>
      `[${a.id}] ${a.city}, ${a.occupation || ''}. ${a.bio || ''}. Теги: ${(a.lifestyle || []).join(', ')}. Бартер: ${a.open_to_barter ? 'да' : 'нет'}`
    ).join('\n')

    const systemPrompt = `Ты ранжируешь UGC-креаторов под запрос бизнеса.

Ищи не только прямое совпадение ниши, но и авторов с понятным мостом между продуктом и их жизнью, аудиторией или контентом.

Мост считается сильным, только если выполняется хотя бы одно:
1. автор — вероятный пользователь продукта (по своим данным в каталоге, не по домыслу)
2. продукт напрямую связан с конкретным фактом об авторе: дети, семья, дом, работа, хобби — а не с абстрактным "образом жизни"
3. аудитория автора по нише и тематике контента совпадает с покупателями продукта
4. для локальной услуги совпадает город

Типы совпадения:
- direct — ниша автора напрямую совпадает с продуктом
- scenario — продукт закономерно нужен в жизни автора, исходя из конкретных фактов о нём
- audience — аудитория автора по демографии (доход, стадия жизни семьи, образ жизни) совпадает с покупателями продукта, даже если ниша автора не связана с продуктом напрямую. Пример: мама-блогер — аудитория для бытовой техники, потому что её подписчицы — семьи с детьми, а не потому что она сама пишет про технику. Для audience обязательно называй конкретный признак аудитории (доход, стадия жизни, привычки), а не общую фразу "всем подойдёт"
- content — формат контента автора подходит для демонстрации продукта
- geo — важен город для локальной услуги

Не притягивай за уши:
- не используй цепочки слабых ассоциаций ("продукт можно как-то показать в видео" — не аргумент)
- не включай автора, если связь общая и подошла бы почти любому автору
- случайное совпадение слов не считается релевантностью
- автоблогер НЕ подходит для детских кроссовок, если в его данных нет упоминания детей или семейного контента
- фудблогер НЕ подходит для детских кроссовок, если у него нет детей, семейного контента или детской аудитории
- бьюти-блогер НЕ подходит для автосервиса без явной связи в его данных

Подписчики не влияют на score. Город обязателен только для локальных услуг или если бизнес указал город. Бартер учитывай только если указан в запросе. Не выдумывай факты об авторе — используй только данные каталога.

Score:
- 75-100 — сильное соответствие (direct или явный scenario/audience)
- 60-74 — нормальное соответствие
- 40-59 — слабое, но объяснимое конкретным фактом об авторе
- ниже 40 — не включать

Массив ОБЯЗАТЕЛЬНО отсортирован по score от большего к меньшему — первым в массиве идёт автор с самым высоким score.

reason должен объяснять СВЯЗЬ С ЗАПРОСОМ, а не пересказывать нишу автора. Обязательно называй конкретный факт из данных автора, который создаёт мост именно к этому продукту. Не используй общие фразы вроде "может подойти" или "может показать в контексте".
Плохо (это просто описание ниши, не объяснение связи): "мама-блогер делится лайфхаками по воспитанию"
Хорошо, direct/scenario (называет конкретный факт-мост): "мама двоих, органично покажет одежду в быту"
Хорошо, audience (называет конкретный демографический признак): "аудитория — семьи с детьми, частые покупатели бытовой техники"
8-12 слов, без имени автора.

Верни только чистый JSON-массив, без markdown, без бэктиков, максимум 10:
[{"id":"uuid","score":85,"match_type":"scenario","reason":"мост в 8-12 слов"}]`

    const resp = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${process.env.YANDEX_API_KEY}`,
        'x-folder-id': process.env.YANDEX_FOLDER_ID || '',
      },
      body: JSON.stringify({
        modelUri: `gpt://${process.env.YANDEX_FOLDER_ID}/yandexgpt-lite`,
        completionOptions: {
          stream: false,
          temperature: 0.3,
          maxTokens: '1200',
        },
        messages: [
          { role: 'system', text: systemPrompt },
          { role: 'user', text: `Запрос: "${query}"\n\nКреаторы:\n${authorsStr}` }
        ]
      })
    })

    const data = await resp.json()
    const text = data.result?.alternatives?.[0]?.message?.text || '[]'
    const clean = text.replace(/```json|```/g, '').trim()

    let results
    try {
      results = JSON.parse(clean)
    } catch {
      results = []
    }

    const response = { results }
    cache.set(cacheKey, { result: response, ts: Date.now() })

    if (cache.size > 500) {
      const now = Date.now()
      for (const [key, val] of cache.entries()) {
        if (now - val.ts > CACHE_TTL) cache.delete(key)
      }
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('AI search error:', err)
    return NextResponse.json({ results: [] })
  }
}
