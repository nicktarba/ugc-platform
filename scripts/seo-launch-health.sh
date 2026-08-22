#!/bin/bash
set -Eeuo pipefail

BASE_URL="${PUBLIC_URL:-https://svoi-ugc.ru}"
fail(){ echo "❌ SEO HEALTH: $1"; exit 1; }

http_code(){ curl --max-time 15 -L -sS -o /dev/null -w '%{http_code}' "$1" || true; }

for path in / /robots.txt /sitemap.xml /llms.txt /ugc /ugc-avtory /ugc-dlya-biznesa /ugc-kreator /kak-nayti-ugc-avtora /kak-stat-ugc-avtorom /ugc-video /ugc-dlya-marketpleysov /ugc-v-reklame /ugc-i-blogery /ugc-dlya-lokalnogo-biznesa /o-servise /support; do
  code="$(http_code "$BASE_URL$path")"
  [ "$code" = "200" ] || fail "$path вернул HTTP $code"
done
echo "✅ Core SEO pages: HTTP 200"

ROBOTS="$(curl --max-time 15 -fsSL "$BASE_URL/robots.txt")"
printf '%s' "$ROBOTS" | grep -q 'User-agent: OAI-SearchBot' || fail 'robots.txt не содержит OAI-SearchBot'
printf '%s' "$ROBOTS" | grep -A2 'User-agent: OAI-SearchBot' | grep -q 'Allow: /' || fail 'OAI-SearchBot не разрешён'
printf '%s' "$ROBOTS" | grep -q "Sitemap: $BASE_URL/sitemap.xml" || fail 'robots.txt не содержит Sitemap'
printf '%s' "$ROBOTS" | grep -q 'Clean-param:' || fail 'robots.txt не содержит Yandex Clean-param'
echo "✅ robots.txt: Google/Yandex/AI discovery rules present"

SITEMAP="$(curl --max-time 20 -fsSL "$BASE_URL/sitemap.xml")"
printf '%s' "$SITEMAP" | grep -q '<urlset' || fail 'sitemap.xml не похож на XML sitemap'
for path in /ugc /ugc-avtory /ugc-dlya-biznesa /o-servise; do
  printf '%s' "$SITEMAP" | grep -q "<loc>$BASE_URL$path</loc>" || fail "sitemap.xml не содержит $path"
done
echo "✅ sitemap.xml: core canonical URLs present"

LLMS="$(curl --max-time 15 -fsSL "$BASE_URL/llms.txt")"
printf '%s' "$LLMS" | grep -q 'СВОИ UGC' || fail 'llms.txt не содержит бренд'
printf '%s' "$LLMS" | grep -q "$BASE_URL/ugc-avtory" || fail 'llms.txt не содержит UGC hub'
echo "✅ llms.txt published (supplemental AI-readable summary)"

HOME="$(curl --max-time 15 -fsSL "$BASE_URL/")"
printf '%s' "$HOME" | grep -q 'application/ld+json' || fail 'на главной нет JSON-LD'
printf '%s' "$HOME" | grep -q 'rel="canonical"' || fail 'на главной нет canonical'
echo "✅ Home canonical + JSON-LD present"

CATALOG="$(curl --max-time 15 -fsSL "$BASE_URL/catalog")"
printf '%s' "$CATALOG" | grep -Eqi 'name="robots"[^>]+noindex|noindex[^>]+name="robots"' || fail '/catalog не получил noindex'
echo "✅ Interactive catalog excluded from duplicate indexing"

for path in /login /register /forgot-password /reset-password; do
  headers="$(curl --max-time 15 -sS -D - -o /dev/null "$BASE_URL$path" | tr -d '\r')"
  printf '%s' "$headers" | grep -Eqi '^x-robots-tag:.*noindex' || fail "$path без X-Robots-Tag noindex"
done
echo "✅ Auth pages: X-Robots-Tag noindex"

AUTHOR_URL="$(printf '%s' "$SITEMAP" | sed -n "s#.*<loc>\($BASE_URL/author/[^<]*\)</loc>.*#\1#p" | head -n1)"
if [ -n "$AUTHOR_URL" ]; then
  AUTHOR_HTML="$(curl --max-time 20 -fsSL "$AUTHOR_URL")"
  printf '%s' "$AUTHOR_HTML" | grep -q 'ProfilePage' || fail 'публичный профиль автора без ProfilePage JSON-LD'
  printf '%s' "$AUTHOR_HTML" | grep -q 'rel="canonical"' || fail 'публичный профиль автора без canonical'
  printf '%s' "$AUTHOR_HTML" | grep -q '<h1' || fail 'публичный профиль автора не содержит server-rendered H1'
  echo "✅ Public author profile: SSR + canonical + ProfilePage schema"
else
  echo "ℹ️ В sitemap пока нет approved author URL — author SEO check пропущен"
fi

INDEXNOW_CODE="$(http_code "$BASE_URL/indexnow-key.txt")"
[ "$INDEXNOW_CODE" = "200" ] || fail 'IndexNow key endpoint не отдаёт 200'
INDEXNOW_KEY_BODY="$(curl --max-time 15 -fsSL "$BASE_URL/indexnow-key.txt" | tr -d '\r\n')"
printf '%s' "$INDEXNOW_KEY_BODY" | grep -Eq '^[A-Za-z0-9-]{8,128}$' || fail 'IndexNow key некорректен'
echo "✅ IndexNow key published"

CSS_URL="$(printf '%s' "$HOME" | grep -oE '/_next/static/css/[^"?]+\.css' | head -n1 || true)"
if [ -n "$CSS_URL" ]; then
  CSS_TYPE="$(curl --max-time 15 -sSI "$BASE_URL$CSS_URL" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-type"{print tolower($2);exit}')"
  printf '%s' "$CSS_TYPE" | grep -q 'text/css' || fail "CSS content-type: $CSS_TYPE"
fi

JS_URL="$(printf '%s' "$HOME" | grep -oE '/_next/static/[^"?]+\.js' | head -n1 || true)"
if [ -n "$JS_URL" ]; then
  [ "$(http_code "$BASE_URL$JS_URL")" = "200" ] || fail 'JS asset не отдаёт 200'
fi
echo "✅ CSS/JS assets healthy"

echo "✅ SEO + AI DISCOVERY TECH HEALTH PASSED"
