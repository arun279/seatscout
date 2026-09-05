# 4. Booking ends at a deep link

Date: 2026-08-22

## Status

Accepted

## Context

The application finds a specific seat at a specific screening. The obvious next step is to
let the user buy it without leaving.

Three routes exist.

Complete the purchase through the aggregator. This charges the aggregator's booking fees
and forfeits chain loyalty programme benefits, which for a frequent moviegoer is the
larger part of the economics.

Complete the purchase through the chain, preserving loyalty benefits. The one covered
chain with a public API states that its ecommerce and transaction endpoints are restricted
and not being granted. This route therefore means driving a consumer checkout with stored
user credentials.

Hand off to the operator's own checkout with the screening already selected.

Both purchasing routes require holding payment details, which brings the application into
payment card compliance scope, and holding chain credentials, which makes it a credential
store.

The upstream data makes the third route unusually cheap. Every showtime record carries a
complete ticketing URL containing a hash that cannot be derived independently. The
hand off target is supplied rather than reconstructed.

## Decision

The application finds seats and hands off to the operator's own checkout.

It never stores payment card numbers, on a server or on a device. When in application
payment is eventually warranted, it will use platform wallet APIs that yield a token, or
the operator's own wallet. Storing a card number is not a security problem to be solved
here; it is scope not worth taking on.

Ticketing URLs are carried through the domain model and constructing one is prohibited.

They do not reach a result. A result carries the showtime without its ticketing URL, and
re-verifying the seats immediately before hand-off is the only thing that yields one, so a
URL cannot be shown beside a seat that was found minutes ago and has since been taken. The
listing a search reads still carries the URL, which is what re-verification looks the result
up in.

### Re-verifying before hand-off

`packages/client/src/verify.ts` is the only place a result's ticketing URL comes from.
`CONTEXT.md` defines Re-verification and its two ways of answering no.

**It takes the result, and the result carries the Query terms it answers.** The listing is
the only thing that carries a ticketing URL, a seat map answer holds an Auditorium's Seats and
nothing about the Showtime they belong to, and a result cannot *name* its own listing. It can
carry one. A result's terms hold six fields: the Movie, the date and the area that find the
Showtime again, and the party size, the accessible-seating flag and the Seat Profile that rank
the alternatives on the yardstick the search ranked on. There is no second argument, so there
is no way to verify a result against a Query it did not come from.

**The terms that only narrowed the listing are not among those six, and that is the point.**
The catalogue read narrows what it answers to the terms it is handed, so a verification handed
a Format, a Theater or a time window the Showtime no longer satisfies would find nothing among
the bookable rows and answer `taken` with no alternatives and no seat map read at all: a wrong
answer that fails safe, which is the kind that lasts. The six are copied onto a result field by
field rather than by keeping the object the search was called with, so a listing read cannot be
narrowed a second time, and a test holds the key set to exactly those six.

**It asks the Source for the Auditorium and nothing else.** The listing is read through the
same on-device cache a search reads, so a hand-off moments after a search spends no request on
one. The two-hour lifetime in [ADR 13](0013-only-the-catalogue-is-cached.md) applies: what a
hand-off must not reuse is an Availability judgement, and a ticketing URL is not one. The
Auditorium is re-read every time, whatever the result's age. There is no threshold and adding
one would be a number that changed nothing: this is the only source of a ticketing URL, so a
stale reading can never reach a hand-off and there is nothing for a threshold to decide.

**A Seat Group is still there when every Seat in it is still there and still bookable.** That
is the predicate, and it is deliberately not "the room still offers this Group". A run yields
one Group, the window of that run crossing the fewest consoles and then nearest its middle, so
a Seat coming free *beside* a Group moves the window the run offers: in the captured Auditorium
the suite uses, freeing one Seat shifts the offered pair from `F9+F8` to `F8+F7` while both of
the Seats someone is holding are free. Looking the Group up among the offered ones would call
that taken and send someone to alternatives they did not need.

**What comes back is a fresh reading of that Group, not the one it was handed.** The Seats, the
moment, the attempt count and what the filters removed all come from the Auditorium as it reads
now, through the same builder a search builds a result with. Its key and its score are the
same, because a key is the Showtime and the Seats and a score is a pure function of the Group,
the Auditorium it sits in and the Profile. The third of those is easy to miss: the scoring
derives the row count, the half span and which Seats stand against a wall from every Seat in the
room, so a room that reads back a Seat short moves the score without the Group changing.

The one value carried across rather than re-read is how many consoles the Group crosses, and it
is carried because it is part of what the caller is asking about rather than part of what the
answer says: a Seat Group is its Seats and the consoles between them, and both are how the room
is drawn rather than what is on sale in it. That it is load-bearing is checked in a room where
the best Group at a party of three does cross one, because in the 42 captured seat maps a party
of two never does and a suite that only asked about pairs could not tell a carried count from a
zero.

**Everything else fails closed.** A Group whose Seats have gone answers `taken`, and so does a
Showtime the listing no longer offers and an Auditorium the Source refuses as sold out, begun,
or general admission. Only a Source that could not be reached, in the listing or in the
Auditorium, answers `unreachable`. Two reasons is the whole set, and neither carries a URL, so
an answer that cannot judge cannot hand off.

**A Group that has gone is answered with the Auditorium's other Seat Groups, ranked.** Not one
of them, which is the search's rule and is right there, because adjacent Groups in one room
differ by a Seat and by less than the model can resolve while adjacent Groups in different rooms
do not. Here they are the alternatives to one Group in one room, which is exactly what a search
declines to flatten into its list. They are built and ordered by the same two functions the
search uses, so no second notion of "better" exists to drift from the first.

**A Showtime the listing could not identify has no result to verify.** No result is built for
one, so for as long as a verification reads the same cached listing the search did, there is
nothing of the right type to hand over. A verification that outlives that cache entry can meet a
fresh listing that has since lost the identity, and it answers `taken` with no alternative:
there is nothing to ask a seat map with, and an answer it cannot judge must not offer a way to
buy. What that costs is the operator's-own-page remedy the Coverage entry would have offered,
which is the price of having two ways to answer no; a fresh search restores it.

## Consequences

No payment card compliance scope. No credential store. No fraud system to contend with.

The user taps once more, in the operator's application or site, to complete a purchase.

Because the hand off URL is supplied rather than derived, changes to the operator's URL
scheme do not break the application. An earlier prototype constructed this URL by hand,
including a hard coded parameter of unknown meaning; that approach is why the prohibition
is explicit.

The domain model must carry enough identity on a showtime and a seat to reconstruct the
hand off, which constrains what adapters are allowed to discard.

Selected seats are not held during hand off. A seat can be taken between being shown and
being bought, so results carry a fetch time and are re-verified before a hand off is
offered.

**An unverified hand-off does not compile, and that is what carries this decision rather
than a comment.** `TicketingUrl` is branded, and the only declaration of that brand is the
field of the aggregator's own response the parser reads. A `string` is not one, nothing mints
one, and a search result's Showtime is the Showtime type without its ticketing field, built
field by field so the URL is absent at run time rather than merely erased from the type. So
the only value of that type a caller can reach *from a result* is the one a successful
verification returns.

A Catalogue still carries Showtimes and a Showtime still carries its URL, which is deliberate
rather than an oversight: the remedy for a Showtime nobody can check is the operator's own
page, and the named Coverage outcomes depend on it. What has no path to one is a result.

What is left of the guarantee is what
[ADR 8](0008-guarantees-are-made-at-compile-time.md) records of every brand: a reviewed line
in a diff, and nothing an ordinary code path reaches.
