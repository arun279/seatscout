# Domain vocabulary

The words this codebase uses, and what each one means. Code, tests, types, and commit
messages use these terms and no synonyms. If a word here feels wrong, change the word
here first and then the code, not the other way round.

Several of these terms conflict with what upstream data providers call the same thing.
Provider names are translated at the adapter boundary and never leak inward.

---

## Chain

The brand that operates venues. AMC, Cinemark Theatres, Alamo Drafthouse Cinemas, Landmark.

**Not a Source.** A single Source can supply data for many Chains, and one Chain may be
reachable through several Sources.

The set of them is closed and every member is spelled the way the Source spells it, so no
name here is one this application invented and a test holds each one to an answer that states
it. A Theater whose Chain the set does not hold carries none, which is the rule Format follows
and for the same reason.

Naming a Chain and covering it are different things. A Theater with no Chain is listed, ranked
and handed off like any other; the one thing nobody can do is ask for it by Chain, and that is
a Query that does not compile rather than one that quietly comes back empty.

## Source

A system this application reads data from.

A Source is an integration, not a company whose seats we sell. One Source commonly spans
many Chains. Coverage of a Chain and the number of Sources are independent quantities:
adding a Source does not necessarily add Chains, and a Chain may be covered without
having a Source of its own.

## Theater

One physical venue at one address, operated by a Chain.

Spelled `theater` throughout. Upstream providers disagree with each other on this
(`theaterId` in one, `theatreNumber` in another); adapters normalise to `theater`.

## Auditorium

One screen inside a Theater. A Theater has many Auditoriums.

A given Auditorium can have different seat layouts for different Showtimes, so an
Auditorium is not a fixed seating chart.

## Movie

The film itself, independent of where or how it is shown.

## Presentation

A Movie shown in a particular set of Formats at a particular Theater.

The same Movie at the same Theater in standard and in a premium Format is two
Presentations. Some providers call this a "variant"; that word is avoided here because it
reads as a code artifact rather than something a moviegoer would recognise.

A Presentation carries every Format that applies to it rather than one, because a premium
projection and motion seating are both Formats and apply to the same screening at once. A
Presentation with no Format is a standard screening. It carries its Amenities the same way,
read from the same labels, and a Presentation with no Amenity is one the Source labelled with
none this application has named.

## Showtime

One screening: a Presentation, at a specific time, in a specific Auditorium.

This is the thing a ticket is for. Some providers call it a "performance".

**Not a Presentation.** A Presentation is the offering; a Showtime is one instance of it.

## Format

The premium presentation type: IMAX, Dolby Cinema, D-BOX, ScreenX, XD. Absent for a
standard screening.

The set of them is closed, and a premium name outside it is not a Format. A screening
labelled with one the application does not know reads as standard rather than as a Format
invented from the label, which is the rule Availability follows for the same reason.

**Not an Amenity.** Format describes how the film is projected and mixed.

## Amenity

Everything else a Showtime or Auditorium offers that is not a Format: recliner seats, dine-in
service, closed captioning, accessibility devices.

The set of them is closed, for Format's reason and in Format's words: a label outside it is
not an Amenity, and a screening labelled with one the application does not know carries no
Amenity rather than one invented from the label. Both are read from the same labels the
Source puts on a screening, and no label yields both. It is the four above, and it grows in a
diff: the Source labels other comfort and service nobody here has named, and naming one is a
reviewed line rather than a change of rule.

Reserved seating is labelled and is deliberately not among them. It is the predicate that
decides whether a Showtime is bookable at all, so every Showtime a search can offer already
has it, and a Query term restating it would ask for something no answer lacks.

**Not a Theater's own list.** A Theater carries a second and separate list of what the venue
offers, from stadium seating to a games room. Those describe an address rather than a
screening, and none of them is read.

**Not a Format.** Amenities describe comfort and service.

## Seat

One seat in one Auditorium for one Showtime, carrying its own availability.

Every Seat has a **normalised position**: a *depth* from 0.0 at the front row to 1.0 at
the back row, and a *lateral* from -1.0 at far left through 0.0 at the centreline to +1.0
at far right. Depth starts at the front row rather than at the screen because nothing in a
seat map locates the screen itself. Normalised position is derived from seat geometry,
never from the seat's printed label, because labels are not ordered, not contiguous, and
sometimes not letters at all.

The same sideways offset is carried a second way, in *seat widths* from the same
centreline, because a Seat's place is spoken as so many seats left or right of centre and
a fraction of the room is not a thing anyone can picture.

## Row

The Seats of one Auditorium drawn at one depth, taken in order of lateral, numbered from
one at the front row with no gaps. A Row also knows what separates each of its Seats from
the next: nothing, a pod divider, or an aisle, in the same three bands a Seat Group is
built from.

**Not the Source's row index.** That index skips values in 14 of the 42 captured seat
maps, so it cannot say which row of how many this is, and it is not carried past the
adapter at all. A Row's number is its place in the order, and its label is the initial its
Seats agree on, or nothing where they agree on none.

## Designation

What a Seat is for: an ordinary seat, a wheelchair space, or the companion seat beside one.

It is translated from the Source's own normalised seat type, never from its chain-specific
seat label, which spells the same distinction four different ways.

**Not an Amenity.** An Amenity is something a Showtime or an Auditorium offers; a Designation
belongs to one Seat. Wheelchair and companion Seats are kept out of ordinary results and
appear only for a Query that asks for them.

## Seat Group

Exactly as many adjacent Seats at one Showtime as the party needs, taken from one run
uninterrupted by an aisle.

Adjacency is read from where the Seats are drawn, never from the Source's neighbour links.
A Seat Group may cross a **pod divider**, the console between two recliners, and it records
how many it crosses. One that crosses none is better than one that crosses two, and neither
is excluded, because three people can sit either side of a console.

An unbroken run yields one Seat Group rather than every party-sized window in it. A run of
ten free Seats holds eight overlapping threes, and offering all eight is a list of
duplicates.

**This is the unit of a search result.** A search returns Seat Groups, not Showtimes. A
Showtime with no acceptable Seat Group is not a result, however well it matches on Movie,
time, or location.

## Seat Profile

A named preference describing where in an Auditorium someone wants to sit, expressed in
normalised position: a target depth, a target lateral, and how strongly to penalise
departures from them.

**Reference** is the default Profile. It targets two thirds of the way back on the
centreline, close to where SMPTE ST 202 places the reference microphone and where a
THX-certified auditorium is calibrated. That two thirds is measured to the rear wall,
which a seat map does not locate, so the target is a close approximation of that point on
the row axis rather than the point itself.

It penalises five things. How far the Seat sits from the target depth, which carries the
heaviest weight of the five because the target is what the Profile is for. Off-axis viewing
angle, weighted equally, which is lateral offset divided by distance to the screen rather
than lateral offset on its own, because the same sideways offset is a larger angle the
nearer you sit. Then three lighter terms: proximity to the screen and proximity to a wall,
of which the last row is one case, because ST 202 keeps its measurement positions more than
sixteen feet from the screen and more than five feet from any wall; and each pod divider the
Seat Group crosses, because a run that crosses none is better than one that crosses two and
ordering is the only thing the score does.

Two of those are distances the seat map does not carry, so the Profile holds the geometry it
is scored in as well as its targets and weights: how far the screen stands in front of the
front row, how far apart rows stand, and where the front band ends. All are adjustable, and
the ordering does not turn on them.

The resulting score orders Seats and does nothing else. It is never shown as a number, and
a ranking explanation names the reasons instead. Accessible Seats and unavailable Seats
are filtered before ranking rather than scored, because they are predicates rather than
matters of degree.

## Query

A description of what someone is looking for. Any combination of Movie, Chain, Theater,
Format, Amenity, geographic area, date and time window, party size, accessible seating,
and Seat Profile.

Accessible seating is a deliberate term rather than a relaxation. A Query that asks for it
is answered only with Seat Groups that carry a wheelchair or companion Seat, because
offering ordinary Seats to someone who asked for an accessible one leaves the exclusion in
place under another name.

A Query is satisfiable or not; it is never partially applied silently. Every result
states which Query terms it satisfied.

## Availability

Whether a Seat can currently be bought.

Availability is a judgement this application makes, not a value it copies. Upstream
status codes are mapped onto a known-bookable set, and any code outside that set is
treated as not bookable. A Seat is never presented as available on the strength of an
unrecognised code.

**Never taken from a cache.** A client's read asks not to be answered from one and not to
be kept in one, whatever the upstream's response headers would otherwise entitle it to
keep. An Availability held over is a judgement about a moment that has passed, which is the
thing Re-verification exists to prevent. What a cache between a client and a Source does is
not this application's to decide; what its own reads ask for is.

## Re-verification

Reading a Seat Group's Availability again at the moment of hand-off. It is the only thing
that yields a ticketing URL.

It answers one of three ways. The Seat Group is still there, and the answer carries the
Showtime's ticketing URL exactly as the Source supplied it. It is **taken**, meaning at
least one of its Seats can no longer be bought, and the answer carries the Auditorium's
other Seat Groups instead, ranked. Or the Source was **unreachable**, and the answer carries
nothing at all, because a Re-verification that could not judge must not offer a way to buy.

**Not a freshness check.** Every hand-off re-verifies, whatever the age of what it was
shown, so no reading is ever recent enough to skip one and there is no threshold to pick.

## Provenance

The record attached to every result of where it came from and when: which Source, the
moment it was fetched, and the upstream status the Availability judgement was derived
from.

Results carry Provenance so the interface can distinguish a Seat confirmed against two
independent Sources from one seen once, twelve seconds ago, through a single Source.

## Coverage

The proportion of a Query's candidate Showtimes that were actually checked.

Coverage is reported, never assumed complete. A search that could not reach some
Showtimes is a partial result and says so, because a short list that looks whole is
indistinguishable from an empty room.

It is seven outcomes and never one number. Checked and not-reached-yet are counted, because
there is nothing to act on in the first and naming the second is noise. Sold out, no seat
map, already started, sales switched off, never identified and could not be reached are
named with their Theater and time, because each has a different remedy and only the last of
them is worth a retry. The seven and the not-reached remainder add to the candidates in
every reading of a search, not only in the last, so the arithmetic is an invariant rather
than a hope.

A screening the catalogue lists without the identity a seat map is asked for by is
**unidentified**. It is a candidate like any other and it can never be checked, because
there is nothing to ask a seat map for; it is counted among the candidates and named with
its Theater and time, and it is offered the operator's own page rather than a retry.
Leaving it out of the count instead is what would make the short list look whole. A
Showtime the Source did identify and already said is sold out, general admission or over is
not this: it keeps that reason and the remedy that goes with it.

A screening at a Theater the Source says has **stopped selling** is on the same footing, and
it is the one thing a listing says that its own flags do not. Such a row has not begun, is
not sold out, and sits in a room with reserved seating, so every flag calls it bookable while
the Source's own word for it does not, and the seat map route refuses it. It is
counted among the candidates and named with its Theater and time, and its remedy is the
operator's own page rather than a retry, because no retry can succeed while sales are off.
