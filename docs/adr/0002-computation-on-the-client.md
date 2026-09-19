# 2. Computation happens on the client; the server is a stateless proxy

Date: 2026-08-22

## Status

Accepted

## Context

Two requirements shape where work happens.

No user data may be stored on any server. Preferences, history, and eventually payment
details belong on the user's own device.

The deployment should fit comfortably inside free hosting tiers, and should not acquire a
running cost that grows with use.

The natural design pulls the other way. A server that fetches, parses, scores, and caches
seat maps is conventional, and it is what most of this kind of application does.

Three platform facts made the conventional design the wrong one.

Browsers cannot call the upstream source directly, because it sends no permissive
cross origin headers. A server side proxy is therefore unavoidable for the web client.

Native runtimes are not subject to that restriction and can call the source directly. A
server is therefore unnecessary for native clients.

On the target platform, CPU time excludes time spent waiting on network requests. A
proxy that forwards bytes without parsing them consumes roughly one millisecond against a
ten millisecond ceiling. The ceiling only becomes a constraint if the server parses and
scores the payloads it is forwarding.

That figure was measured rather than estimated, on the build that still verified a sign-in
assertion. The proxy was bundled and served by the platform runtime directly, with no
development harness around it and local stand-ins for the signing certificates and the
upstream, and its isolate sampled by the JavaScript engine's own CPU profiler over the
debugging protocol at a one millisecond interval. It spent 0.98 to 1.09 milliseconds of CPU
per invocation over four runs of 3,000 requests each; the same worker refusing a request,
which called nothing, spent 0.31 to 0.55. Payload size did not enter it, because the body is
never read. Measuring through the development server instead read roughly five milliseconds,
of which nearly three was the harness answering a request the worker refused immediately.

Those figures are historical and have not been taken again. What they establish is the shape
of the argument rather than a reading of the code that ships: on a proxy that forwards bytes
without parsing them, the work is the round trip, and the isolate's own share of a ten
millisecond budget is about one.

## Decision

The server forwards the request upstream, and streams the response back without parsing it.
It holds no database, no cache, and no user state, and it asks nobody to sign in.

It supplies one header of its own, which measurement established after this decision was
accepted. The upstream admits a request on its `Referer` and refuses one without it, whatever
session it carries, and `Referer` is a forbidden request-header name that page script cannot
set. The proxy therefore names the upstream as the referer itself.

Only `accept`, `content-type` and `user-agent` cross to the upstream. The caller's own
cookies and the platform's `cf-` headers belong to this hop and stay here, and synthesising
the referer rather than passing the caller's through is what keeps the forwarding list an
allowlist. An upstream redirect is handed back rather than followed, because one call to the
proxy is one upstream request. An upstream `Set-Cookie` is stripped from the answer rather
than planted on the caller's own origin. Nothing is set by hand: `UPSTREAM_ORIGIN` is a
variable in `apps/proxy/wrangler.json`, so a clone of this repository deploys and works,
and pointing an instance somewhere else is one line to edit.

**Nobody signs in.** An earlier version of this decision put Cloudflare Access in front of
the Worker and had the proxy verify the signed assertion Access attaches. No requirement
ever asked for a login. What it bought was a deployment that could not stand up without a
Zero Trust tenant and three hand-set secrets, and that, with none of them set, refused every
request it was asked. The proxy is open. Two guards bound what an open proxy is worth to
anybody else, and both are quiet: a request the application itself issues meets neither.

The first is
[Fetch Metadata](https://www.w3.org/TR/fetch-metadata/). A request is carried only when its
`Sec-Fetch-Site` reads `same-origin`. The browser sets that header and page script cannot,
because the `Sec-` prefix makes it a forbidden request header, and the application's own
reads are same-origin by construction, since `packages/core` asks for `/napi/…` relative to
the page it runs on. The header is absent from a browser older than
[Chrome 76, Firefox 90 or Safari 16.4](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site),
and from a client that is not a browser at all. Where it is absent, the request is carried
only if its `Origin` or `Referer` names this deployment's own origin. That fallback is
deliberately stricter than
[the published guidance](https://web.dev/articles/fetch-metadata), which suggests admitting
a request that sends no Fetch Metadata at all; admitting it would leave every command-line
client through the guard it exists for.

The second is a rate limit on each visitor, declared as a
[`ratelimits` binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
and keyed on `CF-Connecting-IP`. Its size comes from what a search costs rather than from a
round number. A live search reads one listing and 48 seat maps, timed in
[ADR 16](0016-a-search-reports-its-coverage.md); the corpus search `tests/e2e/query.spec.ts`
runs checks 170 candidates besides its listings. One search is therefore 50 to 180 proxy
requests, arriving together. The measurement fixes the unit; how many units to allow is a
judgement, and the judgement is three, so that someone who searches, changes a term and
searches again is never the one refused. Three of the wider kind in a minute is 540, which
is the limit. The period is 60 seconds because the binding takes 10 or 60 and nothing else.

The key is the visitor's address, which the same documentation lists as the thing it does
not recommend keying on, because an address is shared: a mobile network or an office puts
many people behind one. Without a login there is no other per-visitor signal, and a login is
what this decision has just removed. Allowing three searches rather than one is what keeps a
shared address workable, and the limit counts within one Cloudflare location rather than
across all of them, which the documentation also says plainly, so it is a bound on a share
and not an accounting of one.

Neither guard is a permission system and neither is offered as one. They are what makes a
proxy bound to one upstream, and to the `/napi/` paths of it that `packages/core` reads, not
worth pointing anything else at; a request for any other path is answered 404 rather than
forwarded, so what the deployment relays is that upstream's reads and not its site. The
risks an open proxy carries here are the request quota and the upstream tiring of the
traffic, and these two are sized against both.

One Worker is the whole deployment: `apps/proxy/wrangler.json` declares an asset directory
that is everything `apps/web` builds, and a script that is the proxy. A request matching a
built file is served by the platform without invoking the Worker at all, and every other
request reaches the proxy. That is the platform's default routing and it is why the
configuration is a short list of settings rather than a routing table. `assets` declares a
directory and
nothing else: naming a binding would hand the Worker a reader for what it publishes, and
putting the Worker in front of every asset is what a Worker that needed to transform assets
would do. Both are one reviewed line away if a reason arrives.

Everything else happens on the device: parsing, seat normalisation, scoring, filtering,
ranking, and caching.

Fan out width comes from issuing several proxy requests concurrently rather than from
concurrency inside one. One proxy request carries one upstream request: batching several
into a single invocation was considered and rejected, because the per invocation
subrequest cap that would motivate it does not bind when each invocation makes one
request, and the resulting invocation volume sits far inside the free tier. Batching would
have required a streaming response protocol, chunk arithmetic and response demultiplexing
to buy headroom that is not needed.

Any code that fans out consumes each response body as its headers arrive. Collecting
response objects and reading their bodies afterwards holds connections open and can stall,
which is a documented failure mode on this platform.

No session is carried at all. An earlier version of this decision had the client bootstrap
one through the proxy and hold the cookies on device, which on the web obliged the proxy to
translate them to and from custom headers because the Fetch specification forbids page
script from reading `Set-Cookie` or setting `Cookie`. Measurement retired the whole
mechanism: reads from an address that has never bootstrapped succeed, so the cookies gated
nothing and the translation had nothing to translate.

It lives there now. For a time it did not: three files under `packages/core` named the
proxy's own header constants, the single Source implementation among them, so the shared
core spoke the web proxy's private vocabulary and a native runtime that needed none of it
would have had to impersonate the proxy to read anything. The measurement that retired the
session took those constants with it, because they existed only to carry a session cookie
across the proxy. No file under `packages/core` names them.

## Consequences

The requirement that no user data is stored on a server is structural rather than a
policy that must be enforced. There is nowhere for such data to go.

Free tier hosting is sufficient rather than a compromise, and static asset requests do
not consume the request quota. Both guards therefore sit on proxy requests and on nothing
else, which is where the quota is spent. What `apps/web` builds is served to anyone who
asks, and that is this repository's own compiled source, with no user data in it and no
reach upstream. `/` is served from `index.html` by that same default routing, which is what
closed it as a path into the proxy.

A second instance stands up from this repository alone, and two checks hold that rather than
a promise. The `quality` job runs `wrangler deploy --dry-run`, which needs no credentials, no
account and no network: it bundles the Worker, reads the asset directory and reports the
bindings, so a configuration that no longer produces a deployable Worker fails a pull request
rather than a deploy. Beside it, a test asserts the configuration's whole key set, the asset
block's own, the upstream it names and the rate limit it declares, against the file rather
than against intent, so a deployment's settings cannot drift into a dashboard where nothing
reads them back. Neither substitutes for a real deploy against a real account, and neither
claims to.

The adapter carries no session and opens nothing before reading, so a read is one request,
and a rejection is treated as a refusal like any other rather than as a session to re-open.

Native clients need no backend at all. Search, seat maps, and booking hand off work with
no server involved, which removes an entire class of availability failure for them.

The client is heavy. Seat map parsing and scoring for a wide search is real work on a
phone, and it has to be scheduled so it does not block interaction.

Carrying no session costs nothing, because the session bought nothing that was ever
measured. It was claimed first for regional results, which the search area already carries
as a query parameter, and then as the recovery available when a request is refused, which
it never was: the upstream admits a request on the `Referer` the proxy sets and its refusal
blames a session only to mislead. Removing it also removes the failure it created, where a
bootstrap that did not answer stopped every read behind it.

Any capability that must run while the device is asleep falls outside this design and
requires a separate, explicitly stateful component.
