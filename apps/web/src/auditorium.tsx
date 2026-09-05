import type { Search, SeatGroupResult } from "@seatscout/client";
import { useMemo, useState } from "react";
import {
  chosenOf,
  groupsOf,
  refusalOf,
  rowTextOf,
} from "./auditorium-phrases.js";
import { seatsOf } from "./derived.js";
import { modal } from "./modal.js";
import {
  ageOf,
  capitalised,
  clockOf,
  dayOf,
  lateralOf,
  partyOf,
  penaltiesOf,
  whyOf,
} from "./phrases.js";
import { holds, SeatMap } from "./seat-map.js";
import { type Cursor, opened, type Place, rowAt, seatAt } from "./traversal.js";

interface AuditoriumProps {
  readonly result: SeatGroupResult;
  readonly search: Search;
  readonly today: string;
  readonly now: number;
  readonly onClose: () => void;
  readonly onHandOff: (candidate: SeatGroupResult) => unknown;
}

const ALTERNATES_SHOWN = 3;

const Billing = ({ result }: { readonly result: SeatGroupResult }) => {
  const penalties = penaltiesOf(result.reasons, result.podDividers);
  return (
    <div className="billing">
      <span className="headline">
        Row {result.reasons.rowFromFront} of {result.reasons.rowCount}
      </span>
      <span className="credit">
        {capitalised(lateralOf(result.reasons.seatsOffCentre))}
      </span>
      <span className="credit">
        {penalties.length === 0
          ? "Clear of the front rows and the walls"
          : capitalised(penalties.join(" · "))}
      </span>
    </div>
  );
};

const Legend = ({
  candidate,
  accessibleSeating,
  consoles,
}: {
  readonly candidate: SeatGroupResult;
  readonly accessibleSeating: boolean;
  readonly consoles: boolean;
}) => (
  <ul className="legend">
    <li>
      <i className="sw lit" />
      {seatsOf(candidate)}, yours
    </li>
    <li>
      <i className="sw bookable" />
      bookable
    </li>
    <li>
      <i className="sw unbookable" />
      not bookable
    </li>
    <li>
      <i className="sw space" />
      wheelchair or companion
      {accessibleSeating ? "" : ", kept out of ordinary results"}
    </li>
    {consoles && (
      <li>
        <i className="sw tick" />
        console
      </li>
    )}
  </ul>
);

export const Auditorium = ({
  result,
  search,
  today,
  now,
  onClose,
  onHandOff,
}: AuditoriumProps) => {
  const auditorium = useMemo(() => search.auditorium(result), [search, result]);
  const [cursor, holdCursor] = useState<Cursor>(() => opened(auditorium));
  const [candidate, setCandidate] = useState(result);
  const [notice, setNotice] = useState<string | null>(null);
  const { theater, formats, amenities } = result.showtime.presentation;
  const { partySize, accessibleSeating } = result.terms;
  const row = rowAt(auditorium.map, cursor.row);
  const alternates = auditorium.offered
    .filter((offered) => offered.key !== result.key)
    .slice(0, ALTERNATES_SHOWN);
  const listed = [result, ...alternates].some(
    (offered) => offered.key === candidate.key,
  )
    ? [result, ...alternates]
    : [result, ...alternates, candidate];
  const consoles = auditorium.map.rows.some((drawn) =>
    drawn.gapAfter.includes("pod"),
  );

  const setCursor = (next: Cursor) => {
    holdCursor(next);
    setNotice(null);
  };

  const refocus = () => setCursor({ ...cursor });

  const choose = (group: SeatGroupResult) => {
    setCandidate(group);
    setNotice(chosenOf(group));
  };

  const activate = (place: Place) => {
    const seat = seatAt(auditorium.map, place);
    const group = auditorium.offered.find((offered) => holds(offered, seat));
    if (group === undefined)
      setNotice(refusalOf(seat, partySize, accessibleSeating));
    else choose(group);
  };

  return (
    <dialog
      ref={modal}
      className="room"
      aria-labelledby="room-title"
      onClose={onClose}
    >
      <form method="dialog">
        <button type="submit" className="back">
          ‹ Back to the list
        </button>
      </form>
      <header className="room-head">
        <p className="eyebrow">
          {[
            partyOf(partySize),
            `${dayOf(result.terms.date, today)} ${clockOf(result.showtime.startsAt)}`,
            ...formats,
          ].join(" · ")}
        </p>
        <h2 id="room-title" className="display">
          {theater.name}
        </h2>
      </header>
      <button type="button" className="row-bar" onClick={refocus}>
        <span role="status">
          {notice ?? (
            <>
              {row.label !== null && <b>ROW {row.label}</b>}
              <span>{rowTextOf(row, auditorium.map)}</span>
            </>
          )}
        </span>
      </button>
      <button
        type="button"
        className="btn-return"
        onClick={() => setCursor(opened(auditorium))}
      >
        Back to {result.seats.map((seat) => seat.id).join(" ")}
      </button>
      <div className="map-frame">
        <div className="screen-edge" aria-hidden="true">
          <span className="lamp" />
          <span className="word">SCREEN</span>
        </div>
        <SeatMap
          auditorium={auditorium}
          result={result}
          candidate={candidate}
          cursor={cursor}
          accessibleSeating={accessibleSeating}
          onCursor={setCursor}
          onActivate={activate}
        />
      </div>
      <Legend
        candidate={candidate}
        accessibleSeating={accessibleSeating}
        consoles={consoles}
      />
      <Billing result={result} />
      <fieldset className="alternates">
        <legend className="eyebrow">Your seats in this room</legend>
        {listed.map((group) => (
          <label key={group.key} className="chip">
            <input
              type="radio"
              name="candidate"
              value={group.key}
              checked={group.key === candidate.key}
              onChange={() => choose(group)}
            />
            <span className="ids">{seatsOf(group)}</span>{" "}
            <span className="sub">
              {whyOf(group.reasons, group.podDividers)}
            </span>
          </label>
        ))}
        <p className="micro">
          {groupsOf(auditorium.offered.length, partySize)}
        </p>
      </fieldset>
      <p className="facts">
        <span>
          {auditorium.map.seatCount - auditorium.map.bookableCount} of{" "}
          {auditorium.map.seatCount} not bookable
        </span>
        {amenities.length > 0 && <span>{amenities.join(" · ")}</span>}
      </p>
      <p className="prov">
        <span>1 source · read {ageOf(result.fetchedAt, now)} ago</span>
        <span className="unconfirmed">Not confirmed by a second source</span>
      </p>
      <div className="dock">
        <p className="micro">
          Availability is re-checked the instant you tap. SeatScout never holds
          seats.
        </p>
        <button
          type="button"
          className="btn btn-velvet"
          onClick={() => onHandOff(candidate)}
        >
          Continue at {theater.chain ?? theater.name}
        </button>
      </div>
    </dialog>
  );
};
