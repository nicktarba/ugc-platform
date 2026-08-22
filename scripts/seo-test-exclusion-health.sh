#!/bin/bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/ugc-platform}"
SUPA_DIR="${SUPA_DIR:-/opt/supabase/docker}"
BASE_URL="${PUBLIC_URL:-https://svoi-ugc.ru}"

fail(){ echo "❌ SEO TEST FILTER HEALTH: $1"; exit 1; }
http_code(){ curl --max-time 15 -L -sS -o /dev/null -w '%{http_code}' "$1" || true; }

cd "$APP_DIR"

[ -f config/seo-excluded-authors.json ] || fail "config/seo-excluded-authors.json отсутствует"

EXCLUDED_IDS="$(node - <<'NODE'
const cfg=require('./config/seo-excluded-authors.json')
const ids=Array.isArray(cfg.excludedAuthorIds)?cfg.excludedAuthorIds:[]
for (const id of ids) console.log(id)
NODE
)"

echo "SEO-excluded profiles: $(printf '%s\n' "$EXCLUDED_IDS" | sed '/^$/d' | wc -l | tr -d ' ')"

for path in / /ugc /ugc-avtory /ugc-dlya-biznesa /robots.txt /sitemap.xml; do
  code="$(http_code "$BASE_URL$path")"
  [ "$code" = "200" ] || fail "$path вернул HTTP $code"
done
echo "✅ Core SEO pages remain HTTP 200"

ROBOTS="$(curl --max-time 15 -fsSL "$BASE_URL/robots.txt")"
printf '%s' "$ROBOTS" | grep -q 'User-agent: OAI-SearchBot' || fail "OAI-SearchBot rule отсутствует"
printf '%s' "$ROBOTS" | grep -A2 'User-agent: OAI-SearchBot' | grep -q 'Allow: /' || fail "OAI-SearchBot больше не разрешён"
if printf '%s' "$ROBOTS" | awk 'BEGIN{ua=0} /^User-agent:[[:space:]]*\*/{ua=1;next} /^User-agent:/{ua=0} ua && /^Disallow:[[:space:]]*\/[[:space:]]*$/{bad=1} END{exit bad?0:1}'; then
  fail "robots.txt содержит глобальный Disallow: /"
fi
echo "✅ robots.txt не получил глобальную блокировку"

SITEMAP="$(curl --max-time 20 -fsSL "$BASE_URL/sitemap.xml")"
for path in /ugc /ugc-avtory /ugc-dlya-biznesa /o-servise; do
  printf '%s' "$SITEMAP" | grep -q "<loc>$BASE_URL$path</loc>" || fail "sitemap потерял $path"
done
echo "✅ Core sitemap URLs remain present"

while IFS= read -r id; do
  [ -n "$id" ] || continue
  if printf '%s' "$SITEMAP" | grep -q "$BASE_URL/author/$id"; then
    fail "исключённый author/$id всё ещё в sitemap"
  fi
  html="$(curl --max-time 20 -fsSL "$BASE_URL/author/$id")"
  printf '%s' "$html" | grep -Eqi 'name="robots"[^>]+noindex|noindex[^>]+name="robots"' || fail "author/$id не получил noindex"
done <<< "$EXCLUDED_IDS"
echo "✅ Excluded test profiles absent from sitemap and return noindex"

cd "$SUPA_DIR"
DB_ID="$(docker compose ps -q db)"
[ -n "$DB_ID" ] || fail "Supabase DB container не найден"

db_query() {
  local sql="$1"
  docker exec "$DB_ID" bash -lc '
    PGPASSWORD="$POSTGRES_PASSWORD" psql -X -U postgres -d postgres -Atc "$1"
  ' bash "$sql"
}

APPROVED_TOTAL="$(db_query "SELECT count(*) FROM public.authors WHERE status='approved'" | tr -d '[:space:]')"
SITEMAP_AUTHOR_TOTAL="$(printf '%s' "$SITEMAP" | grep -o "$BASE_URL/author/[0-9a-fA-F-]*" | sort -u | wc -l | tr -d ' ')"

EXCLUDED_SQL="$(printf '%s\n' "$EXCLUDED_IDS" | sed '/^$/d' | sed "s/.*/'&'::uuid/" | paste -sd, -)"
if [ -n "$EXCLUDED_SQL" ]; then
  EXCLUDED_APPROVED="$(db_query "SELECT count(*) FROM public.authors WHERE status='approved' AND id IN ($EXCLUDED_SQL)" | tr -d '[:space:]')"
else
  EXCLUDED_APPROVED=0
fi

EXPECTED=$((APPROVED_TOTAL - EXCLUDED_APPROVED))
[ "$SITEMAP_AUTHOR_TOTAL" -eq "$EXPECTED" ] || fail "в sitemap $SITEMAP_AUTHOR_TOTAL author URL, ожидалось $EXPECTED (approved=$APPROVED_TOTAL, excluded-approved=$EXCLUDED_APPROVED)"
echo "✅ Sitemap author count exact: $SITEMAP_AUTHOR_TOTAL = approved $APPROVED_TOTAL - excluded $EXCLUDED_APPROVED"

if [ "$EXPECTED" -gt 0 ]; then
  if [ -n "$EXCLUDED_SQL" ]; then
    INCLUDED_ID="$(db_query "SELECT id FROM public.authors WHERE status='approved' AND id NOT IN ($EXCLUDED_SQL) ORDER BY created_at DESC LIMIT 1" | tr -d '[:space:]')"
  else
    INCLUDED_ID="$(db_query "SELECT id FROM public.authors WHERE status='approved' ORDER BY created_at DESC LIMIT 1" | tr -d '[:space:]')"
  fi
  [ -n "$INCLUDED_ID" ] || fail "не удалось выбрать контрольный индексируемый approved-профиль"
  printf '%s' "$SITEMAP" | grep -q "$BASE_URL/author/$INCLUDED_ID" || fail "контрольный реальный/разрешённый author/$INCLUDED_ID отсутствует в sitemap"
  html="$(curl --max-time 20 -fsSL "$BASE_URL/author/$INCLUDED_ID")"
  if printf '%s' "$html" | grep -Eqi 'name="robots"[^>]+noindex|noindex[^>]+name="robots"'; then
    fail "контрольный разрешённый author/$INCLUDED_ID неожиданно получил noindex"
  fi
  echo "✅ At least one non-excluded approved profile remains indexable"
else
  echo "ℹ️ Сейчас нет non-excluded approved-профилей; будущие approved по умолчанию будут индексируемыми"
fi

echo "✅ SEO TEST PROFILE FILTER HEALTH PASSED"
