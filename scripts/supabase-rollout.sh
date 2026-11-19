#!/usr/bin/env bash
set +x
set -euo pipefail

root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
dry_run=false
selected=false
audit=false apply=false validate=false deploy=false smoke=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=true ;;
    --audit) audit=true; selected=true ;;
    --apply) apply=true; selected=true ;;
    --validate) validate=true; selected=true ;;
    --deploy) deploy=true; selected=true ;;
    --smoke) smoke=true; selected=true ;;
    --help)
      echo 'Usage: scripts/supabase-rollout.sh [--dry-run] [--audit] [--apply] [--validate] [--deploy] [--smoke]'
      echo 'No step flags selects all steps. Dry-run requires no credentials and makes no connections.'
      exit 0 ;;
    *) echo 'Unknown argument; use --help.' >&2; exit 1 ;;
  esac
done
if ! $selected; then
  audit=true apply=true validate=true deploy=true smoke=true
fi

fail() { echo "$1" >&2; exit 1; }
need_tool() { command -v "$1" >/dev/null || fail "Required tool missing: $1"; }
need_env() {
  local name
  for name in "$@"; do
    [[ -n ${!name:-} ]] || fail "Required environment variable missing: $name"
    [[ ${!name} != *$'\n'* && ${!name} != *$'\r'* ]] || fail "Environment variable must be single-line: $name"
  done
}
manual_steps() {
  cat <<'TEXT'
Remaining maintainer steps:
- Create/configure a Turnstile site for the frontend hostnames (action: waitlist-signup).
- Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_TURNSTILE_SITE_KEY in Vercel and redeploy.
- Confirm client-IP headers using the private debug procedure in docs/SUPABASE_MAINNET.md; remove debug instrumentation afterward.
- Confirm the named cleanup cron job exists, or enable pg_cron and re-run 003 / schedule the purge manually.
- Resolve reported legacy-row violations, re-run --audit --validate, and coordinate anon-key rotation with all clients.
TEXT
}
if $dry_run; then
  $audit && echo 'Would audit counts for all five migration 002 checks (no personal data).'
  $apply && echo 'Would apply migrations 002 and 003 with psql ON_ERROR_STOP.'
  $validate && echo 'Would recount violations and VALIDATE only zero-violation constraints.'
  $deploy && echo 'Would stream secrets to Supabase CLI stdin, then deploy waitlist-signup.'
  $smoke && echo 'Would check anon insert denial, allowed-origin OPTIONS CORS and missing-token rejection.'
  manual_steps
  exit 0
fi

if $audit || $apply || $validate; then
  need_tool psql
  need_env PGHOST PGDATABASE PGUSER PGPASSWORD
fi
if $deploy; then
  need_tool supabase
  need_env SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF ALLOWED_ORIGINS TURNSTILE_SECRET_KEY WAITLIST_IP_SALT
  WAITLIST_RATE_LIMIT=${WAITLIST_RATE_LIMIT:-5}
  if [[ ! $WAITLIST_RATE_LIMIT =~ ^[1-9][0-9]{0,3}$ ]] || (( WAITLIST_RATE_LIMIT > 1000 )); then
    fail 'WAITLIST_RATE_LIMIT must be 1-1000.'
  fi
  (( ${#WAITLIST_IP_SALT} >= 32 )) || fail 'WAITLIST_IP_SALT must have at least 32 characters.'
  [[ $WAITLIST_IP_SALT =~ ^[a-zA-Z0-9_+/=-]+$ ]] || fail 'Use a hex or base64 WAITLIST_IP_SALT.'
  [[ $TURNSTILE_SECRET_KEY =~ ^[a-zA-Z0-9_-]+$ ]] || fail 'Invalid Turnstile secret format.'
  case "$ALLOWED_ORIGINS" in
    *'$'*|*'"'*|*"'"*|*"\\"*|*'#'*|*' '*|*$'\t'*) fail 'Use comma-separated origins without whitespace or dotenv metacharacters.' ;;
  esac
fi
if $smoke; then
  need_tool curl
  need_tool jq
  need_tool awk
  need_env SUPABASE_URL SUPABASE_ANON_KEY ALLOWED_ORIGINS
  [[ $SUPABASE_URL == https://* || $SUPABASE_URL == http://localhost:* || $SUPABASE_URL == http://127.0.0.1:* ]] || fail 'SUPABASE_URL must use HTTPS (or local HTTP).'
  [[ $SUPABASE_ANON_KEY =~ ^[a-zA-Z0-9._-]+$ ]] || fail 'Invalid anon key format.'
fi

checks() {
  cat <<'SQL'
waitlist|waitlist_name_length_chk|char_length(trim(name)) between 2 and 100
waitlist|waitlist_email_format_chk|char_length(email) <= 254 and email = lower(trim(email)) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
usernames|usernames_username_format_chk|username ~ '^[a-z0-9]{3,20}$'
usernames|usernames_wallet_format_chk|wallet_address ~ '^0x[0-9a-f]{40}$'
usernames|usernames_normalized_consistency_chk|normalized_username = lower(replace(replace(username, '0', 'o'), '1', 'l'))
SQL
}
psql_cmd=(psql -X --no-password -v ON_ERROR_STOP=1)
audit_checks() {
  local table constraint expression count
  while IFS='|' read -r table constraint expression; do
    count=$("${psql_cmd[@]}" -Atqc "select count(*) from public.$table where not ($expression)")
    [[ $count =~ ^[0-9]+$ ]] || fail 'Unexpected audit count.'
    printf '%s: %s violation(s)\n' "$constraint" "$count"
    if [[ $1 == validate ]]; then
      if [[ $count == 0 ]]; then
        "${psql_cmd[@]}" -c "alter table public.$table validate constraint $constraint"
      else
        printf 'NOT VALIDATED: %s; maintainer cleanup required.\n' "$constraint"
      fi
    fi
  done < <(checks)
}
$audit && audit_checks audit
if $apply; then
  "${psql_cmd[@]}" -f "$root/supabase/migrations/002_harden_anon_writes.sql"
  "${psql_cmd[@]}" -f "$root/supabase/migrations/003_waitlist_rate_limit_cleanup.sql"
fi
$validate && audit_checks validate
if $deploy; then
  printf 'ALLOWED_ORIGINS=%s\nTURNSTILE_SECRET_KEY=%s\nWAITLIST_IP_SALT=%s\nWAITLIST_RATE_LIMIT=%s\n' \
    "$ALLOWED_ORIGINS" "$TURNSTILE_SECRET_KEY" "$WAITLIST_IP_SALT" "$WAITLIST_RATE_LIMIT" |
    supabase secrets set --env-file /dev/stdin --project-ref "$SUPABASE_PROJECT_REF"
  supabase functions deploy waitlist-signup --project-ref "$SUPABASE_PROJECT_REF" --workdir "$root"
fi
if $smoke; then
  read -r origin _ <<< "${ALLOWED_ORIGINS//,/ }"
  request() {
    printf 'header = "apikey: %s"\nheader = "Authorization: Bearer %s"\n' "$SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" |
      curl --config - --silent --show-error --max-time 20 --write-out '\n%{http_code}' \
        --header "Origin: $origin" --header 'Content-Type: application/json' "$@"
  }
  response=$(request --request POST --url "${SUPABASE_URL%/}/rest/v1/waitlist" \
    --data '{"name":"Rollout smoke check","email":"rollout-smoke@example.invalid"}')
  status=${response##*$'\n'}
  [[ $status == 401 || $status == 403 ]] || fail 'Anon insert was not denied with HTTP 401/403.'
  jq -e '.code == "42501"' >/dev/null 2>&1 <<< "${response%$'\n'*}" || fail 'Anon insert did not return permission denied.'
  echo 'SMOKE: anon insert denied.'
  response=$(request --include --request OPTIONS --header 'Access-Control-Request-Method: POST' \
    --url "${SUPABASE_URL%/}/functions/v1/waitlist-signup")
  [[ ${response##*$'\n'} == 204 ]] || fail 'OPTIONS did not return HTTP 204.'
  awk -v origin="$origin" 'tolower($1) == "access-control-allow-origin:" {sub(/\r$/, "", $2); if ($2 == origin) found=1} END {exit !found}' \
    <<< "$response" || fail 'OPTIONS did not allow the configured origin.'
  echo 'SMOKE: allowed-origin CORS accepted.'
  response=$(request --request POST --url "${SUPABASE_URL%/}/functions/v1/waitlist-signup" \
    --data '{"name":"Rollout smoke check","email":"rollout-smoke@example.invalid"}')
  [[ ${response##*$'\n'} == 400 ]] || fail 'Missing-token POST did not return HTTP 400.'
  jq -e '. == {"message":"Unable to join the waitlist. Please try again later."}' >/dev/null 2>&1 \
    <<< "${response%$'\n'*}" || fail 'Missing-token POST did not return the generic error.'
  echo 'SMOKE: missing token rejected generically.'
fi
manual_steps
