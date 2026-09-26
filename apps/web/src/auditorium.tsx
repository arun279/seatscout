import "./house.css";
import "./auditorium.css";
import "./seat-map.css";
import type { Search, SeatGroupResult } from "@seatscout/client";
import type { ReactElement } from "react";
import { useState } from "react";
import {
  BACK_TO_THE_LIST,
  backToOf,
  capitalised,
  chosenOf,
  CLEAR_OF_THE_FRONT,
  clockOf,
  consolesIn,
  type Cursor,
  dayOf,
  groupHolding,
  groupsOf,
  heldWhileOfflineOf,
  labelOf,
  lateralOf,
  legendOf,
  type Mark,
  notBookableIn,
  opened,
  partyOf,
  penaltiesOf,
  type Place,
  RE_CHECKED_ON_THE_TAP,
  readingOf,
  refusalOf,
  shownIn,
  UNCONFIRMED,
  WAITS_FOR_THE_CONNECTION,
  whyOf,
  YOUR_SEATS_IN_THIS_ROOM,
} from "@seatscout/view-logic";
import { modal } from "./modal.js";
import { RowBar } from "./row-bar.js";
import { SeatMap } from "./seat-map.js";

interface RoomProps {
  readonly result: SeatGroupResult;
  readonly search: Search;
  readonly today: string;
  readonly now: number;
  readonly online: boolean;
  readonly onClose: () => void;
  readonly onHandOff: (chosen: SeatGroupResult) => void;
}

const MARKS: Readonly<Record<Mark, string>> = {
  lit: "lit",
  forSale: "for-sale",
  notBookable: "not-bookable",
  space: "space",
  console: "tick",
};

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
        <span className="credit">{CLEAR_OF_THE_FRONT}</span>
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
    {legendOf(chosen, accessibleSeating, consoles).map((entry) => (
      <li key={entry.mark}>
        <i className={MARKS[entry.mark]} />
        {entry.words}
      </li>
    ))}
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
}: RoomProps): ReactElement => {
  const [auditorium] = useState(() => search.auditorium(result));
  const [cursor, holdCursor] = useState<Cursor>(() => opened(auditorium));
  const [chosen, setChosen] = useState(result);
  const [notice, setNotice] = useState<string | null>(null);
  const { theater, formats, amenities } = result.showtime.presentation;
  const { partySize, accessibleSeating } = result.terms;
  const row = cursor.row;
  const listed = shownIn(auditorium, result, chosen);
  const consoles = consolesIn(auditorium.map);

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
    const group = groupHolding(auditorium, seat);
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
          ‹ {BACK_TO_THE_LIST}
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
        {backToOf(result)}
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
        <legend className="eyebrow">{YOUR_SEATS_IN_THIS_ROOM}</legend>
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
        <span>{notBookableIn(auditorium.map)}</span>
        {amenities.length > 0 && <span>{amenities.join(" · ")}</span>}
      </p>
      <p className="prov">
        <span>{readingOf(result.fetchedAt, now)}</span>
        <span className="unconfirmed">{UNCONFIRMED}</span>
      </p>
      <div className="dock">
        {online ? (
          <>
            <p className="micro">{RE_CHECKED_ON_THE_TAP}</p>
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
            <p className="held">{heldWhileOfflineOf(chosen)}</p>
            <p className="micro">{WAITS_FOR_THE_CONNECTION}</p>
          </>
        )}
      </div>
    </dialog>
  );
};
