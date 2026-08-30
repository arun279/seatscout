# Running your own instance

One Cloudflare Worker is the whole deployment. It serves everything `apps/web` builds as
static assets, and its own script answers every request no asset matches, which is the
stateless proxy described in [ADR 2](../docs/adr/0002-computation-on-the-client.md).
`apps/proxy/wrangler.json` is the entire deployment configuration and declares no storage
of any kind, which a test asserts against the file.

Nothing in this repository is specific to one deployment. There is no application secret
to obtain from anyone: every value below is one you create in your own accounts, and a
fork with none of them set builds and tests exactly as this one does.

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

**Cloudflare Zero Trust**, also free, up to 50 users. Sign-up asks for a payment method on
the free plan and does not charge it.

A **Google Cloud project**, only to hold an OAuth client. There is no charge and no API to
enable. Cloudflare's Google integration works with ordinary Google accounts and does not
need Google Workspace.

A **GitHub repository** you can set secrets on, which is what deploys on merge.

## What is secret and what is not

The line is not sensitivity. It is whether the value may appear in a workflow log, because
this repository is public and so are its Actions logs, and GitHub redacts repository
secrets from those logs while doing nothing of the kind for anything else.

| Value | Lives in | Read by |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | GitHub repository secret | `.github/workflows/deploy.yml`, through `wrangler` |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub repository secret | the same |
| `ACCESS_TEAM_DOMAIN` | Worker secret | `apps/proxy`, to fetch the signing keys and pin the issuer |
| `ACCESS_AUD` | Worker secret | `apps/proxy`, to pin the audience |
| `UPSTREAM_ORIGIN` | Worker secret | `apps/proxy`, as the forwarding target and as the `Referer` it sends |

The three the Worker reads never enter GitHub. They are configuration of one deployment
rather than of one repository, and they survive a deploy untouched, so whoever runs one sets
them once against their own account and a redeploy does not ask again.

The email allowlist is not on this list because it is not configuration. It lives in a
Cloudflare Access policy, which is the whole point of gating there rather than in the
application.

## The order to work in

`setup.sh` is this list, one screen per step.

1. **Create a Cloudflare account** at `dash.cloudflare.com`.
2. **Turn on Zero Trust** and choose a team name. Your team domain is
   `https://<team-name>.cloudflareaccess.com`, and it is later at Zero Trust > Settings.
   Changing the team name afterwards invalidates the OAuth redirect in step 3 and the
   `ACCESS_TEAM_DOMAIN` in step 9.
3. **Add Google as an identity provider.** In the Google Cloud console, configure the
   consent screen with audience type External, then create an OAuth client of type Web
   application with `https://<team-name>.cloudflareaccess.com` as an authorised JavaScript
   origin and `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback` as an
   authorised redirect URI. Then in Cloudflare, Zero Trust > Integrations > Identity
   providers > Add new > Google, paste the client ID and secret, save, and use **Test**.
   Reaching the login page is not access; the allowlist in step 7 is what decides.
4. **Create an API token and set it as `CLOUDFLARE_API_TOKEN`.** Manage Account > API
   Tokens > Create Token > Create Custom Token. One permission: Account > Workers Scripts
   > Edit, scoped to this account alone. The token is shown once. Nothing else is needed
   because the workflow sets `CLOUDFLARE_ACCOUNT_ID`, which is what would otherwise make
   `wrangler` look the account up and need permission to read your memberships.
5. **Copy the account ID and set it as `CLOUDFLARE_ACCOUNT_ID`.** Workers & Pages >
   Account Details > Account ID, or press Ctrl/Cmd-K anywhere in the dashboard and run
   "Copy account ID".
6. **Deploy once**, so the Worker exists for the next step to point Access at. The
   workflow runs on merge to `main` and on manual dispatch. The Worker appears at
   `https://<name>.<your-subdomain>.workers.dev`, the name coming from `name` in
   `apps/proxy/wrangler.json`.

   Between this step and the next, what `apps/web` builds is public. It is this
   repository's own compiled source and holds nothing about anybody, and it is all that
   is reachable: the proxy refuses every request that carries no access assertion, so it
   fails closed with or without an Access application in front of it.
7. **Put Access in front of the Worker.** Workers & Pages > the Worker > Access >
   **Protect this Worker behind Access** > All traffic. This covers the `workers.dev`
   hostname, any route and any preview in one place, and it needs no domain of your own.
   The policy options offered there are coarse, so edit the policy afterwards at Zero
   Trust > Access controls > Applications: action **Allow**, rule type **Include**,
   selector **Emails**, and your allowlist as the value. Access is deny by default, so
   anyone not matched is refused.
8. **Copy the Application Audience (AUD) tag** from the application's Additional settings.
   It is 64 hexadecimal characters and it changes only if the application is deleted and
   recreated.
9. **Set the three Worker secrets.** `setup.sh` does this with `wrangler secret put`
   using the token from step 4. `UPSTREAM_ORIGIN` is the origin the proxy forwards to. It
   is a Worker secret so that one deployment's target is not the repository's to decide,
   not to keep the origin private: the captured corpus names it in every ticketing URL and
   `tools/upstream.mjs` names it outright.
10. **Create a service token** so a script can prove an admitted identity gets in without
    a browser. Zero Trust > Access controls > Service credentials > Service Tokens >
    Create. Then add a second policy on the application with action **Service Auth** and
    an Include rule naming that token. The client secret is shown once. Service Auth
    policies are evaluated before Allow policies, and a service token request carries the
    same signed assertion a person's request does, with an empty `sub` and the token's
    client ID as `common_name`, so the proxy accepts it exactly as it accepts a person.

    This step is optional. Without it `verify.sh` can still prove Access is in front of
    the deployment; it cannot prove anything about what happens after Access admits a
    request.

## What `verify.sh` proves, and what it cannot

It needs no Cloudflare token. Point it at the deployment with `SEATSCOUT_URL`, which
`setup.sh` writes to `deploy/.env`, and optionally give it a service token through
`SEATSCOUT_ACCESS_CLIENT_ID` and `SEATSCOUT_ACCESS_CLIENT_SECRET`.

It proves:

- both repository secrets are set, by name only, because GitHub cannot return a value;
- the most recent deploy of `main` succeeded;
- an anonymous request is redirected to your team domain, so Access is in front;
- with the service token, the same request is admitted rather than sent to sign in;
- with the service token, the session bootstrap the adapter performs is carried through
  the deployed proxy, the upstream answers it, and the session comes back in
  `X-Upstream-Set-Cookie`. It issues the request `packages/core` issues, reading the route
  and the content type out of the adapter rather than restating them, and refuses to run
  if that request has changed shape.

  That one check settles five things at once, and reports which of them failed rather than
  only that something did. Whether the Worker holds its three secrets. Whether the
  assertion Access attaches actually reaches the Worker, which is worth naming because
  Cloudflare documents that a Worker serving static assets runs behind an internal router
  Worker and documents that the router does not pass the `ctx.access` object through it,
  while nothing states either way whether the `Cf-Access-Jwt-Assertion` **header**
  survives that hop. Whether the assertion verifies against the team domain and audience
  you configured. Whether the `Referer` the proxy sets from `UPSTREAM_ORIGIN` is what the
  upstream admits, which is why a non-2xx answer is a failure here: the upstream refuses a
  missing `Referer` with a message that blames the session instead. And whether the proxy
  hands the merged session back as `X-Upstream-Set-Cookie`, which is the last of the five
  this check can report and the only one that can arrive on a 2xx.

It cannot prove that a non-allowlisted account is refused. Reaching the refusal means
completing a Google login as somebody who is not on the list, which needs a browser and a
second Google account. Access is deny by default and the anonymous redirect establishes
that the gate is there; the allowlist itself is a manual check.

It also cannot prove that the session persists on the device. That is the client's job and
the client has no shell yet.

## Sources

Read on 2026-08-28.

- Static assets, routing and the assets configuration keys:
  `developers.cloudflare.com/workers/static-assets/`, `.../routing/worker-script/`,
  `.../binding/`, and `.../workers/wrangler/configuration/`. A request matching a file in
  the assets directory is served without invoking the Worker; anything else reaches the
  Worker.
- Static asset requests being free and outside the request quota:
  `developers.cloudflare.com/workers/static-assets/billing-and-limitations/` and
  `.../workers/platform/pricing/`.
- Free plan limits: `developers.cloudflare.com/workers/platform/limits/`.
- Protecting a Worker with Access, including the `workers.dev` hostname:
  `developers.cloudflare.com/workers/configuration/cloudflare-access/` and
  `developers.cloudflare.com/changelog/post/2026-08-14-workers-access/`, which is where
  attaching the policy to the Worker rather than to each hostname was introduced.
- Google as an identity provider, and the redirect URI:
  `developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google/`.
- Policies, the Emails selector, deny by default and Service Auth ordering:
  `developers.cloudflare.com/cloudflare-one/access-controls/policies/`.
- Service tokens and the assertion a service token request carries:
  `developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/`
  and `.../applications/http-apps/authorization-cookie/application-token/`.
- Verifying the assertion, and why the header rather than the cookie:
  `.../applications/http-apps/authorization-cookie/validating-json/`.
- Zero Trust free plan and its 50 user limit:
  `cloudflare.com/plans/zero-trust-services/`.
- The environment variables `wrangler` reads:
  `developers.cloudflare.com/workers/wrangler/system-environment-variables/`.
