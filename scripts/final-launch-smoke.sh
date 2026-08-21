#!/bin/bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/ugc-platform}"
SUPA_DIR="${SUPA_DIR:-/opt/supabase/docker}"
PUBLIC_URL="${PUBLIC_URL:-https://svoi-ugc.ru}"

fail() {
  echo "❌ $1"
  exit 1
}

command -v curl >/dev/null || fail "curl не найден"
command -v docker >/dev/null || fail "docker не найден"

cd "$APP_DIR"

echo "=== SVOI UGC — FINAL LAUNCH SMOKE ==="

echo "--- PUBLIC PAGES ---"
for path in / /login /register /forgot-password /support /catalog; do
  code="$(curl --max-time 15 -L -sS -o /tmp/svoi-smoke-page.html -w '%{http_code}' "${PUBLIC_URL}${path}" || true)"
  echo "$path -> $code"
  [ "$code" = "200" ] || fail "${path} не отвечает 200"
done

SUPPORT_HTML="$(curl --max-time 15 -L -sS "${PUBLIC_URL}/support" || true)"
printf '%s' "$SUPPORT_HTML" | grep -q 'support@svoi-ugc.ru' || fail "На /support нет support@svoi-ugc.ru"
echo "✅ Support email опубликован"

echo "--- AUTH/API SECURITY ---"
notify_code="$(curl --max-time 10 -sS -o /tmp/svoi-smoke-notify.json -w '%{http_code}' "${PUBLIC_URL}/api/notifications" || true)"
prefs_code="$(curl --max-time 10 -sS -o /tmp/svoi-smoke-prefs.json -w '%{http_code}' "${PUBLIC_URL}/api/email-preferences" || true)"
search_code="$(curl --max-time 10 -sS -o /tmp/svoi-smoke-search.json -w '%{http_code}' -X POST "${PUBLIC_URL}/api/search" -H 'Content-Type: application/json' --data '{"query":"test"}' || true)"
complaint_code="$(curl --max-time 10 -sS -o /tmp/svoi-smoke-complaint.json -w '%{http_code}' -X POST "${PUBLIC_URL}/api/complaints" -H 'Content-Type: application/json' --data '{"kind":"profile"}' || true)"
admin_code="$(curl --max-time 10 -sS -o /tmp/svoi-smoke-admin.json -w '%{http_code}' "${PUBLIC_URL}/api/admin" || true)"
captcha_code="$(curl --max-time 10 -sS -o /tmp/svoi-smoke-register.json -w '%{http_code}' -X POST "${PUBLIC_URL}/api/auth/register" -H 'Content-Type: application/json' --data '{"email":"probe@example.invalid","password":"ProbePass123!","role":"author","captchaToken":""}' || true)"

echo "notifications=$notify_code prefs=$prefs_code search=$search_code complaints=$complaint_code admin=$admin_code register-no-captcha=$captcha_code"
[ "$notify_code" = "401" ] || fail "notifications API без авторизации должен быть 401"
[ "$prefs_code" = "401" ] || fail "email preferences API без авторизации должен быть 401"
[ "$search_code" = "401" ] || fail "search API без авторизации должен быть 401"
[ "$complaint_code" = "401" ] || fail "complaints API без авторизации должен быть 401"
[ "$admin_code" = "401" ] || fail "admin API без авторизации должен быть 401"
[ "$captcha_code" = "400" ] || fail "register без CAPTCHA должен быть 400"
echo "✅ API security checks passed"

echo "--- CSS ---"
HOME_HTML="$(curl --max-time 15 -L -sS "${PUBLIC_URL}/" || true)"
CSS_PATH="$(printf '%s' "$HOME_HTML" | python3 -c 'import re,sys; s=sys.stdin.read(); m=re.search(r"(?:href|src)=[\"\x27]([^\"\x27]+\.css(?:\?[^\"\x27]*)?)[\"\x27]",s); print(m.group(1) if m else "")')"
[ -n "$CSS_PATH" ] || fail "CSS path не найден"
CSS_CODE="$(curl --max-time 15 -sS -D /tmp/svoi-smoke-css.headers -o /dev/null -w '%{http_code}' "${PUBLIC_URL}${CSS_PATH}" || true)"
CSS_TYPE="$(grep -i '^content-type:' /tmp/svoi-smoke-css.headers | tail -n1 | tr -d '\r' || true)"
echo "$CSS_PATH -> $CSS_CODE · $CSS_TYPE"
[ "$CSS_CODE" = "200" ] || fail "CSS не отвечает 200"
printf '%s' "$CSS_TYPE" | grep -qi 'text/css' || fail "CSS имеет неправильный content-type"

echo "--- DATABASE ---"
cd "$SUPA_DIR"
DB_ID="$(docker compose ps -q db)"
[ -n "$DB_ID" ] || fail "Supabase DB container не найден"

db_query() {
  local sql="$1"
  docker exec "$DB_ID" bash -lc '
    PGPASSWORD="$POSTGRES_PASSWORD" psql -X -U postgres -d postgres -Atc "$1"
  ' bash "$sql"
}

echo "platform_admins=$(db_query "SELECT count(*) FROM public.platform_admins")"
echo "account_pref=$(db_query "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='email_notification_preferences' AND column_name='account'")"
echo "complaints_pref=$(db_query "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='email_notification_preferences' AND column_name='complaints'")"
echo "avatar_limit=$(db_query "SELECT file_size_limit FROM storage.buckets WHERE id='avatars'")"
echo "avatar_mimes=$(db_query "SELECT array_to_string(allowed_mime_types, ',') FROM storage.buckets WHERE id='avatars'")"

ADMIN_COUNT="$(db_query "SELECT count(*) FROM public.platform_admins" | tr -d '[:space:]')"
[ -n "$ADMIN_COUNT" ] && [ "$ADMIN_COUNT" -ge 1 ] || fail "platform_admins пуст"

TRIGGER_COUNT="$(db_query "SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal AND tgname IN ('trg_profile_created_notification_launch','trg_business_profile_completed_notification_launch','trg_author_submission_notification_launch','trg_author_moderation_notification_launch','trg_complaint_notification_launch')" | tr -d '[:space:]')"
[ "$TRIGGER_COUNT" = "5" ] || fail "Ожидалось 5 final-launch triggers, найдено $TRIGGER_COUNT"

AVATAR_LIMIT="$(db_query "SELECT file_size_limit FROM storage.buckets WHERE id='avatars'" | tr -d '[:space:]')"
[ "$AVATAR_LIMIT" = "5242880" ] || fail "Лимит avatars не 5 МБ"

REVIEW_POLICY_OK="$(db_query "SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='reviews' AND policyname='Business can insert review' AND with_check LIKE '%r.author_id = reviews.author_id%'" | tr -d '[:space:]')"
[ "$REVIEW_POLICY_OK" = "1" ] || fail "P0 review policy больше не совпадает с проверенной версией"

echo "✅ Database checks passed"

echo "--- EMAIL WORKER ---"
systemctl is-enabled --quiet svoi-ugc-email.timer || fail "email timer не enabled"
systemctl is-active --quiet svoi-ugc-email.timer || fail "email timer не active"
[ -x /usr/local/bin/svoi-ugc-email-worker ] || fail "email worker wrapper не найден"
echo "✅ Email timer active"

echo "--- MFA READINESS ---"
cd "$APP_DIR"
grep -q 'enable_admin_mfa' app/api/admin/action/route.ts || fail "MFA server action отсутствует"
grep -q 'supabase.auth.mfa.enroll' 'app/(app)/dashboard/admin/page.tsx' || fail "MFA UI отсутствует"
echo "✅ MFA готов, но принудительно не включался"

echo "--- CLEANUP ---"
if git ls-files | grep -E '(^|/)(project\.zip|\.DS_Store|\._[^/]+)$|\.(bak|save)$' >/tmp/svoi-smoke-junk.txt; then
  cat /tmp/svoi-smoke-junk.txt
  fail "В Git остались backup/junk файлы"
fi
echo "✅ Junk-файлов в Git нет"

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ FINAL LAUNCH SMOKE PASSED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
