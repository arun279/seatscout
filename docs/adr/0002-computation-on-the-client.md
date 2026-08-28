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

The server verifies the caller's access token, forwards the request upstream with the
caller's own session cookies, and streams the response back without parsing it. It holds
no database, no cache, and no user state.

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

The upstream session belongs to the client. It performs the session bootstrap once
through the proxy, stores the resulting cookies on device, and sends them with subsequent
requests.

On the web this cannot use the cookie headers themselves. The Fetch specification makes
`Set-Cookie` a forbidden response header name that is filtered out of any response exposed
to page scripts, and `Cookie` cannot be set by script. The session therefore travels in
custom headers, and the proxy translates to and from the real headers on the upstream
side. A native runtime has no such restriction, which is one more reason this detail
belongs in an adapter rather than in the core.

## Consequences

The requirement that no user data is stored on a server is structural rather than a
policy that must be enforced. There is nowhere for such data to go.

Free tier hosting is sufficient rather than a compromise, and static asset requests do
not consume the request quota.

Native clients need no backend at all. Search, seat maps, and booking hand off work with
no server involved, which removes an entire class of availability failure for them.

The client is heavy. Seat map parsing and scoring for a wide search is real work on a
phone, and it has to be scheduled so it does not block interaction.

Because each user holds their own upstream session, sessions carry that user's own
location context. This produces more accurate regional results than a single shared
session pinned to wherever the server happened to bootstrap.

Any capability that must run while the device is asleep falls outside this design and
requires a separate, explicitly stateful component.
