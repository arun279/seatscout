import type { SeatProfile } from "@seatscout/client";
import { useState } from "react";
import { modal } from "./modal.js";
import { Profile } from "./profile.js";
import { type Terms, termsOf } from "./terms.js";
import type { Term } from "./title-card-terms.js";

interface AskProps {
  readonly terms: Terms;
  readonly profile: SeatProfile;
  readonly focus: Term;
  readonly onClose: () => void;
  readonly onFind: (terms: Terms, profile: SeatProfile) => void;
}

export const Ask = ({ terms, focus, onClose, onFind, ...held }: AskProps) => {
  const [movie, setMovie] = useState(terms.movie ?? "");
  const [date, setDate] = useState(terms.date);
  const [area, setArea] = useState(terms.area ?? "");
  const [partySize, setPartySize] = useState(terms.partySize);
  const [profile, setProfile] = useState(held.profile);

  return (
    <dialog
      ref={modal}
      className="ask"
      data-focus={focus}
      aria-labelledby="ask-title"
      onClose={onClose}
    >
      <form method="dialog">
        <button type="submit" className="back">
          ‹ Keep as it was
        </button>
      </form>
      <form
        method="dialog"
        onSubmit={() =>
          onFind(termsOf({ movie, date, area, partySize }, terms.date), profile)
        }
      >
        <h2 id="ask-title" className="display">
          What are we seeing?
        </h2>
        <label className="field">
          <span className="eyebrow">Movie number</span>
          <input
            className="input"
            data-term="movie"
            value={movie}
            onChange={(event) => setMovie(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="eyebrow">Date</span>
          <input
            className="input"
            type="date"
            data-term="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="eyebrow">Near, by postal code</span>
          <input
            className="input"
            data-term="area"
            value={area}
            onChange={(event) => setArea(event.target.value)}
          />
        </label>
        <fieldset className="field stepper">
          <legend className="eyebrow">Party</legend>
          <button
            type="button"
            className="pm"
            aria-label="Fewer seats"
            disabled={partySize <= 1}
            onClick={() => setPartySize(partySize - 1)}
          >
            −
          </button>
          <span className="n">{partySize}</span>
          <button
            type="button"
            className="pm"
            aria-label="More seats"
            data-term="partySize"
            onClick={() => setPartySize(partySize + 1)}
          >
            +
          </button>
        </fieldset>
        <Profile profile={profile} onChange={setProfile} />
        <p className="micro">
          Every control holds what it already had, so closing this is a search
          too.
        </p>
        <button type="submit" className="btn btn-velvet">
          Find seats
        </button>
        <p className="micro centred">
          Preferences and history stay on this phone. No account exists.
        </p>
      </form>
    </dialog>
  );
};
