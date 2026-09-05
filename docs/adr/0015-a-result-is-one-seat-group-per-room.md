# 15. A result is one Seat Group, and a room offers one

Date: 2026-09-05

## Status

Accepted

## Context

A room with ten free Seats in a row holds eight overlapping runs of three. Ranked
individually they would fill a screen with results that differ by one seat and by less than
the model can resolve, and the person reading them would have to notice that for themselves.

The opposite mistake is as easy. Deleting the wheelchair and companion Seats from a row
before the geometry is read leaves the Seats either side of an accessible space looking two
aisles apart, and it quietly makes accessible seating something the product cannot offer.

Between those two there is a choice about what a result *is*, and it decides what the
interface can say.

## Decision

`packages/core/src/domain/seat-group.ts` turns an Auditorium's Seats into the unit of a
search result. It takes a party size and whether accessible seating was asked for, and
answers with runs of adjacent bookable Seats, each exactly the size of the party and each
carrying the number of consoles it crosses.

**A run yields one Seat Group, not every window in it.** The chosen window crosses the fewest
consoles and, among those, sits most centrally in the run. Centring is what makes the answer
independent of which end of the row it is measured from; where the slack is odd and two
windows are equally central, the one nearer the left wins, because the rule has to be
decidable and the room offers nothing further to decide it with.

**Wheelchair and companion Seats break an ordinary run** rather than being deleted from the
row before the geometry is read. A Query that asks for accessible seating admits them and then
answers only with Seat Groups that carry one: over the corpus that turns 40 of 42 seat maps
into 40 that offer a pair including an accessible Seat, where merely lifting the exclusion
offers ordinary pairs in two of them and leaves the barrier standing.

**A Showtime contributes one result: the best Seat Group in the room.** Adjacent Groups in one
room differ by one seat and by less than the model can resolve, so a flat list of all of them
would be a list of duplicates; the alternatives live on the seat map, and on the answer
re-verification gives when a Group has gone. A Showtime whose room cannot seat the party is
still checked and still counted; it simply has nothing to offer.

The room's best is taken by sorting and reading the head rather than by a maximum with a
comparison, which looks like the long way round and is not. No captured Auditorium holds two
Seat Groups that score alike, so a `>` there would be a branch the mutation gate cannot judge;
a comparator has no such branch, and `toSorted` is stable, so the two pick the same Group.

**The ranking is a total order, so it does not depend on arrival order.** Best score first,
and where two Showtimes score alike, the lower Showtime. Two Showtimes can score exactly
alike, because two rooms drawn the same score the same, and a stable sort alone would leave
the tie broken by whichever answered first. Within one Auditorium the same rule applies to the
Seat Groups: the room's best, and among equals the one nearest the front and the left, which is
the order `seatGroupsIn` already yields.

**Scores are immutable.** A score is a pure function of the Seat Group and the Profile,
computed once when the Auditorium arrives and never recomputed, so a later arrival changes
where a result sits and never what it is.

**A result says what the filters removed.** Availability and Designation are predicates
applied before ranking rather than terms in the score, so a result states how many of the
Auditorium's Seats each of them held back: the unavailable ones, and then the accessible ones
among what is left. The two counts are disjoint in that order, so no Seat is counted twice. A
Query that asks for accessible seating removes none on that ground and says so with a zero.

**A result carries the room's seat count and its row plan beside the Seat Group.** The plan is
every row of the Auditorium as the runs its aisles divide it into, each run the lateral of its
first and last Seat, in the same normalised lateral the Seats carry. It is what a result card
draws the room from, and it is what stands in for the score the interface refuses to show, so
it is computed where the room is read rather than reconstructed by a screen.

`packages/client/src/ranking.ts` holds all of that, and it is shared rather than owned by the
search: a `SeatGroupResult`, the ordering of the Groups a room offers, and the question of
whether one particular Group is still in it. Re-verification asks the second and third of
those about the same room, so the two operations cannot grow separate ideas of what a result
is or which of two Groups is better.

## Consequences

Two measurements are what the Seat Group rule is judged by. All 42 captured seat maps have
three free Seats in one row, and a party of three can be seated in all 42. Five of them can
only do it across a console, which is what treating a console as an aisle would silently cost.

A result carries no ticketing URL, which is
[ADR 4](0004-booking-ends-at-a-deep-link.md)'s decision rather than this one's.

The alternatives to a Group are never in the search's own list and are always one
re-verification away, so a screen that wants to offer them has exactly one place to ask.
