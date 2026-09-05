# 19. The results list is painted once, at settle

Date: 2026-09-05

## Status

Accepted

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

`apps/web` is React over the client's composition root, and everything on its screen is
computed from a search: no fixture is rendered as if it were live.

**The list is painted when the ranking has stopped moving.** While the search is in flight the
strip carries the counts, the list head says how many seat maps are still being read and how
many showtimes have answered, and the cards appear once, at settle. On the live Source that is
well under a second end to end; on the corpus replay it is a few hundred milliseconds. The one
transition the list does make is held still while a pointer is down on it and released when the
pointer lifts, leaves the list, or is cancelled by a scroll, so nothing reshuffles under a tap.
The list's own pointer events carry all of that, so nothing listens on the window for it.

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
to a second Source fails a test that points at the card. A card is named for assistive
technology by its Theater, its time and its formats, because two rooms at one Theater can share
a time. A pair astride the centreline is called central, because half a seat off is the finest
a pair can do.

**Coverage on this screen is counts and never a bar.** An in-flight search is Coverage: its
ledger closes in every snapshot, so the strip reads candidates, checked and to go, and the
ledger is a dialog with a count per outcome, the named rows with their Theater and time, a link
to the operator's page where that is the remedy, and an arithmetic line that adds to the
candidates. A search that settles with rooms unreached says so in its heading before it shows a
card, names those rooms, and offers the retry before it offers to change the query; a search
that settles with every room answered and nothing to offer says that in a different heading; a
search whose listing could not be read says the listing could not be read. The retry is a fresh
search, which re-reads every room, and the button says so.

**A search is a URL.** The query lives in the address as `movie`, `date`, `area` and
`partySize`, the glossary's own words, so the back button is the previous query and a test can
open a journey by navigating to one. The title card shows the terms and each editable one is a
button that opens the Ask sheet with that field focused. The Movie is the identity the Source
states, because the domain carries no title and picking one by name would need a catalogue read
[ADR 1](0001-single-aggregating-source.md) records as unavailable.

**The dialogs are the platform's.** The editor and the ledger are `<dialog>` elements opened by
one ref callback, `modal` in `apps/web/src/modal.ts`, which React 19 calls with the element
and, because it returns a cleanup, never with null, so there is no branch for an element that
is not there. They close through `method="dialog"` forms, which is how a dialog closes without
a script reaching for it, and the `close` event that follows is what tells the screen the editor
has gone. The editor names the term that was tapped on the dialog as `data-focus`, each control
carries its term as `data-term`, and `modal` focuses the control named once the dialog is shown,
because React never writes the `autofocus` attribute the dialog focusing steps read, and a focus
call made before `showModal` lands on nothing, the element not yet being rendered. The
end-to-end suite asserts that focus in Chromium, where the jsdom shim below has no say.

The typefaces are published beside the page as the latin subsets of their variable files under
the Open Font License, whose notices sit beside them. Every stylesheet an application ships
counts as product code in the footprint report and a drawing counts as data.

The icon is one SVG and everything else is rendered from it, so the mark has one source. The
manifest names the rasters and the page names its icon, and an end-to-end test asks Chromium
itself, through the DevTools protocol, for its installability errors and expects none.

**Screen tests drive the real search, shim the dialog, and refuse a console error.** The tests
run the real `openSearch` over the fake upstream, with a captured room standing in for every
seat map the corpus did not record. `vitest.config.ts` gives them a jsdom environment as their
own project. jsdom has no `showModal` and does not close a dialog on a `method="dialog"` submit,
so `apps/web/test/dialogs.ts` gives `HTMLDialogElement` a `showModal` that sets the `open`
attribute, a `close` that removes it and fires `close`, and a document-level submit handler that
closes the enclosing dialog for such a form; the real dialogs are exercised by the end-to-end
suite in Chromium. `apps/web/test/strict-console.ts` turns every `console.error` into a thrown
error, so React's own warnings, a duplicate key among them, fail the test that provoked them
instead of scrolling past. The tests are split by subject, and the ones that need a whole screen
share `apps/web/src/search.fixtures.tsx`, which stages the real application over the fake
upstream and records every search it opens, abandons and is asked for.

## Consequences

A reader never watches the list rearrange itself, and the price is that nothing appears until
the search settles. That is affordable only because a search is about a second, which
[ADR 16](0016-a-search-reports-its-coverage.md) records and the live timing test holds.

The journey gate measures exactly this: the moment the first Seat Group is painted, beside the
three Core Web Vitals.
[ADR 6](0006-gates-cite-a-standard-or-measure-a-regression.md) says how each of those is
judged, and why one of them is held to the merge base rather than to a figure.

Coalescing the search's notifications is a rendering decision, and this is where it is made: the
screen subscribes and paints once rather than the store publishing less often.
