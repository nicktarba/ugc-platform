#!/usr/bin/env node

const site = (process.env.PUBLIC_URL || 'https://svoi-ugc.ru').replace(/\/$/, '')
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const keyFile = resolve(here, '../public/indexnow-key.txt')
const key = (process.env.INDEXNOW_KEY || (await readFile(keyFile, 'utf8'))).trim()
if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) throw new Error('Некорректный IndexNow key')

const sitemapResponse = await fetch(`${site}/sitemap.xml`, { signal: AbortSignal.timeout(15000) })
if (!sitemapResponse.ok) throw new Error(`Sitemap HTTP ${sitemapResponse.status}`)
const xml = await sitemapResponse.text()
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&')).filter(url => url.startsWith(`${site}/`) || url === site)
const unique = [...new Set(urls)].slice(0, 10000)
if (!unique.length) throw new Error('Sitemap не содержит URL для IndexNow')

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: new URL(site).host,
    key,
    keyLocation: `${site}/indexnow-key.txt`,
    urlList: unique,
  }),
  signal: AbortSignal.timeout(20000),
})

if (![200, 202].includes(response.status)) {
  const body = await response.text().catch(() => '')
  throw new Error(`IndexNow HTTP ${response.status}: ${body.slice(0, 300)}`)
}

console.log(`✅ IndexNow принял ${unique.length} URL (HTTP ${response.status})`)
