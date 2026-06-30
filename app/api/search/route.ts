import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, { result: unknown; ts: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function POST(req: NextRequest) {
  try {
    const { query, authors } = await req.json()
    if (!query || !authors?.length) {
      return NextResponse.json({ results: [] })
    }

    // Check cache
    const cacheKey = query.toLowerCase().trim()
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.result)
    }

    const authorsStr = authors.map((a: { name: string; city: string; occupation: string; bio: string; lifestyle: string[]; open_to_barter: boolean; id: string }) =>
      `[${a.id}] ${a.name}, ${a.city}, ${a.occupation || ''}. ${a.bio || ''}. Теги: ${(a.lifestyle || []).join(', ')}. Бартер: ${a.open_to_barter ? 'да' : 'нет'}`
    ).join('\n')

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content: `Ты помощник UGC-маркетплейса. Бизнес ищет автора для рекламы.

ПРАВИЛА РАНЖИРОВАНИЯ:
- Оценивай ПРЯМОЕ совпадение ниши, города, аудитории и задачи
- НЕ делай глубоких притянутых связей. Если запрос про еду а автор про авто — это не подходит, даже если оба "бизнес"
- Количество подписчиков НЕ влияет на ранг. 1000 подписчиков с нужной нишей лучше 30000 не по теме
- Бартер учитывай только если в запросе упомянут
- Город учитывай если указан в запросе

ФОРМАТ ОТВЕТА — только JSON массив, без markdown, без бэктиков:
[{"id":"uuid","score":85,"reason":"Коротко почему подходит"}]

Показывай только авторов со score >= 30. Максимум 10.`
          },
          {
            role: 'user',
            content: `Запрос: "${query}"\n\nАвторы:\n${authorsStr}`
          }
        ]
      })
    })

    const data = await resp.json()
    const text = data.choices?.[0]?.message?.content || '[]'
    const clean = text.replace(/```json|```/g, '').trim()
    
    let results
    try {
      results = JSON.parse(clean)
    } catch {
      results = []
    }

    const response = { results }
    cache.set(cacheKey, { result: response, ts: Date.now() })

    // Clean old cache entries
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

