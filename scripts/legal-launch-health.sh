#!/bin/bash
set -Eeuo pipefail

PUBLIC_URL="${PUBLIC_URL:-https://svoi-ugc.ru}"

fail() { echo "❌ $1"; exit 1; }

for path in / /register /support /privacy /personal-data-consent /distribution-consent /terms; do
  code="$(curl --max-time 12 -L -sS -o /tmp/svoi-legal-page.html -w '%{http_code}' "$PUBLIC_URL$path" || true)"
  [ "$code" = "200" ] || fail "$path вернул HTTP $code"
done

echo "✅ Public/legal pages: HTTP 200"

HOME_HTML="$(curl --max-time 12 -L -sS "$PUBLIC_URL/")"
if printf '%s' "$HOME_HTML" | grep -qE 'fonts\.googleapis\.com|fonts\.gstatic\.com'; then
  fail "В HTML всё ещё есть внешний Google Fonts"
fi
echo "✅ Google Fonts browser requests removed"

CSS_PATH="$(printf '%s' "$HOME_HTML" | python3 -c 'import re,sys; h=sys.stdin.read(); m=re.search(r"href=[\"\x27]([^\"\x27]*_next/static/[^\"\x27]+\.css[^\"\x27]*)[\"\x27]", h); print(m.group(1) if m else "")')"
[ -n "$CSS_PATH" ] || fail "Не удалось найти CSS asset в HTML"
CSS_HEADERS="$(curl --max-time 12 -sSI "$PUBLIC_URL$CSS_PATH")"
printf '%s\n' "$CSS_HEADERS" | grep -qiE '^content-type:[[:space:]]*text/css' || fail "CSS asset имеет неверный Content-Type"
echo "✅ CSS asset: text/css"

JS_PATH="$(printf '%s' "$HOME_HTML" | python3 -c 'import re,sys; h=sys.stdin.read(); m=re.search(r"src=[\"\x27]([^\"\x27]*_next/static/[^\"\x27]+\.js[^\"\x27]*)[\"\x27]", h); print(m.group(1) if m else "")')"
[ -n "$JS_PATH" ] || fail "Не удалось найти JS asset в HTML"
JS_CODE="$(curl --max-time 12 -sS -o /dev/null -w '%{http_code}' "$PUBLIC_URL$JS_PATH" || true)"
[ "$JS_CODE" = "200" ] || fail "JS asset вернул HTTP $JS_CODE"
echo "✅ JS asset: HTTP 200"

LEGAL_API_CODE="$(curl --max-time 12 -sS -o /tmp/svoi-legal-api.json -w '%{http_code}' "$PUBLIC_URL/api/legal-consent?type=author_publication" || true)"
[ "$LEGAL_API_CODE" = "401" ] || fail "Unauth legal-consent должен вернуть 401, сейчас $LEGAL_API_CODE"
echo "✅ Legal consent API требует авторизацию"

echo "✅ LEGAL TECH HEALTH PASSED"
