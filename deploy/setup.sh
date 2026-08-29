#!/usr/bin/env bash

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$HERE/.." && pwd)"
ENV_FILE="$HERE/.env"
STAGES=10
STAGE=0

cd "$REPO_DIR"

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""
fi

say()  { printf '  %s\n' "$1"; }
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }
ok()    { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }

stage() {
  [[ -t 1 ]] && { tput clear 2>/dev/null || printf '\033[2J\033[3J\033[H'; }
  STAGE=$((STAGE + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n\n' "$BOLD" "$BLUE" "$STAGE" "$STAGES" "$1" "$RESET"
}

open_url() {
  printf '  %s↗%s %s\n' "$GREEN" "$RESET" "$1"
  { if command -v open >/dev/null 2>&1; then open "$1"
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1"
    elif command -v wslview >/dev/null 2>&1; then wslview "$1"
    fi
  } >/dev/null 2>&1 || true
}

pause() { printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"; read -r _ || true; }

confirm() {
  local reply=""
  printf '  %s? %s [y/N] %s' "$YELLOW" "$1" "$RESET"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

remembered() {
  [[ -f "$ENV_FILE" ]] || return 0
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n1
}

remember() {
  ( umask 077 && touch "$ENV_FILE" )
  local kept
  kept="$(grep -vE "^${1}=" "$ENV_FILE" || true)"
  printf '%s\n%s=%s\n' "$kept" "$1" "$2" | sed '/^$/d' > "$ENV_FILE"
}

ask() {
  local key="$1" prompt="$2" pattern="$3" current input
  current="$(remembered "$key" || true)"
  while true; do
    if [[ -n "$current" ]]; then
      printf '  %s%s%s %s[Enter keeps %s]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$current" "$RESET"
    else
      printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
    fi
    read -r input || true
    [[ -z "$input" && -n "$current" ]] && input="$current"
    [[ "$input" =~ $pattern ]] && break
    warn "That does not look right. Expected $pattern"
  done
  printf -v "$key" '%s' "$input"
}

ask_secret() {
  local key="$1" prompt="$2" input current="${!1:-}"
  while true; do
    if [[ -n "$current" ]]; then
      printf '  %s%s%s %s[Enter keeps the one already in this shell]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
    else
      printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
    fi
    read -rs input || true
    printf '\n'
    [[ -z "$input" && -n "$current" ]] && input="$current"
    [[ -n "$input" ]] && break
    warn "That was empty."
  done
  printf -v "$key" '%s' "$input"
}

worker_secret() {
  printf '%s' "$2" | (cd apps/proxy && pnpm exec wrangler secret put "$1" >/dev/null)
  ok "$1 is set on the worker"
}

command -v node >/dev/null 2>&1 || { printf 'Install Node.js first.\n'; exit 1; }
command -v gh >/dev/null 2>&1 || { printf 'Install the GitHub CLI first: https://cli.github.com\n'; exit 1; }
gh auth status >/dev/null 2>&1 || { printf 'Run gh auth login first.\n'; exit 1; }
(cd apps/proxy && pnpm exec wrangler --version >/dev/null 2>&1) ||
  { printf 'Run pnpm install first: the last stage sets the worker secrets with wrangler.\n'; exit 1; }

WORKER="$(node -p 'require("./apps/proxy/wrangler.json").name')"

[[ -t 1 ]] && { tput clear 2>/dev/null || printf '\033[2J\033[3J\033[H'; }
printf '\n%s%s  Deploy seatscout to your own Cloudflare account%s\n' "$BOLD" "$BLUE" "$RESET"
printf '%s  %s stages. You drive the browser; this captures what you copy back.%s\n' "$DIM" "$STAGES" "$RESET"
printf '%s  Stop with Ctrl-C and re-run later; public values are remembered.%s\n\n' "$DIM" "$RESET"
note "Reasoning, sources and what cannot be automated are in deploy/README.md."
pause "Ready?"

stage "Cloudflare account"
open_url "https://dash.cloudflare.com/sign-up"
step "Sign up, or sign in if you already have an account. The free plan is enough."
pause

stage "Zero Trust team name"
open_url "https://one.dash.cloudflare.com/"
step "Open Zero Trust. If this is a new account it asks you to choose a team name."
step "The free plan covers 50 users. It asks for a payment method and does not charge it."
step "An existing organisation shows its team name at Settings."
say ""
ask TEAM_NAME "Team name:" '^[a-z0-9][a-z0-9-]*$'
ACCESS_TEAM_DOMAIN="https://$TEAM_NAME.cloudflareaccess.com"
remember ACCESS_TEAM_DOMAIN "$ACCESS_TEAM_DOMAIN"
ok "Your team domain is $ACCESS_TEAM_DOMAIN"
warn "Renaming the team later breaks stage 3 and the worker's ACCESS_TEAM_DOMAIN."
pause

stage "Google identity provider"
open_url "https://console.cloud.google.com/apis/credentials"
step "Create a project if you have none, then configure the consent screen with"
step "audience type External, so any Google account can reach the login page."
step "Create an OAuth client of type Web application with:"
say ""
say "    Authorised JavaScript origin   $ACCESS_TEAM_DOMAIN"
say "    Authorised redirect URI        $ACCESS_TEAM_DOMAIN/cdn-cgi/access/callback"
say ""
note "Reaching the login page is not access. The allowlist in stage 7 decides that."
pause
open_url "https://one.dash.cloudflare.com/"
step "Zero Trust > Integrations > Identity providers > Add new > Google."
step "Paste the client ID and secret, save, then use Test."
pause

stage "API token"
open_url "https://dash.cloudflare.com/profile/api-tokens"
step "Create Token > Create Custom Token."
step "One permission: Account > Workers Scripts > Edit. Scope it to this account only."
step "Nothing else is needed: the workflow supplies the account ID itself."
step "The token is shown once, and the last stage needs it again to set the worker"
step "secrets. Re-running later means exporting CLOUDFLARE_API_TOKEN beforehand."
say ""
ask_secret CLOUDFLARE_API_TOKEN "Paste the token (hidden):"
printf '%s' "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN
ok "CLOUDFLARE_API_TOKEN is a repository secret"

stage "Account ID"
open_url "https://dash.cloudflare.com/?to=/:account/workers-and-pages"
step "Workers & Pages > Account Details > Account ID."
step "Or press Ctrl/Cmd-K anywhere in the dashboard and run 'Copy account ID'."
say ""
ask CLOUDFLARE_ACCOUNT_ID "Account ID:" '^[0-9a-f]{32}$'
printf '%s' "$CLOUDFLARE_ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID
remember CLOUDFLARE_ACCOUNT_ID "$CLOUDFLARE_ACCOUNT_ID"
ok "CLOUDFLARE_ACCOUNT_ID is a repository secret"
pause

stage "First deploy"
step "The worker has to exist before Access can be put in front of it."
step "From here on every merge to main deploys; this run is the first one."
say ""
if confirm "Dispatch the Deploy workflow now?"; then
  gh workflow run deploy.yml --ref main
  note "Watch it with: gh run watch"
  pause "Press Enter once it has finished"
fi
open_url "https://dash.cloudflare.com/?to=/:account/workers-and-pages"
step "Open the $WORKER worker. Its workers.dev URL is on the page."
say ""
ask SEATSCOUT_URL "Deployment URL:" "^https://$WORKER\.[a-z0-9-]+\.workers\.dev$"
remember SEATSCOUT_URL "$SEATSCOUT_URL"
warn "Until the next stage what apps/web builds is public at that URL. The proxy is not:"
warn "it refuses every request carrying no access assertion."
pause

stage "Access and the email allowlist"
step "On the same worker, open the Access tab."
step "Protect this Worker behind Access > All traffic. This covers the workers.dev"
step "hostname, any route and any preview, and needs no domain of your own."
pause
open_url "https://one.dash.cloudflare.com/"
step "The policy offered there is coarse, so refine it now:"
step "Zero Trust > Access controls > Applications > this application > its policy."
step "Action Allow, rule type Include, selector Emails, then the addresses you allow."
step "Access is deny by default, so nobody else gets in."
pause

stage "Application audience"
step "Same application > Additional settings > Application Audience (AUD) Tag."
say ""
ask ACCESS_AUD "AUD tag:" '^[0-9a-f]{64}$'
remember ACCESS_AUD "$ACCESS_AUD"

stage "Worker configuration"
step "These three are what the worker reads. They live on the worker rather than in"
step "GitHub, so this deployment's own configuration stays yours rather than the"
step "  repository's."
say ""
ask UPSTREAM_ORIGIN "Upstream origin the proxy forwards to:" '^https://[a-z0-9.-]+$'
say ""
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
worker_secret ACCESS_TEAM_DOMAIN "$ACCESS_TEAM_DOMAIN"
worker_secret ACCESS_AUD "$ACCESS_AUD"
worker_secret UPSTREAM_ORIGIN "$UPSTREAM_ORIGIN"
pause

stage "Service token"
step "Optional, and it is what lets verify.sh check anything past the gate."
step "Zero Trust > Access controls > Service credentials > Service Tokens > Create."
step "Then add a second policy on the application: action Service Auth, rule type"
step "Include, selector Service Token, naming the token you just made."
step "The client secret is shown once. This script never sees it: paste both values"
step "straight into the shell you verify from, so neither is stored anywhere."
say ""
say "    export SEATSCOUT_ACCESS_CLIENT_ID=..."
say "    export SEATSCOUT_ACCESS_CLIENT_SECRET=..."
say ""
ok "Setup is done. Check it with ./verify.sh"
say ""
