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
      `[${a.id}] ${a.name}, ${a.city}, ${a.occupation || ''}. ${a.bio || ''}. Теги: ${(a.lifestyle || []).join(', ')}. Бартер: ${a.open_to_barter ? 'да' : 'нет'}`
    ).join('\n')

    const systemPrompt = `Ты ранжируешь UGC-креаторов под запрос бизнеса.
Оценивай не по ключевым словам, а по реальной пригодности автора для рекламы продукта.

Типы соответствия:
- direct — продукт прямо связан с нишей автора
- scenario — продукт органично нужен в образе жизни автора
- audience — аудитория автора похожа на покупателей продукта
- content — автор может естественно снять UGC-сценарий с продуктом
- geo — город важен для локальной услуги

Правила:
1. Сначала пойми продукт, ЦА и ситуации использования.
2. Учитывай не только очевидные ниши, но и смежные жизненные сценарии.
3. Город обязателен только для локальных услуг или если бизнес явно указал ограничение.
4. Подписчики не влияют на score.
5. Бартер учитывай только если он указан в запросе.
6. Не включай автора, если связь натянутая или основана на случайном совпадении слов.
7. Не выдумывай факты об авторе. Используй только данные каталога.

Score: 90-100 идеальное, 75-89 сильное, 60-74 нормальное, 45-59 слабое, 30-44 минимальное, <30 не включать.

Отвечай ТОЛЬКО JSON массивом, без markdown, без бэктиков, максимум 10:
[{"id":"uuid","score":85,"match_type":"scenario","reason":"Почему подходит"}]`

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
          maxTokens: '1000',
        },
        messages: [
          { role: 'system', text: systemPrompt },
          { role: 'user', text: `Запрос бизнеса: "${query}"\n\nКреаторы:\n${authorsStr}` }
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

