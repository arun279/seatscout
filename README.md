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

SeatScout runs on a phone as its own app, built on Expo's servers from `apps/native`; nothing
is built on your machine. Each build follows the `preview` channel. Every merge to `main` that
changes the app, or anything under `packages/`, publishes an update there. An installed build
fetches the newest update when it opens and runs it from the next launch.

```sh
npx eas-cli@latest build --platform android --profile preview   # an APK to install from its link
npx eas-cli@latest build --platform ios --profile preview       # an iPhone build, for devices you register
npx eas-cli@latest build --platform ios --profile simulator     # an iOS Simulator build
```

The iPhone build needs an Apple developer account. The first run asks you to sign in to it and
to register each iPhone with `npx eas-cli@latest device:create`.

An update reaches only the builds that share its runtime version. Here that version is a
fingerprint of the app's native side, set by `"runtimeVersion": { "policy": "fingerprint" }` in
`apps/native/app.json`. A change that adds or updates a native module therefore needs a new
build, and no update made after it can reach an older build that lacks the module.

Expo Go is not the way to run it. Expo Go runs its own native code rather than this app's, and
the address of the updates moves each time the fingerprint does, so there is no fixed address
to keep.

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

**Nothing about you is stored on a server, because there is no server.** Preferences and
history live on your device, and the app reads the ticket site from the phone directly.

## Booking

seatscout finds seats and hands off to the operator's own checkout with the screening
selected. It does not process payments and never stores card details. See
[ADR 4](docs/adr/0004-booking-ends-at-a-deep-link.md).

## Documentation

- [CONTEXT.md](CONTEXT.md) is the domain vocabulary. Code and tests use these words and no
  synonyms. Read it before changing anything.
- [docs/adr](docs/adr) records the decisions that are hard to reverse and would otherwise
  look arbitrary.

## Licence

MIT. See [LICENSE](LICENSE).
