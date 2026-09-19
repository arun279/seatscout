#!/usr/bin/env bash

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$HERE/.." && pwd)"
cd "$REPO_DIR"

ENV_FILE="$HERE/.env"
REQUIRED_SECRETS=(CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID)

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  GREEN=$(tput setaf 2); RED=$(tput setaf 1)
else
  BOLD=""; DIM=""; RESET=""; GREEN=""; RED=""
fi

FAILURES=()
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

section() { printf '\n%s%s%s\n' "$BOLD" "$1" "$RESET"; }
ok()      { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
note()    { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
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
  curl -sS --max-time 30 -o "$WORK/body" -w '%{http_code}' "$@" || true
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
AREA_ROUTE="$(sed -n 's#^ *`\(/napi/[A-Za-z]*\)?zipCode=.*#\1#p' "$ADAPTER")"
THEATERS="$(sed -n 's/^const THEATERS_ASKED_FOR = \([0-9]*\);$/\1/p' "$ADAPTER")"
AREA="$(sed -n 's/^const ANCHOR_THEATER_ZIP = "\(.*\)";$/\1/p' tools/live-answers.mjs)"

section "Repository"

if [[ -n "$AREA_ROUTE" && -n "$THEATERS" && -n "$AREA" ]]; then
  ok "the worker is $WORKER and an area reads with GET $AREA_ROUTE"
else
  bad "$ADAPTER no longer reads an area the way this script does" \
    "This script mirrors the adapter's read rather than restating it; that request has changed"
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

PAGE="$(request "$SEATSCOUT_URL/")"
if [[ "$PAGE" == "000" ]]; then
  bad "nothing answers at $SEATSCOUT_URL" "Check the URL, and that a deploy has actually run"
  report_and_exit
fi

if [[ "$PAGE" == "200" ]]; then
  ok "the page loads, with nothing to sign in to"
else
  bad "the page answered $PAGE rather than 200" \
    "Read the last deploy: the worker serves what apps/web builds as static assets"
fi

section "The proxy"

READ="$SEATSCOUT_URL$AREA_ROUTE?zipCode=$AREA&limit=$THEATERS"

CARRIED="$(request -H "Sec-Fetch-Site: same-origin" -H "Origin: $SEATSCOUT_URL" "$READ")"
BODY="$(cat "$WORK/body")"

if [[ "$BODY" == "Not a request from this site" ]]; then
  bad "the proxy refused a request sent the way this site's own page sends one" \
    "Read apps/proxy/src/index.ts: Sec-Fetch-Site: same-origin is what it carries"
elif [[ "$CARRIED" == "429" ]]; then
  bad "the rate limiter refused this read" \
    "Wait a minute and run this again; the limit is per visitor per minute"
elif [[ "$CARRIED" != 2* ]]; then
  bad "the proxy carried the read upstream and the upstream answered $CARRIED" \
    "The upstream admits a request on the Referer the proxy sets from UPSTREAM_ORIGIN in apps/proxy/wrangler.json"
else
  ok "a same-origin read is carried upstream and answered"
fi

REFUSED="$(request -H "Sec-Fetch-Site: cross-site" -H "Origin: https://elsewhere.example" "$READ")"
if [[ "$REFUSED" == "403" ]]; then
  ok "a cross-site read is refused"
else
  bad "a cross-site read answered $REFUSED rather than 403" \
    "The deployed worker is older than the same-origin guard; release again"
fi

(( ${#FAILURES[@]} )) && report_and_exit

printf '\n%s✓ the deployment is live, open to its own pages and proxying%s\n\n' "$GREEN" "$RESET"
