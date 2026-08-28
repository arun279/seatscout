# Domain vocabulary

The words this codebase uses, and what each one means. Code, tests, types, and commit
messages use these terms and no synonyms. If a word here feels wrong, change the word
here first and then the code, not the other way round.

Several of these terms conflict with what upstream data providers call the same thing.
Provider names are translated at the adapter boundary and never leak inward.

---

## Chain

The brand that operates venues. AMC, Cinemark, Alamo Drafthouse, Regal.

**Not a Source.** A single Source can supply data for many Chains, and one Chain may be
reachable through several Sources.

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
Presentation with no Format is a standard screening.

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

Everything else a Showtime or Auditorium offers that is not a Format: recliner seats,
reserved seating, dine-in service, closed captioning, accessibility devices.

**Not a Format.** Amenities describe comfort and service.

## Seat

One seat in one Auditorium for one Showtime, carrying its own availability.

Every Seat has a **normalised position**: a *depth* from 0.0 at the front row to 1.0 at
the back row, and a *lateral* from -1.0 at far left through 0.0 at the centreline to +1.0
at far right. Depth starts at the front row rather than at the screen because nothing in a
seat map locates the screen itself. Normalised position is derived from seat geometry,
never from the seat's printed label, because labels are not ordered, not contiguous, and
sometimes not letters at all.

## Designation

What a Seat is for: an ordinary seat, a wheelchair space, or the companion seat beside one.

It is translated from the Source's own normalised seat type, never from its chain-specific
seat label, which spells the same distinction four different ways.

**Not an Amenity.** An Amenity is something a Showtime or an Auditorium offers; a Designation
belongs to one Seat. Wheelchair and companion Seats are kept out of ordinary results and
appear only for a Query that asks for them.

## Seat Group

A run of adjacent Seats at one Showtime, uninterrupted by an aisle, large enough for the
party.

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

It penalises three things. Proximity to a wall, of which the last row is one case, because
ST 202 keeps its measurement positions more than five feet from any wall. Proximity to the
screen, because the same figure keeps them more than sixteen feet from it. And off-axis
viewing angle, which is lateral offset divided by distance to the screen rather than
lateral offset on its own, because the same sideways offset is a larger angle the nearer
you sit.

The resulting score orders Seats and does nothing else. It is never shown as a number, and
a ranking explanation names the reasons instead. Accessible Seats and unavailable Seats
are filtered before ranking rather than scored, because they are predicates rather than
matters of degree.

## Query

A description of what someone is looking for. Any combination of Movie, Chain, Theater,
Format, Amenity, geographic area, date and time window, party size, and Seat Profile.

A Query is satisfiable or not; it is never partially applied silently. Every result
states which Query terms it satisfied.

## Availability

Whether a Seat can currently be bought.

Availability is a judgement this application makes, not a value it copies. Upstream
status codes are mapped onto a known-bookable set, and any code outside that set is
treated as not bookable. A Seat is never presented as available on the strength of an
unrecognised code.

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
