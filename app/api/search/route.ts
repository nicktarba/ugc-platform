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

Типы соответствия:
- direct — ниша автора напрямую совпадает с продуктом
- scenario — продукт естественно вписывается в жизнь автора
- audience — аудитория автора = покупатели продукта

Правила:
1. Пойми продукт и его ЦА. Ищи авторов чья ниша или аудитория реально пересекается.
2. НЕ притягивай за уши. Автоблогер НЕ подходит для детских кроссовок. Фуд-блогер НЕ подходит для детских кроссовок. Связь должна быть очевидной.
3. Город важен только для локальных услуг.
4. Подписчики не влияют.
5. Бартер учитывай только если указан.
6. Используй только данные каталога, не выдумывай.

reason — максимум 5-7 слов, без имени автора.

JSON массив, без markdown, без бэктиков, максимум 10:
[{"id":"uuid","score":85,"match_type":"direct","reason":"5-7 слов"}]

Score < 40 не включать.`

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
          maxTokens: '800',
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

