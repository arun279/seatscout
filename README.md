# seatscout

Find the seat you actually want, across every cinema chain near you, in one search.

Most ticketing apps make you pick a chain, then a theater, then a screening, and only
then show you a seating chart. If you care about *where you sit*, that is the wrong order:
you end up opening four apps and checking twenty screenings to find one good pair of seats.

seatscout inverts it. Describe what you want, including where in the room you want to be,
and it returns specific seats at specific screenings, ranked, across every nearby chain at
once.

> "Insidious in Dolby, Friday or Saturday evening, two seats together, good middle, within
> fifteen miles."

## Status

Early development. Not yet usable.

## On your phone

The app runs on a phone through [Expo Go](https://expo.dev/go). It opens a published update
rather than a development server, so it needs nothing running anywhere and works wherever the
phone has a network. Every merge to `main` that changes the app, or a package it bundles,
publishes to the `preview` channel, and the phone opens whichever update is newest there.

Install Expo Go for Expo SDK 57 and sign in to it with the Expo account that owns the project.
Expo's note on SDK 57 says Expo Go asks to be signed in before it opens a project, and being
signed in is also what lists the project on Expo Go's Home tab, so the QR code stops being the
only way in.

Then scan this, with Expo Go on Android and with the camera on the iPhone:

<https://qr.expo.dev/eas-update?projectId=bd0a1be7-8d02-4cd8-9a1b-d0431c52d495&runtimeVersion=exposdk:57.0.0&channel=preview>

Or paste the address itself into Expo Go:

```text
exp://u.expo.dev/bd0a1be7-8d02-4cd8-9a1b-d0431c52d495?channel-name=preview&runtime-version=exposdk:57.0.0
```

Neither of those changes when an update is published, so they are worth keeping. Each run of
the publish also prints them in its own summary.

## What makes it different

**Results are seats, not screenings.** A screening with nothing but front-row singles left
is not a result, however well it matches on film, time, and location.

**"Good seats" has an engineering definition.** The default seat profile is anchored where
SMPTE ST 202 places the reference microphone and where THX-certified auditoriums are
calibrated, so it is as near as a seat map can put you to the seat the mix was balanced for.
[CONTEXT.md](CONTEXT.md) defines what it targets and what it charges for, and every part of it
is adjustable.

**Auditoriums are compared on equal terms.** Seat positions are normalised to a depth from
0.0 at the front row to 1.0 at the back, and a lateral from -1.0 to +1.0 across. "Middle"
means the same thing in a 300-seat premium house and a 40-seat dine-in room, and it is
derived from real seat geometry rather than from row letters, which are not reliably
ordered and are sometimes not letters at all.

**Partial results say so.** Upstream requests fail sometimes. A search that could not check
every candidate screening reports its coverage, because a short list that looks complete is
indistinguishable from an empty room.

**Nothing about you is stored on a server.** Preferences and history live on your device.
The hosted component is a stateless proxy that exists only because browsers cannot call the
upstream source directly. Native clients do not use it at all.

## Booking

seatscout finds seats and hands off to the operator's own checkout with the screening
selected. It does not process payments and never stores card details. See
[ADR 4](docs/adr/0004-booking-ends-at-a-deep-link.md).

## Self-hosting

The deployment holds no user data, and the only values it needs are the credentials that
let your own hosting account be deployed to. Running your own instance means that account
and nothing else; there is no login to set up. [deploy/README.md](deploy/README.md) is the
runbook, `deploy/setup.sh` walks it, and `deploy/verify.sh` checks the result.

## Documentation

- [CONTEXT.md](CONTEXT.md) is the domain vocabulary. Code and tests use these words and no
  synonyms. Read it before changing anything.
- [docs/adr](docs/adr) records the decisions that are hard to reverse and would otherwise
  look arbitrary.

## Licence

MIT. See [LICENSE](LICENSE).
