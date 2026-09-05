# 18. Good seats are scored against a published reference point

Date: 2026-09-05

## Status

Accepted

## Context

The product's whole claim is that it knows which seats are good. Any answer to that is
somebody's taste unless it is anchored to something published, and an anchor invented here
would be argued about forever and satisfied by nothing.

There is also a modelling choice underneath it that looks like a detail and is not. A penalty
on how far sideways a Seat sits is separable in depth and lateral: it applies the same lateral
function in every row, so the only thing left to decide which row's side seats are punished
hardest is which row is physically wider, and that varies by room. Of the 42 captured seat
maps 25 widen toward the back, 15 narrow and 2 are equal.

## Decision

`packages/core/src/domain/seat-profile.ts` scores a Seat Group against a Seat Profile.
`CONTEXT.md` defines both, and Reference is anchored where SMPTE ST 202 places the reference
microphone and where a THX-certified auditorium is calibrated. It answers with one number, the
Group's centroid in normalised position, and the named reasons the interface shows instead of
the number. It reads a Seat's normalised position and nothing else, so a Seat Group has to
carry the positions the normalised Auditorium gave it rather than be rejoined to the room by
identifier.

**The off-axis term is an angle, not a distance.** It is how many seat widths off centre the
Group sits, divided by how far it sits from the screen, so the same sideways offset costs more
the nearer the screen. Stated as an invariant, at the same lateral offset the penalty must be
larger in the front row than in the last. Over the 42 the angular form satisfies that in 42 at
every screen gap from 6 to 48 seat widths; the separable form satisfies it in 0. The separable
form is not a second scorer in the test: it is the point of the Profile's own parameter space
where the row pitch is zero, so every row stands the same distance from the screen.

**The wall band is a wall band, not a last-row rule.** Nothing in ST 202, ST 196 or THX singles
out the last row. What ST 202 keeps, in the microphone placement area of its Figure 4, is
measurement positions more than sixteen feet from the screen and more than five feet from any
wall. That is a front band and a wall band, and the wall band covers the rear wall and the
outermost Seat of every row alike. Outermost means furthest from the centreline on its own
side, so a row that lies entirely to one side of the centreline has its outer end against a
wall and its inner end beside open floor, and a Seat drawn on the centreline is against
neither. That is unobservable in the corpus, where every row straddles the centreline, and it
is what keeps the score falling away outward along a row instead of stepping back up at the
inner end.

**Every target, weight and modelled distance is on the Profile.** Reference targets depth 0.67
and lateral 0.0, and charges for the depth it misses, the angle it sits at, the front band, the
wall band, and each console the Group crosses. Three of its numbers are geometry the seat map
does not carry, all in seat widths: the screen stands 6 in front of the front row, rows stand
1.71 apart, and the front band ends 6.97 seat widths from the screen. The last two are
conversions rather than choices. UNIC and EDCF put the minimum row distance for regular seating
at 1200 mm and quote seat widths of 500 to 750 mm for shared armrests and 650 to 900 mm for
double armrests and recliners, so 700 mm is the middle of the width every one of their seating
types can be, and 1200 over 700 is 1.71. ST 202's sixteen feet is 4877 mm, which over the same
700 mm seat is 6.97.

Nothing in the ordering turns on those distances. The suite sweeps the screen gap from 6 to 48
seat widths and the row pitch from 1 to 3, and every conclusion holds at every point.

**The number is never shown.** The ranking explanation carries the row from the front, the
room's row count, how many seat widths off centre the Group sits, whether it is in the front
band, whether it is against a wall, and whether it is tied with the target. There is no rank
ordinal, because an ordinal asserts a difference between fifth and fourth that the room cannot
support. A result is tied when it is within half a row and one seat of the target, which is the
finest an Auditorium subdivides; that predicate is contract rather than rendering, because the
list draws its rule where the tie ends.

**The score is a pure function of the Seat Group and the Seat Profile.** The centroid it takes
over the Group's own positions is summed in a canonical order, so an Auditorium delivered in a
different order scores identically rather than within a rounding error. The row a Group sits in
is counted rather than divided out of its depth, so a Group of three in the eighth row of eleven
is in row 8 and not in row 7.999999999999998.

Accessible Seats and unavailable Seats are filtered before ranking rather than scored, because
they are predicates rather than matters of degree.

## Consequences

Three measurements are what this is judged by. At Reference, all 42 captured seat maps put their
best Seat on the centreline of its row, within one row of the reference row, with the score
falling away outward along both sides of every row. Across 144 weightings and modelled distances
swept against five benchmark Auditoriums, one from each of five Chains, that holds at 720 of 720.
And the equal-offset invariant above holds at 42 of 42 and, for the separable form, at 0.

The anchor is a point the standard places on a room's axis, and two thirds is measured to the
rear wall, which a seat map does not locate, so the target is a close approximation of that point
on the row axis rather than the point itself. That is stated in `CONTEXT.md` rather than left to
be inferred.

Every part of the Profile is adjustable, so a person who disagrees with the anchor changes
numbers rather than code.
