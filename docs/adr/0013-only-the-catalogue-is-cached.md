# 13. Only the catalogue is cached, and Availability never is

Date: 2026-09-05

## Status

Accepted. Amended 2026-10-03: the web application was deleted, and with it the service worker,
its Cache Storage and the browser storage adapter this record used to govern.

## Context

A search reads one listing and then a seat map for every candidate it holds. The listing is
slow to fetch and changes over hours. A seat map changes minute to minute, and a Seat shown
as free on the strength of a reading held over is a lie with a plausible face: the person is
sent to a checkout that refuses them.

An application like this has two places a copy can hide. The on-device store the catalogue
phase writes. And the HTTP cache beneath `fetch`, which is decided by response headers this
repository does not send.

Both are easy to reach for by accident, and neither announces itself.

## Decision

Two things in the workspace have a lifetime, the catalogue and the programme, each for two
hours. Everything else that touches Availability is read again.

**The catalogue is cached for two hours.** Two hours is the conservative end of "hours": one
listing request costs 375 ms measured against the live aggregator and is dwarfed by the
seat-map fan-out that follows it, while a listing held too long is a screening that was added
after it was written and is never offered. `cacheForMs` overrides it, and a value of zero
reads the Source every time. There is no staleness threshold and adding one would be wrong:
re-verification before a booking hand-off is unconditional, so a stale catalogue cannot reach
one. A cache hit reports the moment the listing was actually fetched and an attempt count of
zero, so the age a result carries is the age it has and a hit is told apart from a read.

**The programme is cached for two hours under a key of its own.** The programme is the
Theaters near an area and the Movies playing at them on a date, which the Ask sheet resolves a
half-remembered title against. It is not part of a catalogue entry and could not ride one: a
catalogue is keyed by Movie, date and area, and the programme is the read that happens before
a Movie is known. It changes on the same scale as a listing, a schedule for a date, so it
takes the same two hours rather than a number of its own. An entry is written only when every
Theater answered, because a programme short a Theater is a shorter list of films and caching
one would hide a partial read for two hours. It holds no Seat and no Showtime, so nothing
about Availability is held over.

A cached catalogue routinely offers Showtimes that have already begun. 80 of the 824
Showtimes in the captured listing were already past at capture, so roughly one candidate in
ten can be expected to have started. That is a Coverage outcome rather than a cache fault,
and the phase carries those Showtimes through with their reason.

**A Seat cannot be written to the store, and that is a type error.** `KeyValueStore` is two
operations. `read` answers `unknown`, because what a device hands back is not to be believed
and the caller has to say what it will accept. `write` takes `Stored`, a closed union of the
shapes this application remembers: a cached catalogue, a cached programme, a Seat Profile, and
a history of recent searches. That union is the deny list, and none of its members holds a
Seat.
`store.write(key, seats)` is a type error, and so is
`store.write(key, JSON.stringify(seats))`, which is the way round that a store of strings
would have left open. Remembering a fifth thing is a line added to `Remembered`, the record the
union is derived from, and the contract below grows a clause with it because the compiler says
so: the contract's samples are a record keyed by `Remembered`'s own keys, so a member with no
sample and no clause does not build. It is the technique
[ADR 8](0008-guarantees-are-made-at-compile-time.md) applies to what may be read, pointed at
what may be written.

**An entry another build wrote is not found, rather than found and tested.** The key carries
the shape it stores, `seatscout.catalogue.v1.[...]`, so the lookup answers the question that
decides: did this build write this. The alternative, a predicate that walks down into a stored
Showtime field by field, is what this replaced. It has to be extended every time a reader
reaches one field further, nothing reminds anyone to extend it, and the version that shipped
checked a Presentation's Amenities while the same narrowing line reads its Formats too, so an
entry carrying the one and not the other passed the check and raised inside the filter. A
version moves once per stored shape; a probe moves once per field a reader touches, by hand.
What moves the version is a test rather than a memory: `catalogue-cache.test.ts` holds
`ENTRY_SHAPE` to the field paths a written entry actually carries, so a `Catalogue` that grows
a field or moves one fails the suite beside the version that has to move with it, and
`programme.test.ts` holds the programme's entry to its own key and field paths the same way. The
remembered Profile and the search history follow the same rule under their own keys, and each
reads its entry back only when every field it needs is the type it needs, answering Reference
or nothing rather than trusting what a device handed over.

What comes back is still checked, because `read` answers `unknown` and something has to make
a value of it: a numeric fetch moment and a catalogue carrying its three arrays. It stops
there. Going deeper would be the adapter's own parse restated against data the adapter wrote,
and the store it came from is the reader's own device rather than a third party's answer.
Anything that fails is a miss and the Source is read again. Nothing is read back as absent
that a store answered with `null`, because absent is `undefined`, and conflating the two would
make a store that lost an entry indistinguishable from one that held a null.

A cache entry is named after the shape it stores and the three terms that identify it, those
encoded as a JSON array so an area holding the separator cannot collide with another entry.
Terms that only narrow the answer are not part of the name, so changing a Format filter
re-reads the cache rather than the Source.

**A phone's storage may refuse, and a refusal is a miss.**
`apps/native/src/host/store.ts` is the adapter over AsyncStorage, which the Expo SDK pins and
Expo Go bundles. A read the storage rejects and a value it no longer holds whole both read as
absent, and a write it refuses is dropped, because a write that did not land is a miss and a
miss costs one request. The port never promised durability, so a search that cannot cache is one
that reads the Source again rather than one that breaks. **There is no fallback to memory.** A
library reached as a module answers every call with a promise, so there is no one moment to
attempt and decide from. A phone whose storage refused every call would therefore remember
nothing rather than remember it until the app closes, which costs a request per miss and nothing
else, and on a phone that case needs the native module to be missing, which is a crash at import
rather than a store to fall back from.

**The store's contract is part of the package's surface, and every adapter runs it.**
`storeContract` ships with `packages/client` rather than with its tests, because an adapter
author is who needs it. Each clause answers with what the store did wrong, or with nothing. One
of them is why the in-memory store serialises rather than holding the object it was given: a
store hands back its own value, so a test double that hands back the caller's object would let
a caller mutate what another caller is about to read, and would pass in Node what fails on a
device. The in-memory store runs the clauses under vitest; the native adapter runs them under
Jest against the storage library's own mock, with the module that really writes to the phone
held by the headed pass a native change already owes. A clause writes one of each shape the union
admits and reads it back, so an adapter that can hold a catalogue and not a Profile fails the
contract rather than a screen.

The contract's own tests are what keep it from being vacuous: each broken store fails exactly
the clause it breaks, the operations and keys it performs are pinned, and its diagnostics are
asserted, because a contract that cannot say what went wrong is a contract nobody can act on.
The values its catalogue clauses write are empty Catalogues, because a Showtime carries
branded identity that only parsing a response can mint, and a contract that forged one would
need the assertion this repository does not contain.

**Every request the adapter makes asks for `no-store`.** What the HTTP stack beneath `fetch`
is entitled to hold for a seat map would otherwise be decided upstream. That was measured on 2026-08-29: the upstream sends no
`Cache-Control`, `Expires` or `Last-Modified` on a seat map, which under
[RFC 9111](https://www.rfc-editor.org/rfc/rfc9111#section-4.2.2) leaves a storable response
with no freshness to calculate, so Chromium revalidates rather than reusing. Adding a
`Last-Modified` upstream would have been enough to change that silently, so the adapter no
longer relies on its absence. That belongs to Core's transport, so every host that runs it
asks the same.

## Consequences

Availability is never held anywhere, so the re-verification
[ADR 4](0004-booking-ends-at-a-deep-link.md) requires has nothing to compete with.
