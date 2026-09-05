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

That figure is now measured rather than estimated. The proxy was bundled and served by the
platform runtime directly, with no development harness around it and local stand-ins for
the access certificates and the upstream, and its isolate sampled by the JavaScript engine's
own CPU profiler over the debugging protocol at a one millisecond interval. It spends 0.98
to 1.09 milliseconds of CPU per invocation over four runs of 3,000 requests each; the same
worker refusing an unauthenticated request, which verifies nothing and calls nothing, spends
0.31 to 0.55. Payload size does not enter it, because the body is never read. Measuring
through the development server instead reads roughly five milliseconds, of which nearly
three is the harness answering a request the worker refuses immediately.

## Decision

The server verifies the caller's access token, forwards the request upstream, and streams
the response back without parsing it. It holds no database, no cache, and no user state.

It supplies one header of its own, which measurement established after this decision was
accepted. The upstream admits a request on its `Referer` and refuses one without it, whatever
session it carries, and `Referer` is a forbidden request-header name that page script cannot
set. The proxy therefore names the upstream as the referer itself.

Only `accept`, `content-type` and `user-agent` cross to the upstream. The caller's own
cookies, the access assertion and the platform's `cf-` headers belong to this hop and stay
here, and synthesising the referer rather than passing the caller's through is what keeps
the forwarding list an allowlist. An upstream redirect is handed back rather than followed,
because one call to the proxy is one upstream request. An upstream `Set-Cookie` is stripped
from the answer rather than planted on the caller's own origin. Three variables configure
the whole of it and none is committed; missing any of them, the proxy serves nothing, so a
half-configured deployment fails closed.

One Worker is the whole deployment: `apps/proxy/wrangler.json` declares an asset directory
that is everything `apps/web` builds, and a script that is the proxy. A request matching a
built file is served by the platform without invoking the Worker at all, and every other
request reaches the proxy. That is the platform's default routing and it is why the
configuration is five keys rather than a routing table. `assets` declares a directory and
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
not consume the request quota. The assertion the proxy verifies is therefore checked on
proxy requests and not on asset requests, which is correct: the access layer is what gates
what `apps/web` builds, and that is this repository's own compiled source, with no user data
in it and no reach upstream. `/` is served from `index.html` by that same default routing,
which is what closed it as a path into the proxy.

A second instance stands up from this repository alone, and two checks hold that rather than
a promise. The `quality` job runs `wrangler deploy --dry-run`, which needs no credentials, no
account and no network: it bundles the Worker, reads the asset directory and reports the
bindings, so a configuration that no longer produces a deployable Worker fails a pull request
rather than a deploy. Beside it, a test asserts the configuration's whole key set and the
asset block's own against the file rather than against intent, which is what keeps a value
belonging to one deployment out of the configuration in the first place. Neither substitutes
for a real deploy against a real account, and neither claims to.

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
