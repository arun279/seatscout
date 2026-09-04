import { EVERY_AMENITY, EVERY_CHAIN, EVERY_FORMAT } from "@seatscout/client";
import { useState, useSyncExternalStore } from "react";
import { Chips, TheaterChips } from "./ask-chips.js";
import { Film } from "./ask-film.js";
import { modal } from "./modal.js";
import { type HeldProgramme, movieOf, titleOf } from "./programme.js";
import { type Terms, termsOf } from "./terms.js";
import type { Term } from "./title-card.js";

interface AskProps {
  readonly terms: Terms;
  readonly programme: HeldProgramme;
  readonly onProgramme: (
    area: string | undefined,
    date: string,
  ) => HeldProgramme;
  readonly focus: Term;
  readonly onClose: () => void;
  readonly onFind: (terms: Terms) => void;
}

interface Patch {
  readonly draft: Terms;
  readonly patch: (change: Partial<Terms>) => void;
}

const areaOf = (draft: Terms) => draft.area?.trim() || undefined;

const When = ({ draft, patch }: Patch) => (
  <div className="when">
    <label className="field">
      <span className="eyebrow">Date</span>
      <input
        className="input"
        type="date"
        data-term="date"
        value={draft.date}
        onChange={(event) => patch({ date: event.target.value })}
      />
    </label>
    <label className="field">
      <span className="eyebrow">From</span>
      <input
        className="input"
        type="time"
        data-term="window"
        value={draft.from ?? ""}
        onChange={(event) => patch({ from: event.target.value })}
      />
    </label>
    <label className="field">
      <span className="eyebrow">Until</span>
      <input
        className="input"
        type="time"
        value={draft.until ?? ""}
        onChange={(event) => patch({ until: event.target.value })}
      />
    </label>
  </div>
);

const Party = ({ draft, patch }: Patch) => (
  <>
    <fieldset className="field stepper">
      <legend className="eyebrow">Party</legend>
      <button
        type="button"
        className="pm"
        aria-label="Fewer seats"
        disabled={draft.partySize <= 1}
        onClick={() => patch({ partySize: draft.partySize - 1 })}
      >
        −
      </button>
      <span className="n">{draft.partySize}</span>
      <button
        type="button"
        className="pm"
        aria-label="More seats"
        data-term="partySize"
        onClick={() => patch({ partySize: draft.partySize + 1 })}
      >
        +
      </button>
    </fieldset>
    <label className="switch">
      <input
        type="checkbox"
        data-term="accessibleSeating"
        checked={draft.accessibleSeating === true}
        onChange={(event) => patch({ accessibleSeating: event.target.checked })}
      />
      <span>Accessible seating</span>
    </label>
    <p className="micro">
      Wheelchair and companion seats stay out of ordinary results. Turning this
      on searches for them deliberately.
    </p>
  </>
);

export const Ask = ({
  terms,
  programme,
  onProgramme,
  focus,
  onClose,
  onFind,
}: AskProps) => {
  const [draft, setDraft] = useState(terms);
  const [held, setHeld] = useState(programme);
  const playing = useSyncExternalStore(held.subscribe, held.snapshot);
  const [film, setFilm] = useState(
    titleOf(playing.movies, terms.movie) ?? terms.movie ?? "",
  );
  const patch = (change: Partial<Terms>) => setDraft({ ...draft, ...change });
  const follow = () => {
    if (held.area !== areaOf(draft) || held.date !== draft.date)
      setHeld(onProgramme(areaOf(draft), draft.date));
  };

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
          onFind(
            termsOf(
              { ...draft, movie: movieOf(film, playing.movies) },
              terms.date,
            ),
          )
        }
      >
        <h2 id="ask-title" className="display">
          What are we seeing?
        </h2>
        <label className="field">
          <span className="eyebrow">Near, by postal code</span>
          <input
            className="input"
            data-term="area"
            value={draft.area ?? ""}
            onChange={(event) => patch({ area: event.target.value })}
            onBlur={follow}
          />
        </label>
        <Film
          area={held.area}
          programme={playing}
          typed={film}
          onTyped={setFilm}
        />
        <When draft={draft} patch={patch} />
        <Party draft={draft} patch={patch} />
        <Chips
          term="formats"
          legend="Format"
          every={EVERY_FORMAT}
          chosen={draft.formats}
          onChosen={(formats) => patch({ formats })}
        />
        <Chips
          term="amenities"
          legend="Comfort"
          every={EVERY_AMENITY}
          chosen={draft.amenities}
          onChosen={(amenities) => patch({ amenities })}
        />
        <Chips
          term="chains"
          legend="Chain"
          every={EVERY_CHAIN}
          chosen={draft.chains}
          onChosen={(chains) => patch({ chains })}
        />
        <TheaterChips
          theaters={playing.theaters}
          chosen={draft.theaters}
          onChosen={(theaters) => patch({ theaters })}
        />
        <p className="micro">
          Every control holds what it already had, so closing this is a search
          too.
        </p>
        <div className="cta">
          <button type="submit" className="btn btn-velvet">
            Find seats
          </button>
        </div>
      </form>
    </dialog>
  );
};
