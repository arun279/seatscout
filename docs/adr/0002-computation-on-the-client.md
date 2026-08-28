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

## Decision

The server verifies the caller's access token, forwards the request upstream with the
caller's own session cookies, and streams the response back without parsing it. It holds
no database, no cache, and no user state.

Everything else happens on the device: parsing, seat normalisation, scoring, filtering,
ranking, and caching.

Fan out width comes from issuing several proxy requests concurrently rather than from
concurrency inside one. Chunk size is bounded by the platform's per invocation subrequest
cap, which is the binding constraint on the free tier. Storage and cache operations also
count against that cap, which is a further reason the proxy performs none.

Each invocation streams newline delimited JSON back as results arrive, so a chunk yields
its first result without waiting for its last. Server sent events was rejected: its
browser primitive cannot set the custom request headers these calls require, and its
reconnection and resume semantics are worthless for a short lived search that is cheaper
to re run than to resume.

Any code that fans out consumes each response body as its headers arrive. Collecting
response objects and reading their bodies afterwards holds connections open and can
stall, which is a documented failure mode on this platform.

The upstream session belongs to the client. It performs the session bootstrap once
through the proxy, stores the resulting cookies on device, and sends them with subsequent
requests. The proxy forwards `Set-Cookie` back untouched.

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
