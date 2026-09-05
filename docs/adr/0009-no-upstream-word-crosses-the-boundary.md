# 9. No upstream word crosses the Source boundary

Date: 2026-09-05

## Status

Accepted

## Context

[ADR 1](0001-single-aggregating-source.md) puts every read behind one port, partly so that
upstream vocabulary cannot leak into the domain. That is easy to say and easy to lose. The
aggregator's answers carry status codes, route shapes, chain codes, seat labels, a word for
whether a screening is on sale, and two seat counts, and each of them is a shortcut somebody
will reach for.

Its vocabulary is also open where the domain's is closed. It names premium presentations in
free text, several to a screening; it spells the same accessibility distinction four ways
across chains; it carries seat statuses nobody has classified. A translation that trusted
any of that would put a word whose meaning nobody has established in front of a moviegoer.

## Decision

`packages/core/src/source` is the port and the adapter behind it, and no module above it
names an upstream anything. Four mechanisms hold that rather than describe it, two of them
at compile time.

**The operations are domain questions.** Its three operations are domain questions rather
than upstream routes: theaters near an area, showtimes for a movie on a date in an area, and
seats for a showtime. Discovery asks for 25 theaters, which is the number the corpus capture
asks for. Every value the caller supplies is escaped before it reaches a route, so an area
holding an ampersand cannot rewrite the request.

**The answers are Readings**, which `CONTEXT.md` defines. Only a seat map request is
answered with `noSeatMap`, `started` or `soldOut`, because those are what the aggregator
answers a seat map request with. A 404 on a showtime listing is not a screening that has
begun, and translating it as one would be the leak this boundary exists to stop. A Reading's
payload is the domain object the answer became, and the parsers that produce them live inside
this adapter, so the boundary does not move when one is added.

**The aggregator's own response shapes are declared inside the adapter and exported from
nowhere**, so no module above it can name one even deliberately. Identity is branded, which
is [ADR 8](0008-guarantees-are-made-at-compile-time.md)'s technique applied here.

**The overlap is measured rather than asserted.** One test walks every key name in the
captured responses and every key name the domain emits, and holds their overlap to `id`,
`name`, `formats` and `amenities` exactly; another holds that no value the domain carries is
one of the aggregator's chain codes or its words for whether a screening is on sale, less the
single code the aggregator itself also publishes as that chain's name. Widening either is a
line in a diff.

### The seat map

`seat-map.ts` is both halves of the translation: `UpstreamSeat` describes the answer, `Seat`
describes what the rest of the application sees, and nothing carries an upstream word across.

**Availability fails closed.** A status is bookable only if it is on an explicit
known-bookable list, and every other status, recognised or not, is not bookable. The list has
one entry. Of the four statuses the corpus contains, three are undocumented or unexplained,
and a fifth that earlier notes claimed meant "available" was never once observed, so guessing
at any of them would be presenting a seat as free on the strength of a code nobody has
established the meaning of.

**Neither seat count is read, and neither can be.** Each disagrees with what it counts:
`totalSeatCount` against the length of the `seats` array in twenty seven of the forty two
captured seat maps, `totalAvailableSeatCount` against the Seats that array reports as
available in twelve, which are twelve of the same twenty seven, and six report more available
seats than the whole array holds. The parse narrows the answer to its `seats` array and to
`UpstreamSeat`, neither of which declares a count, so reading one is a compile error rather
than a convention. The test reads the Auditorium whose count field says twenty five and whose
array holds three hundred and four.

**Neighbour links are carried, never believed.** `leftNeighbour` and `rightNeighbour` are
whatever the aggregator sent, with its empty string translated to absence. They are a
cross-check and not adjacency, because the corpus holds regular rooms whose Seats carry almost
no links at all. Adjacency comes from geometry, and
[ADR 14](0014-the-room-is-read-from-its-drawing.md) measures how far the links fall short.

**A partial answer is no answer.** An answer that is not JSON, that carries no `seats` array,
or that holds a seat missing any field a Seat is built from is refused rather than read into
an Auditorium with holes in it. An Auditorium short of Seats is worse than one that could not
be read, because only one of the two says so. `UpstreamSeat` declares exactly the nine fields
the translation reads and `SEAT_FIELDS` gives each of them a type, keyed by
`keyof UpstreamSeat`, so a field added to the one and not the other does not compile.

### The catalogue

**`Format` is a closed set, and an unrecognised label leaves a screening standard.** The
aggregator names a premium presentation in free text among a screening's amenities, several
names to a screening, and there is a structured format field beside them that carries four
values across the whole corpus against the labels' forty five, so the labels are what the
adapter reads. It maps the ones it recognises onto Formats and drops the rest, which leaves a
screening standard rather than inventing a Format from a name nobody has classified. That is
the fail-closed rule Availability follows, applied where the vocabulary is open: the cost of
failing closed on a label would be dropping a whole screening for a word, and the cost of
inventing one would be a Format nobody can define. The table covers the labels the
catalogue's own two answers carry.

`Amenity` is the same rule over the same labels, so no label yields both and one nobody has
classified yields neither. A theater record carries its own list of what the venue offers;
those describe an address rather than a screening, the listing route names them without the
code the other two routes give them, and the adapter reads none of them.

**`Chain` is a closed set and no name in it is one this project invented.** The listing names
a Theater's chain by a code and never by a name, which is what an earlier phase read as
leaving nothing behind a translation; the discovery answer names both, so the table's nine
entries are each the name the Source itself states for that code and a test holds every one
of them to that answer. A Theater whose code the table does not hold carries no Chain, which
is three of the twelve codes the captured listings carry.

### What bookable means

Not what the aggregator says. Its own word for a screening on sale reads `available` for
screenings at a theater whose every captured seat map request is a 400, because those rooms
are general admission and have no seat map to fetch. The predicate that decides it is
reserved seating on the enclosing group of amenities, and it is asked first, because a room
that never has a seat map is a more durable fact about a Showtime than the time of day.

`CONTEXT.md` states the predicate. Three of its four parts are decided by flags rather than
by the Source's own word for whether a screening is on sale: the flags agreed with the word
in all 928 captured rows, they are total where a word is open, and reading them keeps one
more piece of upstream vocabulary out of the program.

**The fourth is decided by the word, because no flag can express it.** `CONTEXT.md` states
that case: every flag calls such a row bookable and only the Source's own word says
otherwise. What decides the reading is what the alternative costs. The seat map route refuses
each of those rows with a status the adapter reads as a transport failure, which spends the
retry budget and can open a circuit the whole area shares. It is asked about
exactly one value: every other word, recorded or not, leaves the row where the flags put it.
The first three reasons are also what a seat map refusal comes back with; this one is not,
and the Reading's own type says so, so no status code can be mapped to it.

**Where it is asked is decided by which remedy survives it.** A room that never has a seat map
and a screening that has already begun both keep their reason, because neither is undone by a
Theater switching sales off and the Source's own listing agrees: the rows already past at such
a Theater carry the word for past, not the word for off sale. Sold out does not keep it. Its
remedy is another time at that Theater, and there is no buyable time at a Theater that is not
selling, so a row that is both is named for the Theater. The order is reserved seating,
begun, sales off, sold out.

Reading the word for one value is only safe while something notices a second value arriving,
which is [ADR 11](0011-a-nightly-reading-judges-the-world.md).

### The row that carries everything but its identity

An answer missing anything a Showtime or a Theater is built from is refused whole rather than
read into a listing with holes in it, for the reason a partial seat map is refused: a listing
short of a theater cannot be told from an area that is genuinely that empty.

**A row that carries everything but its identity is the one exception.** Nothing above the
seat map route reads that identity, so a row without one still has its Presentation, its start
time and its ticketing URL: it can be listed, narrowed and handed off, and the only thing it
cannot do is be asked for Seats. Refusing the answer for it does not prevent a hole, it makes
a larger one. The aggregator drops the field for whole theaters at a time, all of a theater's
rows or none, and five readings half an hour apart across five metropolitan areas found it
gone from a quarter of all rows, with every one of the sixty listings in the first reading
holding at least one, so under the general rule every search would answer `unreachable`.

Such a row goes to a third list on the catalogue, and the reason is asked before the identity.
A Showtime the catalogue already knows to be expired, sold out or general admission never
needed one, so it stays where it was and keeps the remedy that goes with its reason; folding
it into "could not be checked" would offer the operator's page for a screening that has
already started. What is left in the third list is exactly the candidates no request can be
spent on. The three lists partition the rows the answer held, and a test holds their total to
the number of rows the Source sent, so a row can move between them and cannot be dropped.

None of this weakens Availability. No Seat is presented as bookable on thinner evidence; a
Showtime that cannot be checked is reported as one that cannot be checked. And a field that
is present and is not what it was is not this case at all: that is a change of shape rather
than a missing datum, and the answer is refused whole for it as for every other field.
`SHOWTIME_FIELDS` is keyed by `keyof UpstreamShowtime` less the two that may be absent, the
identity and the sellability word, so a field added to the declaration and not to the table
still does not compile, and the kind of each of those two is asserted in the predicate beside
it.

## Consequences

A caller cannot act on an upstream status, because it cannot see one. Every remedy a screen
offers is chosen from the Reading's four reasons, which is what lets an interface be written
without knowing the aggregator exists.

An unrecognised word costs coverage in exactly one direction. A screening labelled with an
unknown premium name is offered as standard; a Seat carrying an unknown status is not offered
at all. That asymmetry is deliberate and it is only safe while something watches the
vocabulary move.

That a refusal is read as a refusal rather than as a session to re-open is pinned by
`aggregator.test.ts`, and it is [ADR 2](0002-computation-on-the-client.md)'s decision rather
than this one's.

The boundary costs a parser per answer and a table per closed set, and every widening of
either is a line somebody reads.
