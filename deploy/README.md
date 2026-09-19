# Running your own instance

One Cloudflare Worker is the whole deployment. It serves everything `apps/web` builds as
static assets, and its own script answers `/napi/` requests no asset matches, which is the
stateless proxy described in [ADR 2](../docs/adr/0002-computation-on-the-client.md).
`apps/proxy/wrangler.json` is the entire deployment configuration and declares no storage
of any kind, which a test asserts against the file.

Nothing in this repository is specific to one deployment. There is no application secret to
obtain from anyone, nobody signs in, and the only two values you supply are the credentials
that let GitHub deploy on your behalf. A fork with neither set builds and tests exactly as
this one does.

- `setup.sh` walks the dashboards and writes each captured value where it belongs.
- `verify.sh` reads back what took effect, over HTTP and through the GitHub API, and never
  reads or prints a secret value.

```sh
cd deploy
./setup.sh
./verify.sh
```

## What you need

A **Cloudflare account** on the free plan. Workers gives 100,000 script requests a day,
10 ms of CPU per invocation and 50 subrequests per invocation; requests to static assets
are free and unlimited and do not count against the daily figure. A search issues about
one proxy request per candidate screening, which measured about 48, so the daily
allowance is roughly two thousand searches. Nothing here reaches a paid feature.

A **GitHub repository** you can set secrets on, which is what deploys on merge.

Nothing else. No identity provider, no Zero Trust tenant, no domain of your own.

## What is secret and what is not

The line is not sensitivity. It is whether the value may appear in a workflow log, because
this repository is public and so are its Actions logs, and GitHub redacts repository
secrets from those logs while doing nothing of the kind for anything else.

| Value | Lives in | Read by |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub repository secret | `.github/workflows/deploy.yml`, through `wrangler` |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub repository secret | the same |

Those two are the whole list. The upstream the proxy forwards to is not on it: it is
`UPSTREAM_ORIGIN` under `vars` in `apps/proxy/wrangler.json`, in the open, because the
captured corpus names it in every ticketing URL and `tools/upstream.mjs` names it outright.
Pointing an instance somewhere else is a one-line edit rather than a secret to set.

## Who the proxy answers

Anyone reading the site. Two guards keep an open proxy from being worth pointing anything
else at, and neither asks a visitor for anything:

- a request is carried only when its `Sec-Fetch-Site` reads `same-origin`, or, from a
  browser too old to send Fetch Metadata, when its `Origin` or `Referer` names your own
  deployment;
- each visitor is allowed 540 proxy requests a minute, which is three of the widest search
  the application makes.

Both are in [ADR 2](../docs/adr/0002-computation-on-the-client.md) with the measurements
and the specifications they rest on. Nothing about either is configured here.

## The order to work in

`setup.sh` is this list, one screen per step.

1. **Create a Cloudflare account** at `dash.cloudflare.com`.
2. **Create an API token and set it as `CLOUDFLARE_API_TOKEN`.** Manage Account > API
   Tokens > Create Token > Create Custom Token. One permission: Account > Workers Scripts
   > Edit, scoped to this account alone. The token is shown once. Nothing else is needed
   because the workflow sets `CLOUDFLARE_ACCOUNT_ID`, which is what would otherwise make
   `wrangler` look the account up and need permission to read your memberships.
3. **Copy the account ID and set it as `CLOUDFLARE_ACCOUNT_ID`.** Workers & Pages >
   Account Details > Account ID, or press Ctrl/Cmd-K anywhere in the dashboard and run
   "Copy account ID".
4. **Release once.** The workflow deploys when a merge to `main` changes the `version` in
   the root `package.json`, and at no other time; if nothing has been released yet,
   `setup.sh` offers to run `wrangler deploy` from this machine once. The Worker appears
   at `https://<name>.<your-subdomain>.workers.dev`, the name coming from `name` in
   `apps/proxy/wrangler.json`. It works the moment it is up: there is nothing left to set.

## What `verify.sh` proves, and what it cannot

It needs no Cloudflare token. Point it at the deployment with `SEATSCOUT_URL`, which
`setup.sh` writes to `deploy/.env`.

It proves:

- both repository secrets are set, by name only, because GitHub cannot return a value;
- the most recent deploy of `main` succeeded;
- the page itself loads;
- the area read the adapter performs is carried through the deployed proxy and the upstream
  answers it, when it is sent the way the application's own page sends it. It issues the
  request `packages/core` issues, reading the route and the theatre count out of the
  adapter rather than restating them, and refuses to run if that request has changed shape;
- the same read is refused when it arrives cross-site, so the guard is live rather than
  merely deployed.

  The proxied read settles two things at once and reports which of them failed rather than
  only that something did. Whether the Worker holds the upstream it forwards to. And
  whether the `Referer` the proxy sets from `UPSTREAM_ORIGIN` is what the upstream admits,
  which is why a non-2xx answer is a failure here: the upstream refuses a missing `Referer`
  with a message that blames a session instead.

It cannot prove the rate limit. Reaching it means issuing 541 requests in a minute against
your own quota to watch one be refused, which costs more than it establishes; the limit is
asserted against `apps/proxy/wrangler.json` by a unit test instead.

## Sources

Read on 2026-09-19.

- Static assets, routing and the assets configuration keys:
  `developers.cloudflare.com/workers/static-assets/`, `.../routing/worker-script/`,
  `.../binding/`, and `.../workers/wrangler/configuration/`. A request matching a file in
  the assets directory is served without invoking the Worker; anything else reaches the
  Worker.
- Static asset requests being free and outside the request quota:
  `developers.cloudflare.com/workers/static-assets/billing-and-limitations/` and
  `.../workers/platform/pricing/`.
- Free plan limits: `developers.cloudflare.com/workers/platform/limits/`.
- The rate limiting binding, its configuration shape, its 10 or 60 second period and its
  locality: `developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/`. It left
  beta on 2025-09-19: `developers.cloudflare.com/changelog/post/2025-09-19-ratelimit-workers-ga/`.
  The documentation states no plan restriction on it and it needs no dashboard step; this
  deployment runs it on the free plan.
- `Sec-Fetch-Site`, its values and its `Sec-` prefix being a forbidden request header name:
  `w3.org/TR/fetch-metadata/` and
  `developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site`, which is
  also where the browser versions above come from.
- Allowing requests that send no Fetch Metadata, which this proxy deliberately does not do:
  `web.dev/articles/fetch-metadata`.
- The environment variables `wrangler` reads:
  `developers.cloudflare.com/workers/wrangler/system-environment-variables/`.
