# 14. The room is read from its drawing

Date: 2026-09-05

## Status

Accepted

## Context

A seat map arrives as a list of rectangles with labels, a row index, and links to the seats
either side. Every one of those except the rectangle is a shortcut, and every one of them is
wrong somewhere in the corpus.

The row index skips a value in 14 of the 42 captured seat maps, and Cinemark West Plano
screen 28 holds 14 rows while that index runs to 16. One chain's four rooms label their seats
`101` to `919` with no letter anywhere, 6 of the 376 rows carry no agreed label prefix, and
33 of the 42 maps number the seats of a row against the direction they are drawn in. Of the
10,974 neighbour links the aggregator sent, none is wrong, but 279 contiguous gaps carry no
link at all, and in one captured Auditorium of three hundred Seats, two hundred and ninety
carry no link while its drawn geometry is perfectly regular.

The rectangles are the one thing that is always there and always means what it says, because
they are what the aggregator draws the room from.

## Decision

`packages/core/src/domain/auditorium.ts` puts every Seat of one Auditorium into the
coordinate system `CONTEXT.md` defines, reading `x`, `y` and `width` off a Seat and nothing
else. Everything above it compares Seats in that coordinate system.

**A row is a distinct `y`, and depth is that row's place in the order.** Every Seat of a row
carries one `y` in all 42 captured seat maps, and the count of distinct `y` values equals the
count of rows in all 42, so rows need no clustering tolerance and no invented threshold.
`rowsOf` in `seat-group.ts` is where "y grows toward the back" is written, and the Seat Groups
a search offers, the map a screen draws and the neighbour links the contract test walks all
reach it rather than each writing that comparator again. It answers rows that are non-empty by
type, which is what lets the map read a row's depth off its first Seat. `normalised` keeps its
own pass over the distinct `y` values, because that pass is what depth is derived from and
`seat-group.ts` is built on top of it.

Depth is the row's rank over the last row's rank rather than its distance down the room,
because rows are not evenly spaced: 41 of the 42 maps draw at least two different row gaps,
14 of them draw their widest gap at least half again as wide as their narrowest, and one
twelve row house draws one gap 2.11 times another. Under a depth measured in map units an
aisle would push the row behind it further back than a row deserves, and "eighth row of
fourteen" would stop meaning eight fourteenths. A property test draws each generated room
twice, once as generated and once with every row gap set to one, and holds the two sets of
depths identical.

**Depth starts at the front row because nothing in a seat map locates the screen.** The
vertical offset that reads like a throw distance is the whitespace the background reserves for
the screen glyph, and it ranges from 1.9 to 11.4 seat widths across the corpus.

**The centreline and the span belong to the room, never to a row.** A Seat's lateral is its
own centre placed on the extent of every Seat centre in the Auditorium. Rows are neither
alike nor concentric: 25 of the 42 maps widen toward the back, 15 narrow, 2 are equal, and one
room spreads its row midpoints across 4.6 seat widths. Normalising a row against its own
extent would put the outermost Seat of a row of four exactly where it puts the outermost Seat
of a row of thirty two, which is the opposite of what a normalised position is for.

The same reasoning fixes what a Seat's offset in seat widths means. It is the same offset over
the same extent, divided by the Seat's own width instead of by half the room, and it is not a
count of the Seats between here and the middle of the row: the centreline is the room's, so a
Seat halfway along a narrow row reads further out than one halfway along a wide one.
Mirroring an Auditorium negates it exactly as it negates lateral, which is the property that
holds it, and five captured Seats pin its scale.

**No label is read, and none can be.** `normalised` is generic over anything carrying `x`, `y`
and `width`, so a Seat's printed label is not nameable inside it and ordering by one is a
compile error rather than a convention, which is
[ADR 8](0008-guarantees-are-made-at-compile-time.md)'s third technique. A property test
relabels every generated room with a generated function and holds every position unchanged.

**Adjacency is three bands measured centre to centre.** The spacing between two neighbours,
centre to centre and divided by a Seat's width, lands in one of three bands: up to 1.45 is
contiguous, up to 2.05 is the console between two recliners, and above that is an aisle. Over
the 6,395 in-row gaps the corpus holds, that is 5,688, 540 and 167. The two boundaries are
cuts through a continuous distribution rather than gaps in it, which is why a console is
recorded rather than treated as a break: a run never crosses an aisle, may cross a console,
and says how many, because three people can sit either side of one.

A gap beside an accessible space is that space's own width, not a console. 78 of the 540 sit
next to a wheelchair or companion Seat, and the Seats either side of one are contiguous, which
leaves 462 real consoles.

**The neighbour links are held to the geometry rather than read.** All 10,974 the aggregator
sent name the immediately adjacent Seat in the same row, on the side they claim, and not one
crosses a console or an aisle. A test asserts the agreement over the corpus, the nightly
contract test asserts it over today's rooms, and no code builds a run from a link.

**A Row's number is its place in the order, and it is contiguous by construction.** The
Source's own row index is unreachable as well as wrong: `UpstreamSeat` never declared it, so no
Seat carries it and ordering by one would not compile. What the corpus test asserts instead is
that Cinemark West Plano screen 28's fourteen Rows are numbered one to fourteen while the
capture's own index reaches sixteen, and, over all 42, that the count of Rows equals the count
of distinct `y` the room draws.

**A Row's label is the initial its Seats agree on, or nothing.** Six of the 376 captured Rows
agree on none, all of them accessible Rows putting a wheelchair Seat in a lettered Row, and
those Rows have no label to show. One initial is enough because it tells every Row of every
captured Auditorium apart, which a test asserts rather than assumes. The whole agreed prefix is
not the answer, because eight Seats numbered `401` to `408` agree on `40` and sit in row 4.

**The keyboard's order comes from the same place.** `auditorium-map.ts` is the ordering the
seat map's keyboard model reads, supplied by the domain model so the view improvises none of
it. It normalises the room and then partitions it with the same `rowsOf`, so the order a
keyboard walks and the order a Seat Group is cut from cannot diverge. A property test
relabels every generated room with a generated function and holds the order unchanged.

The map answers with the Auditorium's Rows front to back, each holding its Seats left to
right, its own number, its label, how many of its Seats are bookable and what sits in each gap
along it. It also says where the recommended Seat Group is, as places in `rows` and in that
Row's `seats`, both counted from zero rather than from one as the Row's own number is, and
null where the Seat Group is not in this Auditorium at all. `nearestInRow` takes a Row rather
than a place in `rows`, because taking a place would need either an unchecked index or a
branch nothing can reach, and a branch nothing can reach is a mutant nothing kills; a view
that is moving from one Row to the next holds the Row already.

Asking a Row for the Seat nearest a Seat's own lateral answers with that Seat, which is what
makes Down and then Up land where it started once the view holds the anchor still. A tie goes
to the Seat on the left, because the rule has to be decidable. The anchor itself is not here:
a goal column is interface state.

The gap after each Seat is the Seat Group bands, not a second opinion. `gapBetween` is shared
with `seat-group.ts`, so a console is a console in both, and it measures centre to centre so
that it agrees with the order a Row is taken in whatever the Seats' widths. Over the corpus
that is 5,766 contiguous gaps, 462 consoles and 167 aisles: one per adjacent pair, so a Row of
*n* Seats carries *n* − 1 of them and the last Seat has no gap after it.

## Consequences

The generated rooms the property tests draw are adversarial rather than tidy: uneven row gaps,
rows of differing widths and origins, Seats of differing widths, coincident Seats, rooms of one
row, rooms of one Seat, Seats delivered in shuffled order, and labels whose letters and numbers
both run against the geometry. Nothing above this layer has to cope with any of them.

The map deliberately does not carry a third value for availability. A Seat is bookable or it is
not, because `A` is the only upstream status whose meaning is established; there is no status
the corpus establishes as "taken", so nothing here can say so and the view must not either.

Every number in this record is a measurement of the committed corpus, so a refresh that moves
one moves this document with it. [ADR 10](0010-the-corpus-is-the-contract.md) says what a
refresh may and may not do.
