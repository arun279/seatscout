# 2. Computation happens on the device, and there is no server

Date: 2026-08-22

## Status

Accepted. Amended 2026-10-03: the web client and the proxy that served it were deleted, so this
decision no longer has a server half.

## Context

Two requirements shape where work happens.

No user data may be stored on any server. Preferences, history, and eventually payment
details belong on the user's own device.

Running the product should not acquire a cost that grows with use.

The natural design pulls the other way. A server that fetches, parses, scores, and caches
seat maps is conventional, and it is what most of this kind of application does.

Two platform facts made the conventional design the wrong one.

A browser cannot call the upstream source directly, because it sends no permissive cross
origin headers, so a web client needs a server side proxy. This project had both, a web
client and a proxy in front of it, and deleted both when the product became the native app
alone.

A native runtime is not subject to that restriction and can call the source directly. A
server is therefore unnecessary.

## Decision

There is no server. The app reads the Source from the device: `apps/native/src/host/source.ts`
names the upstream origin and the headers every read carries, and hands that fetch to the
client.

It supplies one header that measurement made necessary. The upstream admits a request on its
`Referer` and refuses one without it, whatever session it carries, so every read names the
upstream as its referer.

Everything else happens on the device: parsing, seat normalisation, scoring, filtering,
ranking, and caching.

Fan out width comes from issuing several requests concurrently. One request carries one
upstream read, and nothing batches several into one.

Any code that fans out consumes each response body as its headers arrive. Collecting
response objects and reading their bodies afterwards holds connections open and can stall:
[undici](https://github.com/nodejs/undici), the `fetch` the live checks run on, documents that
leaving a body unread can lead to "stalls or deadlocks when running out of connections".

No session is carried at all. An earlier version of this decision had the client bootstrap
one and hold the cookies on device. Measurement retired the mechanism: reads from an address
that has never bootstrapped succeed, so the cookies gated nothing.

## Consequences

The requirement that no user data is stored on a server is structural rather than a
policy that must be enforced. There is nowhere for such data to go.

There is nothing to host, so nothing costs more as use grows.

The adapter carries no session and opens nothing before reading, so a read is one request,
and a rejection is treated as a refusal like any other rather than as a session to re-open.

Search, seat maps, and booking hand off work with no server involved, which removes an
entire class of availability failure.

The client is heavy. Seat map parsing and scoring for a wide search is real work on a
phone, and it has to be scheduled so it does not block interaction.

Carrying no session costs nothing, because the session bought nothing that was ever
measured. It was claimed first for regional results, which the search area already carries
as a query parameter, and then as the recovery available when a request is refused, which
it never was: the upstream admits a request on the `Referer` every read sets and its refusal
blames a session only to mislead. Removing it also removes the failure it created, where a
bootstrap that did not answer stopped every read behind it.

Any capability that must run while the device is asleep falls outside this design and
requires a separate, explicitly stateful component.
