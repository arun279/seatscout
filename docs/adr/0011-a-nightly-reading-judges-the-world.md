# 11. A nightly reading judges the world, and gates nothing

Date: 2026-09-05

## Status

Accepted

## Context

The mutation gate judges the code against the tests. Nothing above it judges the world: every
other test runs against the committed corpus, so the whole suite stays green while the
upstream quietly changes shape underneath it.

Two of this repository's rules make that worse rather than better. The seat map adapter maps
a seat type it does not recognise to `standard` rather than failing closed on it,
deliberately, because failing closed would drop whole Chains out of every search for the sake
of a word nobody had classified. The catalogue reads one value of the Source's word for
whether a screening is on sale and takes every other value to say nothing the three flags do
not already say. Both are tolerances, and a tolerance nobody watches is how the next field
leaves without anyone noticing.

The obvious answer is to make a live check a required check. That answer is wrong. Such a
check states an assumption about the world rather than behaviour of this code, so it goes red
on a night nobody can act on, and a red nobody can act on is a check people learn to ignore.

## Decision

`packages/core/src/testing/contract.ts` reads one seat map answer and reports every way it
diverges from what the corpus recorded, and it reads a live area and a live listing and
reports either one that no longer becomes a domain object or arrives with nothing in it.
`contract.live.test.ts` holds the live aggregator to that, and
`.github/workflows/contract.yml` runs it nightly. It is not a required check and never gates
a pull request. [ADR 12](0012-every-mutant-must-die.md) says why the mutation gate is off that
list for an entirely different reason.

**The recorded vocabulary is derived from the captures at the point of use** rather than
written down beside them: the top-level and seat key sets, the four seat statuses the corpus
holds and the three seat types. Nothing has to be kept in step with a refresh, and a list
written by hand cannot drift from what was measured. Eight things are reported: a body that
is not JSON, a field the parse needs and the answer no longer carries, an answer that parses
into nothing at all, a key never captured before, a seat status outside the recorded
vocabulary, a seat type outside it, a listed screening the catalogue did not refuse that
carries no word for on sale, and a neighbour link that disagrees with the geometry.

**One list stands beside the corpus, for a status the corpus cannot hold.**
`SETTLED_STATUSES` names a seat status that has been measured against the live Source and
settled as bookable or not, and the known statuses are the corpus's plus those. It holds `H`
alone: a seat held in another shopper's checkout, 84 seats among the 75,591 read across 492
live maps on 2026-08-29, 0.111% of them, left out of the upstream's own available counts,
refused by its booking interface, and resolving within minutes to `R` when the purchase
completes or back to `A` when it lapses. A state that rare and that short-lived does not land
in a capture: three passes over about 42,000 seats had already missed it, and refreshing the
corpus until one caught an `H` would freeze one shopper's abandoned cart into the fixtures as
though it were a property of the room. A word nobody has measured still turns the check red
on the first night, which is the whole of what the check is for. The list is not a free pass
either: the unit suite reads every status on it through the seat map adapter and fails unless
the adapter agrees with what the list declares, so it cannot drift from the known-bookable
list in either direction.

**A refusal is not a divergence.** The aggregator declines a seat map request often and
politely, and it is wrong to report that as the shape having moved: a Showtime that sold out
overnight would turn this red. Only a 200 is judged. The reasons a refusal carries are not
judged either, because the adapter reads the status code and not the reason, and because the
first live run met a reason the corpus never captured. What guards against a wholesale
refusal is coverage: at least one answer must read as an Auditorium with Seats in it, so an
upstream that refuses everything fails rather than passing vacantly.

**The catalogue is judged the same way, and on one word further.** A live area must read into
Theaters and a live listing into a Catalogue, and neither may arrive empty, which is the same
vacuity guard the seat map half has: an area of no Theaters and a listing of no Showtimes
both parse perfectly and mean the upstream stopped answering. What is not judged is how many
rows arrive without an identity, because a threshold on that is an invented number that would
go red on a day nobody can act on. Nor is that missing field named, the way a missing seat
field is: a listing short of any of the five is one refusal with no way to say which, and
giving it one would mean exporting the aggregator's listing shapes out of the adapter, where
keeping them is the first of the mechanisms that hold the vocabulary boundary in
[ADR 9](0009-no-upstream-word-crosses-the-boundary.md).

**The sellability word is judged, and it is the one word this half reads.** The premise
stated as an invariant is that a row the catalogue found no reason to refuse carries the word
for on sale, and that is what goes red: such a row carrying any other word, or none. A row it
did refuse is outside the invariant, including one refused for that very word, so a Theater
that stays off sale is not a nightly that stays red. It is the same argument as the
unrecognised seat type: reading the word for one value is only safe while something notices a
second value arriving, and a further word meaning "not on sale" would otherwise reach a
maintainer as a Theater quietly spending the retry budget, which is how this one reached one.
The adapter hands over the word on each of those rows rather than its listing shapes, so the
boundary holds and there is no second declaration of the listing to drift. The word for on
sale is written down in the adapter rather than derived from the corpus, which is the
opposite of how the seat vocabularies are known, and deliberately: a refresh must not carry a
renamed word into the contract silently, because a rename is exactly what this check is
strongest against.

What that watch can see is bounded by what it reads, which is one area's widest release once
a night: near-total against the word being renamed or the field disappearing, since both hit
nearly every row, and weak against a further rare word at a rare Theater, which is the shape
this case had.

**The neighbour links are the live half of an invariant the corpus already carries.** The
Seat Group test holds all 10,974 captured links to the geometric bands; that guards the
fixtures. Here every link a live map sends must name the Seat immediately beside it in the
same row, on the side it claims, across a gap the same band rule calls contiguous. It is the
adapter's own rule applied to today's rooms, not a second copy of it.

**The answers come from a global setup rather than from the test.** `tools/live-answers.mjs`
reads an area, takes the day's widest release, and asks for one seat map per Chain plus
whatever the listing already knows to be unbookable, and hands on the area and the listing
answers it already made rather than asking for them twice, which is under twenty requests
half a second apart, the spacing the corpus refresh uses and the spacing at which 156
consecutive reads met no 5xx. Core has no `fetch` and cannot get one, so the reading happens
outside it and arrives as provided values; that is also what keeps the judgement itself a
pure function the mutation gate can reach. It is a second client of the aggregator rather
than a share of `capture-corpus.mjs`, because that tool's session exists to harvest the
values it has to redact and its getter exists to keep a request ledger, and neither belongs
here. The area it reads is a constant beside the user agent that was always one, and the
origin comes from `tools/upstream.mjs`, which `capture-corpus.mjs` reads too: the tool that
records the corpus and the tool that checks it have to name the same aggregator for the check
to mean anything, so they name it once. The area is the postal code of the theater the corpus
is anchored on, which the corpus's own first result already carries in its address.

**What the setup provides is checked on every pull request.** A live test asks for its answer
by name and gets `undefined` if the setup stopped providing it, which reaches a maintainer as
a type error inside a nightly that then blames the upstream. `pnpm live-injections` holds
every name the live suite injects to a name the setup provides, and it is a step in
`quality`, so a rebase that drops one fails the pull request instead of the night.

The same lane carries one more reading of the world, the live search timing in
[ADR 16](0016-a-search-reports-its-coverage.md). A failure there opens the same issue,
because the two are the same question asked of the same Source, and the issue names which of
them it was.

### What the alarm says

**Nothing is withheld from the issue, and what the first version withheld was not secret.**
That version posted a link and no reading at all, on the grounds that the run log "is
redacted where this issue would not be". Both of the things it was protecting are committed
constants anyone can open: the origin and the area are both in `tools/`, the captures name
the aggregator throughout, and the upstream needs no credential, so there is nothing a public
issue could give away that the repository does not already state. The issue therefore carries
the finding: which status, which key, which field, which Seat, or the milliseconds measured
against the budget. What it still does not carry is a captured payload, and that is a
judgement about noise rather than about secrets, since a maintainer who wants the bodies has
the run log. The message shapes stay as they are, a route with its query string dropped and a
transport failure re-raised without the cause, because a message that is safe to publish
anywhere is easier to keep safe than one redacted on the way out.

**A failed scheduled run says so on an issue; a dispatched one says so in the run summary.** A
scheduled run's own notification reaches one person, and which person is a rule rather than a
choice: whoever created the workflow, unless someone later changed its cron line, unless
someone later re-enabled it. That is neither discoverable nor stable under editing, so the
workflow labels and opens one issue instead. A hand-dispatched run writes the same finding
into the step summary and touches no issue, because a dispatch is someone testing and that
someone is already looking at the run. What the alternative cost was eight identical comments
in eleven minutes, from agents dispatching the workflow while investigating it.

**A repeat updates its own comment; a new reason gets a new one.** Each comment ends in the
fingerprint of what the run found and the number of scheduled runs that have ended that way.
A run whose fingerprint is already on the thread edits that comment and raises the count; a
run carrying a fingerprint nobody has seen posts a new one, so a second thing going wrong is
as loud as the first was. Digits are dropped before the fingerprint is taken, so a timing
that misses its budget by a different number of milliseconds is the same reason rather than a
new one every night. `marocchino/sticky-pull-request-comment` does this for the footprint
report and was the obvious thing to reuse, and it does not fit: it finds the comment it owns
through a GraphQL `repository.pullRequest(number:)`, which answers null for an issue number,
so every run would have posted a new comment anyway.

**A green scheduled run closes the issue.** The first version closed nothing, on the argument
that whether the contract question is settled is a judgement about the code rather than about
how the world happened to look last night. The argument holds; the conclusion does not follow
from it. That judgement is made in the repository, and the only way it reaches this check is
as a change to the repository, which is the same change that turns the next scheduled run
green. Green therefore says one of two things, that the world came back or that the project
answered, and both of them close the loop. A person can reopen an issue, and a failure that
returns opens its own comment with its own reason. An alarm that only ever escalates is one
people stop reading, which is the same argument as the red nobody can act on.

## Consequences

An unrecognised seat type reaching a search as `standard` is safe, because this is the thing
that notices the vocabulary moving. Availability is the other way round and fails closed, so
a status outside the recorded set is reported here rather than reaching a result as a Seat
nobody can buy.

The check reads the network, so it has a vitest configuration of its own and the root
configuration excludes `*.live.test.ts`. Neither the unit suite nor the mutation run ever
reaches the network.

A maintainer finds out about an upstream change the morning after it lands rather than from a
user, and finds out from an issue that names the finding rather than from a red tick.
