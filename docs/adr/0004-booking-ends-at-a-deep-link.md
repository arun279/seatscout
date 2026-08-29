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
