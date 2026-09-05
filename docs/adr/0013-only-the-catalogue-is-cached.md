# 13. Only the catalogue is cached, and Availability never is

Date: 2026-09-05

## Status

Accepted

## Context

A search reads one listing and then a seat map for every candidate it holds. The listing is
slow to fetch and changes over hours. A seat map changes minute to minute, and a Seat shown
as free on the strength of a reading held over is a lie with a plausible face: the person is
sent to a checkout that refuses them.

An application like this has three places a copy can hide. The on-device store the catalogue
phase writes. The service worker's Cache Storage, which exists so the shell opens offline.
And the browser's own HTTP cache, which is decided by response headers this repository does
not send.

Every one of them is easy to reach for by accident, and none of them announces itself.

## Decision

One thing in the workspace has a lifetime: the catalogue, for two hours. Everything else that
touches Availability is read again.

**The catalogue is cached for two hours.** Two hours is the conservative end of "hours": one
listing request costs 375 ms measured against the live aggregator and is dwarfed by the
seat-map fan-out that follows it, while a listing held too long is a screening that was added
after it was written and is never offered. `cacheForMs` overrides it, and a value of zero
reads the Source every time. There is no staleness threshold and adding one would be wrong:
re-verification before a booking hand-off is unconditional, so a stale catalogue cannot reach
one. A cache hit reports the moment the listing was actually fetched and an attempt count of
zero, so the age a result carries is the age it has and a hit is told apart from a read.

A cached catalogue routinely offers Showtimes that have already begun. 80 of the 824
Showtimes in the captured listing were already past at capture, so roughly one candidate in
ten can be expected to have started. That is a Coverage outcome rather than a cache fault,
and the phase carries those Showtimes through with their reason.

**A Seat cannot be written to the store, and that is a type error.** `KeyValueStore` is two
operations. `read` answers `unknown`, because what a device hands back is not to be believed
and the caller has to say what it will accept. `write` takes `Stored`, a closed union of the
shapes this application remembers: a cached catalogue, a Seat Profile, and a history of recent
searches. That union is the deny list, and none of its members holds a Seat.
`store.write(key, seats)` is a type error, and so is
`store.write(key, JSON.stringify(seats))`, which is the way round that a store of strings
would have left open. Remembering a fourth thing is a line added to that union in a diff, and
the contract below grows a clause with it. It is the technique
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
a field or moves one fails the suite beside the version that has to move with it. The
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

**Web Storage may be absent or refuse outright**, in a private window, with cleared site data,
or with storage disabled by policy. Reaching it is attempted once, and where it refuses the
adapter falls back to memory, which lives as long as the accessor that made it. That is the
honest answer rather than a failure, because the port never promised durability, memory is
still on the device, and a search that cannot cache is one that reads the Source again rather
than one that breaks. A write the storage refuses, which is what an exhausted quota looks
like, is dropped rather than raised, because a write that did not land is a miss and a miss
costs one request. A value that comes back as something other than what was written reads as
absent for the same reason.

**The store's contract is part of the package's surface, and it runs twice.** `storeContract`
ships with `packages/client` rather than with its tests, because an adapter author is who needs
it and the native adapter is who needs it next. Each clause answers with what the store did
wrong, or with nothing. One of them is why the in-memory store serialises rather than holding
the object it was given: a store hands back its own value, so a test double that hands back the
caller's object would let a caller mutate what another caller is about to read, and would pass
in Node what fails in a browser. The in-memory store runs the clauses under vitest; the browser
adapter runs the same clauses in a real browser, from a page that serves the built contract
module and the built web bundle from one origin and renders each clause's verdict, which is
also what makes a headed run readable by a person. A clause writes one of each shape the union
admits and reads it back, so an adapter that can hold a catalogue and not a Profile fails the
contract rather than a screen. A contract that passes only in Node proves
nothing about the adapter that ships, and because the mutation gate runs vitest and not
Playwright, the adapter is judged by unit tests of its own as well.

The contract's own tests are what keep it from being vacuous: each broken store fails exactly
the clause it breaks, the operations and keys it performs are pinned, and its diagnostics are
asserted, because a contract that cannot say what went wrong is a contract nobody can act on.
The values its catalogue clauses write are empty Catalogues, because a Showtime carries
branded identity that only parsing a response can mint, and a contract that forged one would
need the assertion this repository does not contain.

**Every request the adapter makes asks for `no-store`.** The proxy passes an upstream
response's headers through unchanged, so what a browser is entitled to hold for a seat map
would otherwise be decided upstream. That was measured on 2026-08-29: the upstream sends no
`Cache-Control`, `Expires` or `Last-Modified` on a seat map, which under
[RFC 9111](https://www.rfc-editor.org/rfc/rfc9111#section-4.2.2) leaves a storable response
with no freshness to calculate, so Chromium revalidates rather than reusing. Adding a
`Last-Modified` upstream would have been enough to change that silently, so the adapter no
longer relies on its absence. That belongs to Core's transport rather than to the worker,
because a native client has no worker.

**The service worker caches the shell and can cache nothing else, structurally.**
`apps/web/src/worker/cache.ts` exports one writer, `precacheShell`, which takes no argument:
what it caches is that module's own constant list of the files the build publishes, so no
caller can choose, and nothing outside that list can be written. The worker's request path
reaches Cache Storage only through `cachedShell`, which reads, and it reads through
`CacheStorage.match` rather than through the cache's own, so no writable handle exists outside
the writer. Nothing the fetch handler sees can therefore be cached, and a request outside the
shell is not answered by the worker at all: it never calls `respondWith`, so the response
never enters the worker.

A shell request is one the worker can answer correctly and nothing else: same origin, a `GET`,
and a path on the list. Everything else is left to the network untouched, because a path alone
is not an identity: another origin's `/index.js` is not this one's, and a write is not a read.

A shell request is answered from the network while there is one, and from the cache when the
network fails. Cache-first would pin a device to the shell it first installed, because the
worker only re-caches while it installs and it only installs again when its own script
changes. Network-first costs a request that was going to be made anyway and keeps the device
on the shell the deployment is serving; the copy the cache holds is a fallback for having no
network, which is the only thing asked of it.

The typefaces are on that list, and they are not Availability: a face is a build output with a
deterministic name, which is exactly what the shell cache holds, and a shell that opens
offline in a fallback face would be a different screen from the one the direction drew.

### The reach check

`tools/no-cache-storage-reach/` is the whole of the gate that keeps the writer the only
writer. It takes the staged content of every tracked file under `apps/`, refuses any that
carries the letters `caches`, and refuses a pathspec that matched no tracked file at all. It
runs over that tree in `quality` and again in the pre-commit hook.

**It reads source text rather than an abstract syntax tree, and that is the point.** A member
pattern sees only the spellings it enumerates, and `self?.caches`, a key held in a variable, a
template literal, `Reflect.get(self, "caches")` and a renaming destructure all reach Cache
Storage without being one, and none of them can be written without the letters. It was watched
refusing every reach planted across those surfaces, and staying silent on the ones that have
to pass. On the gates it replaces, seven of twelve spellings walked past in a source file and
eight of twelve in the shipped page.

**It names three files and trusts none of them further than it has to.** `cache.ts` is exempt
because it is the writer. The worker's two test files are allowed the single literal
`vi.stubGlobal("caches",`, which is struck from those two files alone before the letters are
looked for, because that is how they hand the module under test a fake and the runner's API
takes the global's name as a string. Everything else in them is refused: a test writing
`self.caches.open(...)` draws the same error a source file would, and it has to, because a
test file can be exported from and an export reaching the web application's entry reaches its
built output. Both weaker shapes of this exemption were built and broken first. Exempting
`*.test.ts` wholesale let a reach travel that export route into the built output. Striking the
idiom in every file let any file declare its own `vi` whose `stubGlobal` returns
`Reflect.get(self, name)`, so the call that hides the letters was also the call that made the
reach. Naming the two files closes both.

**The surface is every application rather than one directory.** `public/index.html` carries an
inline module script that ships to every device, and the linter ban on `caches` was scoped to
the web application's `src`, so a bare `caches.open("shell")` in the page was refused by
nothing. Biome does lint JavaScript inside an HTML `<script>`, which is worth stating because
it is the opposite of what it looks like: the deleted plugin fired there on the member forms,
and only the scoped rule missed. `apps/proxy` is in scope because it is the Worker that serves
seat maps, `caches.default` is the platform idiom for holding a response, and that proxy holds
nothing about anybody. The check names `apps/` and no application inside it, because
`pnpm-workspace.yaml` declares every application as `apps/*` and a gate that lists its subjects
one by one governs the applications that existed when it was written.

**It decodes every escape, because otherwise it does not hold at all.** `caches` is a
lawful identifier that a bundler emits as `caches`, and `self["caches"]` is a lawful key,
so an escape is a two-character edit to any reach. Enumerating the forms one at a time is how
this half was got wrong once already: reading `\uXXXX` and `\u{...}` and nothing else left
`self["\x63aches"]` walking past, and left the two cheapest routes open besides, a line
continuation inside the string and the identity escape `"\c\a\c\h\e\s"`, which needs no digits
at all and which every engine reads as `caches`. So the decoder is general rather than a list:
`\u{...}`, `\uXXXX` and `\xXX` become their code point, a backslash before a line terminator
takes the line terminator with it, and every other backslash is dropped, which is what a string
literal does with one. The one form that escapes that reading is a legacy octal escape, which
is a syntax error in a module, and Biome's own `noOctalEscape` refuses it as an error rather
than as the warning its recommended preset makes it.

**The cost was measured rather than assumed, and it is zero.** Across every tracked file under
`apps/`, one carries the letters once the idiom is struck, and it is the writer. The word does
appear elsewhere in the workspace, which is what decided the surface rather than a wider one:
a client test is named for caching for two hours, and the end-to-end suite reads Cache Storage
back on purpose to assert what the worker holds. Both would be refused by a workspace-wide
check and neither is a reach.

## Consequences

Availability is never held anywhere, so the re-verification
[ADR 4](0004-booking-ends-at-a-deep-link.md) requires has nothing to compete with.

**What the check surrenders and what stays open, stated rather than implied.** The deleted
plugin was a workspace-wide member rule, so `self.caches` under `tools/` or `tests/` is now
refused by nothing; that is a real loss and a small one, since neither ships and the
end-to-end suite reads Cache Storage there on purpose. The check reads the index, so it judges
what is staged rather than what is in the editor, which is right for a commit gate. Three
routes remain open, and they are listed rather than implied because an enumeration that is
short by one is worth less than no enumeration at all. A name assembled at run time, which no
source-text check can see. A reach written inside one of the three files named above, which
would also have to be exported into the build past a bundle ratchet that a test file's imports
would break by two orders of magnitude. And a spelling that is not a JavaScript escape: an
HTML character reference in an event handler attribute, `onload="&#99;aches.open('shell')"`,
which the HTML parser decodes and this check does not, and which Biome does not reach either,
since it lints the contents of a `<script>` and not the value of an `on*` attribute. That one
is closed by the page having no such attribute and no reason to grow one. All three need a
deliberate decoy rather than a slip, all three are plain in review, and they stand on the same
footing as the import ban's own known-open routes.

It costs prose: the check reads file text rather than string literals, so a Markdown file under
`apps/` could not use the word, nor spell it in any of the escaped forms the decoder reads, and
would have to write Cache Storage instead.

`tests/e2e/shell.spec.ts` drives all of it in a real browser against the built output, served
by `wrangler dev` from the Playwright configuration's `webServer`: the worker the deployment
runs, over the asset directory it publishes, so what the suite sees is what a deployment serves
rather than a stand-in for it. A seat map route therefore reaches the proxy, which answers that
it is not configured because no secret is set, and the suite asserts that answer. The suite
watches the worker take control, reads Cache Storage back and asserts it holds the shell and
nothing else, requests a seat map route and a published file the shell does not list and
asserts neither is added, and reloads with the network disabled, still under the worker's
control.
