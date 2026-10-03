# 19. The results list is painted once, at settle

Date: 2026-09-05

## Status

Accepted. Amended 2026-10-03: the web application this was first written for was deleted. The
app follows the same decisions through `packages/view-logic`.

## Context

Results arrive out of order over about a second, and the ranking is a total order, so a
better result inserting above a card already on screen moves that card down. That is a layout
shift by the definition Core Web Vitals use, and the first such insertion alone measured 0.13
against the 0.1 the standard allows.

There is an obvious way to make the number go away that does not solve the problem: render by
rank position, so the card in slot one is replaced rather than pushed. The score stays at zero
and the reader is looking at a different result from the one they were reading a moment ago.
That games the metric rather than meets it.

The same question comes up in three smaller places on the same screen. What to say about how
close a result is to what was asked for. What to say about the rooms nobody checked. And what
a card is allowed to claim about its own provenance.

## Decision

The app draws over the client's composition root, and everything on its screen is computed
from a search: no fixture is rendered as if it were live.

**The list is painted when the ranking has stopped moving.** While the search is in flight the
strip carries the counts, the list head says how many seat maps are still being read and how
many showtimes have answered, and the cards appear once, at settle. On the live Source that is
well under a second end to end; on the corpus replay it is a few hundred milliseconds. The one
transition the list does make is held still while a finger is down on it and released when the
touch ends or is cancelled, so nothing reshuffles under a tap. `heldSnapshots` in
`packages/view-logic` does the holding, and the list's own touch events drive it.

**The tie is a band, and nothing shows a score or an ordinal.** Every result whose Seat Group
sits within half a row and one seat of the target is in the tie, whatever a console or a wall
cost it in the score, because that predicate is what the tie means; those results sit above a
rule of light ordered soonest first, and everything below the rule is in score order and is,
exactly as the rule says, measurably further from the target.
[ADR 18](0018-good-seats-are-scored-against-a-reference.md) is why there is no number to show.

A card says where the Seat Group is as its row of the room's rows and its offset from the
centreline in seats, why it ranked where it did as the penalties it was charged, how fresh it
is as an age that keeps counting, and that it came from one Source. That last line is stated
rather than counted, because a Seat's Provenance names exactly one Source and a count over it
cannot come out otherwise; a type test binds the statement to that type, so widening Provenance
to a second Source fails a test that points at the card. A pair astride the centreline is
called central, because half a seat off is the finest a pair can do.

**Coverage on this screen is counts and never a bar.** An in-flight search is Coverage: its
ledger closes in every snapshot, so the strip reads candidates, checked, to go and not read
yet, and the ledger is a dialog with a count per outcome, the named rows with their Theater and
time, a link to the operator's page where that is the remedy, and an arithmetic line that adds
to the candidates. A search that settles with rooms unreached says so in its heading before it shows a
card, names those rooms, and offers the retry before it offers to change the query; a search
that settles with every room answered and nothing to offer says that in a different heading; a
search whose listing could not be read says the listing could not be read. The retry re-reads only the rooms the search could
not reach, once each, and the button says how many those are; the listing is re-read only when
it was the listing that failed. A room stays in the unreached count until its retry answers, so
the ledger is closed while the retry is in flight and a retry abandoned part way leaves the
rooms it had not reached still named.

**A search is a URL.** The query lives in the address as `movie`, `date`, `area`,
`partySize`, `chain`, `theater`, `format`, `amenity`, `from`, `until` and `accessibleSeating`,
the glossary's own words, so the back button is the previous query and a test can open a journey
by navigating to one. The Seat Profile is not among them: it is the device's, not the query's.
The title card states every term it holds, each value its own button that opens the Ask sheet
with that field focused. The Movie is still the identity the Source states, and a title is now
resolved against it: the Movies playing near the area on the date are read from the dated
theater-centric route, so the sheet can offer a half-remembered title and the card can say the
title rather than the number.

## Consequences

A reader never watches the list rearrange itself, and the price is that nothing appears until
the search settles. That is affordable only because a search is about a second, which
[ADR 16](0016-a-search-reports-its-coverage.md) records and the live timing test holds.

Coalescing the search's notifications is a rendering decision, and this is where it is made: the
screen subscribes and paints once rather than the store publishing less often.
