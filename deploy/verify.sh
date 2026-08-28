#!/usr/bin/env bash

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$HERE/.." && pwd)"
cd "$REPO_DIR"

ENV_FILE="$HERE/.env"
REQUIRED_SECRETS=(CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID)
LOGIN_HOST="cloudflareaccess.com"
EXPIRY="_expiry"

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  GREEN=$(tput setaf 2); RED=$(tput setaf 1); YELLOW=$(tput setaf 3)
else
  BOLD=""; DIM=""; RESET=""; GREEN=""; RED=""; YELLOW=""
fi

FAILURES=()
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

section() { printf '\n%s%s%s\n' "$BOLD" "$1" "$RESET"; }
ok()      { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
note()    { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
skip()    { printf '  %s·%s %s\n' "$YELLOW" "$RESET" "$1"; }
bad()     { printf '  %s✗%s %s\n' "$RED" "$RESET" "$1"; FAILURES+=("$2"); }

report_and_exit() {
  printf '\n%s✗ %s to fix%s\n\n' "$RED" "${#FAILURES[@]}" "$RESET"
  printf '  %s\n' "${FAILURES[@]}"
  printf '\n'
  exit 1
}

contains() {
  local needle="$1"; shift
  local item
  for item in "$@"; do [[ "$item" == "$needle" ]] && return 0; done
  return 1
}

remembered() {
  [[ -f "$ENV_FILE" ]] || return 0
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n1
}

request() {
  curl -sS --max-time 30 -o "$WORK/body" -D "$WORK/head" -w '%{http_code} %{redirect_url}' "$@" || true
}

status_of() { printf '%s' "${1%% *}"; }
redirect_of() { printf '%s' "${1#* }"; }

admitted() {
  request -K "$WORK/token" "$@"
}

printf '\n%s  seatscout deployment%s\n' "$BOLD" "$RESET"
note "Nothing here reads a secret value. Cloudflare credentials are not needed in this shell."

section "Toolchain"

for tool in gh curl node; do
  if command -v "$tool" >/dev/null 2>&1; then
    ok "$tool"
  else
    bad "$tool is not installed" "Install $tool"
  fi
done

if command -v gh >/dev/null 2>&1 && ! gh auth status >/dev/null 2>&1; then
  bad "gh is not authenticated" "Run: gh auth login"
fi

(( ${#FAILURES[@]} )) && report_and_exit

WORKER="$(node -p 'require("./apps/proxy/wrangler.json").name')"
ADAPTER=packages/core/src/source/aggregator.ts
BOOTSTRAP="$(sed -n 's/^const BOOTSTRAP = "\(.*\)";$/\1/p' "$ADAPTER")"
BOOTSTRAP_FORM="$(sed -n 's/^const BOOTSTRAP_FORM = "\(.*\)";$/\1/p' "$ADAPTER")"

section "Repository"

if [[ -n "$BOOTSTRAP" && -n "$BOOTSTRAP_FORM" ]] && grep -q "$EXPIRY=" "$ADAPTER"; then
  ok "the worker is $WORKER and the session opens with POST $BOOTSTRAP"
else
  bad "$ADAPTER no longer bootstraps the way this script does" \
    "This script mirrors the adapter's bootstrap rather than restating it; that request has changed"
  report_and_exit
fi

if REPO_SLUG="$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null)"; then
  ok "$REPO_SLUG, from $REPO_DIR"
else
  bad "gh cannot resolve a GitHub repository at $REPO_DIR" "Check that origin points at your fork"
  report_and_exit
fi

PRESENT_SECRETS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && PRESENT_SECRETS+=("$line")
done < <(gh secret list --json name --jq '.[].name')

for name in "${REQUIRED_SECRETS[@]}"; do
  if contains "$name" ${PRESENT_SECRETS[@]+"${PRESENT_SECRETS[@]}"}; then
    ok "$name is set"
  else
    bad "$name is not set" "Set it: gh secret set $name"
  fi
done

section "Deploy on merge"

RUN="$(gh run list --workflow deploy.yml --branch main --limit 1 --json conclusion,url --jq '.[] | "\(.conclusion) \(.url)"' 2>/dev/null || true)"
case "$RUN" in
  "") bad "the Deploy workflow has never run on main" "Run it: gh workflow run deploy.yml --ref main" ;;
  success*) ok "the last deploy of main succeeded" ;;
  *) bad "the last deploy of main ended $RUN" "Read the run, fix it, and dispatch another" ;;
esac

section "Live deployment"

SEATSCOUT_URL="${SEATSCOUT_URL:-$(remembered SEATSCOUT_URL)}"

if [[ -z "$SEATSCOUT_URL" ]]; then
  bad "no deployment URL" "Export SEATSCOUT_URL, or run setup.sh, which writes deploy/.env"
  report_and_exit
fi

if [[ "$SEATSCOUT_URL" =~ ^https://${WORKER}\.[a-z0-9-]+\.workers\.dev$ ]]; then
  ok "$SEATSCOUT_URL"
else
  bad "$SEATSCOUT_URL does not name the worker apps/proxy/wrangler.json deploys" \
    "The deployment is at https://$WORKER.<your-subdomain>.workers.dev"
  report_and_exit
fi

ANONYMOUS="$(request "$SEATSCOUT_URL/")"
if [[ "$(status_of "$ANONYMOUS")" == "000" ]]; then
  bad "nothing answers at $SEATSCOUT_URL" "Check the URL, and that a deploy has actually run"
  report_and_exit
fi

if [[ "$(status_of "$ANONYMOUS")" == "302" && "$(redirect_of "$ANONYMOUS")" == *".$LOGIN_HOST/"* ]]; then
  ok "an anonymous request is sent to your team domain to sign in"
else
  bad "an anonymous request answered $(status_of "$ANONYMOUS") rather than a redirect to $LOGIN_HOST" \
    "Protect the worker: Workers & Pages > $WORKER > Access > Protect this Worker behind Access"
fi

section "An admitted identity"

if [[ -z "${SEATSCOUT_ACCESS_CLIENT_ID:-}" || -z "${SEATSCOUT_ACCESS_CLIENT_SECRET:-}" ]]; then
  skip "no service token in this shell, so nothing past the gate is checked"
  note "Export SEATSCOUT_ACCESS_CLIENT_ID and SEATSCOUT_ACCESS_CLIENT_SECRET to check it."
  (( ${#FAILURES[@]} )) && report_and_exit
  printf '\n%s✓ the deployment is live and Access is in front of it%s\n\n' "$GREEN" "$RESET"
  exit 0
fi

( umask 077 && printf 'header = "CF-Access-Client-Id: %s"\nheader = "CF-Access-Client-Secret: %s"\n' \
  "$SEATSCOUT_ACCESS_CLIENT_ID" "$SEATSCOUT_ACCESS_CLIENT_SECRET" > "$WORK/token" )

SHELL_RESPONSE="$(admitted "$SEATSCOUT_URL/")"
if [[ "$(status_of "$SHELL_RESPONSE")" == "302" && "$(redirect_of "$SHELL_RESPONSE")" == *".$LOGIN_HOST/"* ]]; then
  bad "the service token was sent to sign in rather than admitted" \
    "Add a policy with action Service Auth and an Include rule naming that token"
  report_and_exit
fi
ok "the service token is admitted rather than sent to sign in"

PROXIED="$(admitted -X POST -H "content-type: $BOOTSTRAP_FORM" \
  --data "$EXPIRY=$(date +%s)000" "$SEATSCOUT_URL$BOOTSTRAP")"
BODY="$(cat "$WORK/body")"
STATUS="$(status_of "$PROXIED")"

if [[ "$BODY" == "The proxy is not configured" ]]; then
  bad "the worker holds no configuration" \
    "Set ACCESS_TEAM_DOMAIN, ACCESS_AUD and UPSTREAM_ORIGIN: wrangler secret put <name>"
elif [[ "$BODY" == "No access assertion" ]]; then
  bad "Access admitted the request but the worker received no assertion" \
    "The router in front of a worker serving static assets did not pass Cf-Access-Jwt-Assertion. See deploy/README.md"
elif [[ "$BODY" == "The access assertion did not verify" ]]; then
  bad "the assertion arrived and did not verify" \
    "ACCESS_TEAM_DOMAIN or ACCESS_AUD names a different Access application"
elif [[ "$STATUS" != 2* ]]; then
  bad "the proxy carried the bootstrap upstream and the upstream answered $STATUS" \
    "The upstream admits a request on the Referer the proxy sets from UPSTREAM_ORIGIN; check it names the right origin"
elif grep -qi '^x-upstream-set-cookie:' "$WORK/head"; then
  ok "the assertion verifies and the bootstrap round-trips as X-Upstream-Set-Cookie"
else
  bad "the upstream answered $STATUS and opened no session" \
    "The proxy returns the merged session as X-Upstream-Set-Cookie; the upstream set none"
fi

(( ${#FAILURES[@]} )) && report_and_exit

printf '\n%s✓ the deployment is live, gated, configured and proxying%s\n\n' "$GREEN" "$RESET"
