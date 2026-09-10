import type { Search, SeatGroupResult } from "@seatscout/client";
import { useState } from "react";
import { chosenOf, groupsOf, refusalOf } from "./auditorium-phrases.js";
import { modal } from "./modal.js";
import {
  ageOf,
  capitalised,
  clockOf,
  dayOf,
  labelOf,
  lateralOf,
  partyOf,
  penaltiesOf,
  spokenOf,
  whyOf,
} from "./phrases.js";
import { RowBar } from "./row-bar.js";
import { holds, SeatMap } from "./seat-map.js";
import { type Cursor, opened, type Place } from "./traversal.js";

interface RoomProps {
  readonly result: SeatGroupResult;
  readonly search: Search;
  readonly today: string;
  readonly now: number;
  readonly online: boolean;
  readonly onClose: () => void;
  readonly onHandOff: (chosen: SeatGroupResult) => void;
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
      {penalties.length === 0 ? (
        <span className="credit">Clear of the front rows and the walls</span>
      ) : (
        penalties.map((penalty) => (
          <span key={penalty} className="credit">
            {capitalised(penalty)}
          </span>
        ))
      )}
    </div>
  );
};

const Legend = ({
  chosen,
  accessibleSeating,
  consoles,
}: {
  readonly chosen: SeatGroupResult;
  readonly accessibleSeating: boolean;
  readonly consoles: boolean;
}) => (
  <ul className="legend">
    <li>
      <i className="lit" />
      {labelOf(chosen)}, yours
    </li>
    <li>
      <i className="for-sale" />
      for sale
    </li>
    <li>
      <i className="not-bookable" />
      not bookable
    </li>
    <li>
      <i className="space" />
      wheelchair or companion
      {accessibleSeating ? "" : ", kept out of ordinary results"}
    </li>
    {consoles && (
      <li>
        <i className="tick" />
        console
      </li>
    )}
  </ul>
);

export const Room = ({
  result,
  search,
  today,
  now,
  online,
  onClose,
  onHandOff,
}: RoomProps) => {
  const [auditorium] = useState(() => search.auditorium(result));
  const [cursor, holdCursor] = useState<Cursor>(() => opened(auditorium));
  const [chosen, setChosen] = useState(result);
  const [notice, setNotice] = useState<string | null>(null);
  const { theater, formats, amenities } = result.showtime.presentation;
  const { partySize, accessibleSeating } = result.terms;
  const row = cursor.row;
  const alternates = auditorium.offered
    .filter((offered) => offered.key !== result.key)
    .slice(0, ALTERNATES_SHOWN);
  const shown = [result, ...alternates];
  const listed = shown.some((offered) => offered.key === chosen.key)
    ? shown
    : [...shown, chosen];
  const consoles = auditorium.map.rows.some((drawn) =>
    drawn.gapAfter.includes("pod"),
  );

  const setCursor = (next: Cursor) => {
    holdCursor(next);
    setNotice(null);
  };

  const refocus = () => setCursor({ ...cursor });

  const choose = (group: SeatGroupResult) => {
    setChosen(group);
    setNotice(chosenOf(group));
  };

  const activate = (place: Place) => {
    const seat = place.seat;
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
      <RowBar
        row={row}
        map={auditorium.map}
        notice={notice}
        onPress={refocus}
      />
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
          chosen={chosen}
          cursor={cursor}
          accessibleSeating={accessibleSeating}
          onCursor={setCursor}
          onActivate={activate}
        />
      </div>
      <Legend
        chosen={chosen}
        accessibleSeating={accessibleSeating}
        consoles={consoles}
      />
      <Billing result={chosen} />
      <fieldset className="alternates">
        <legend className="eyebrow">Your seats in this room</legend>
        {listed.map((group) => (
          <label key={group.key} className="chip">
            <input
              type="radio"
              name="chosen"
              value={group.key}
              checked={group.key === chosen.key}
              onChange={() => choose(group)}
            />
            <span className="ids">{labelOf(group)}</span>{" "}
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
        {online ? (
          <>
            <p className="micro">
              Availability is re-checked the instant you tap. SeatScout never
              holds seats.
            </p>
            <button
              type="button"
              className="btn btn-velvet"
              onClick={() => onHandOff(chosen)}
            >
              {labelOf(chosen)}
            </button>
          </>
        ) : (
          <>
            <p className="held">
              {spokenOf(chosen)} are here while you are offline.
            </p>
            <p className="micro">
              Continuing re-checks them with the Source, so it waits for the
              connection.
            </p>
          </>
        )}
      </div>
    </dialog>
  );
};
